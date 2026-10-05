import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { NotificationType, NotificationStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { AttendanceGateway } from '../realtime/attendance.gateway';
import { RevengageWhatsappService, AbsenceAlertRecipient } from '../whatsapp/revengage-whatsapp.service';
import * as dayjs from 'dayjs';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceGateway: AttendanceGateway,
    private readonly whatsappService: RevengageWhatsappService,
  ) {}

  async markBulk(dto: MarkAttendanceDto) {
    const { instituteId, organizationId, userId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const date = new Date(dto.date);

    const subjectId = dto.subjectId ?? null;

    // Prisma's compound-unique `where` (studentId_date_subjectId) rejects `null` at runtime even
    // though a cast makes it compile — Postgres doesn't treat NULL as a matchable unique-key value.
    // Daily/homeroom attendance (the common case) has no subjectId, so upsert() can't be used
    // directly here. find-then-create-or-update inside an interactive transaction instead, which
    // allows a plain (nullable) filter rather than the compound-unique identifier.
    const results = await this.prisma.$transaction(async (tx) => {
      const rows: Awaited<ReturnType<typeof tx.attendanceRecord.create>>[] = [];
      for (const r of dto.records) {
        const existing = await tx.attendanceRecord.findFirst({
          where: { studentId: r.studentId, date, subjectId },
        });
        const row = existing
          ? await tx.attendanceRecord.update({
              where: { id: existing.id },
              data: { status: r.status, remarks: r.remarks, markedById: userId },
            })
          : await tx.attendanceRecord.create({
              data: {
                studentId: r.studentId,
                instituteId,
                sectionId: dto.sectionId,
                subjectId,
                date,
                status: r.status,
                remarks: r.remarks,
                markedById: userId,
              },
            });
        rows.push(row);
      }
      return rows;
    });
    this.attendanceGateway.emitAttendanceUpdate(instituteId, { date: dto.date, sectionId: dto.sectionId, count: results.length });

    // Guardian WhatsApp alerts for newly-marked ABSENT students. Awaited (not fire-and-forget) so
    // a failure is logged and recorded before the request completes, but wrapped so a WhatsApp
    // outage never fails the attendance save itself — attendance is already committed above.
    try {
      await this.dispatchAbsenceAlerts(dto, organizationId);
    } catch (err) {
      this.logger.error('Absence alert dispatch failed', err as Error);
    }

    return { marked: results.length, date: dto.date };
  }

  private async dispatchAbsenceAlerts(dto: MarkAttendanceDto, organizationId: string): Promise<void> {
    const absentIds = dto.records.filter((r) => r.status === 'ABSENT').map((r) => r.studentId);
    if (absentIds.length === 0) return;

    // Org-level settings take priority; env vars are the fallback for self-hosted installs.
    const orgSettings = await this.prisma.orgSettings.findUnique({ where: { organizationId } });
    const waConfig = orgSettings?.whatsappApiKey
      ? {
          provider: (orgSettings.whatsappProvider ?? 'revengage') as 'revengage' | 'generic',
          apiKey: orgSettings.whatsappApiKey,
          apiUrl: orgSettings.whatsappApiUrl ?? 'https://platform.revengage.in',
          templateId: orgSettings.whatsappTemplateId ?? undefined,
          messageTemplate: orgSettings.whatsappMessageTemplate ?? undefined,
        }
      : this.whatsappService.buildFallbackConfig();

    if (!waConfig) {
      this.logger.warn('WhatsApp not configured — skipping absence alerts');
      return;
    }

    const links = await this.prisma.studentGuardian.findMany({
      where: { studentId: { in: absentIds } },
      orderBy: { isPrimary: 'desc' }, // primary guardian sorts first per student
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        guardian: { select: { firstName: true, lastName: true, phone: true, whatsappNumber: true } },
      },
    });

    // One guardian per student: primary if one exists, else whichever is first.
    const chosen = new Map<string, (typeof links)[number]>();
    for (const link of links) {
      if (!chosen.has(link.studentId)) chosen.set(link.studentId, link);
    }

    const dateLabel = dayjs(dto.date).format('DD MMM YYYY');
    const recipients: AbsenceAlertRecipient[] = [];
    const skipped: string[] = [];

    for (const studentId of absentIds) {
      const link = chosen.get(studentId);
      const phone = link?.guardian.whatsappNumber || link?.guardian.phone;
      if (!link || !phone) {
        skipped.push(studentId);
        continue;
      }
      recipients.push({
        phone,
        guardianName: `${link.guardian.firstName} ${link.guardian.lastName}`.trim(),
        studentName: `${link.student.firstName} ${link.student.lastName ?? ''}`.trim(),
        admissionNo: link.student.admissionNo,
        date: dateLabel,
      });
    }

    if (skipped.length) {
      this.logger.warn(`Absence alert skipped — no guardian/phone on file for students: ${skipped.join(', ')}`);
    }
    if (recipients.length === 0) return;

    const results = await this.whatsappService.sendAbsenceAlerts(recipients, waConfig);

    await this.prisma.notification.createMany({
      data: results.map((r) => ({
        organizationId,
        type: NotificationType.WHATSAPP,
        recipient: r.phone,
        body: `Attendance ABSENT alert for ${dateLabel}`,
        status: r.status === 'sent' ? NotificationStatus.SENT : NotificationStatus.FAILED,
        sentAt: r.status === 'sent' ? new Date() : null,
        errorMessage: r.error,
      })),
    });
  }

  async getSectionAttendance(sectionId: string, date: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.attendanceRecord.findMany({
      where: { sectionId, instituteId, date: new Date(date), subjectId: null },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
    });
  }

  async getMonthlyReport(sectionId: string, month: number, year: number) {
    const { instituteId } = requireTenantContext();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { sectionId, instituteId, subjectId: null, date: { gte: start, lte: end } },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
      orderBy: [{ date: 'asc' }, { student: { admissionNo: 'asc' } }],
    });

    const studentMap = new Map<string, any>();
    for (const r of records) {
      const key = r.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, { student: r.student, days: {} });
      }
      const dayKey = r.date.getDate().toString();
      studentMap.get(key).days[dayKey] = r.status;
    }

    return Array.from(studentMap.values());
  }

  async getDailySummary(date: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { instituteId, date: new Date(date) },
      _count: { status: true },
    });
  }

  async getAbsentees(date: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.attendanceRecord.findMany({
      where: { instituteId, date: new Date(date), status: 'ABSENT' },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true } },
      },
    });
  }

  async getAttendanceReport(sectionId: string, from: string, to: string) {
    const { instituteId } = requireTenantContext();
    const start = new Date(from);
    const end = new Date(to);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { instituteId, sectionId, subjectId: null, date: { gte: start, lte: end } },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
    });

    const studentMap = new Map<string, { student: any; total: number; present: number; absent: number; late: number; excused: number }>();

    for (const r of records) {
      const key = r.studentId;
      if (!studentMap.has(key)) {
        studentMap.set(key, { student: r.student, total: 0, present: 0, absent: 0, late: 0, excused: 0 });
      }
      const entry = studentMap.get(key)!;
      entry.total++;
      if (r.status === 'PRESENT') entry.present++;
      else if (r.status === 'ABSENT') entry.absent++;
      else if (r.status === 'LATE') entry.late++;
      else if (r.status === 'EXCUSED') entry.excused++;
    }

    return Array.from(studentMap.values()).map((e) => ({
      student: e.student,
      total: e.total,
      present: e.present,
      absent: e.absent,
      late: e.late,
      excused: e.excused,
      percentage: e.total > 0 ? Math.round((e.present / e.total) * 100) : 0,
    })).sort((a, b) => b.percentage - a.percentage);
  }
}
