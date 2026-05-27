import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { AttendanceGateway } from '../realtime/attendance.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceGateway: AttendanceGateway,
  ) {}

  async markBulk(dto: MarkAttendanceDto) {
    const { instituteId, userId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const date = new Date(dto.date);

    const operations = dto.records.map((r) =>
      this.prisma.attendanceRecord.upsert({
        where: {
          studentId_date_subjectId: {
            studentId: r.studentId,
            date,
            subjectId: dto.subjectId ?? '',
          },
        },
        update: { status: r.status, remarks: r.remarks, markedById: userId },
        create: {
          studentId: r.studentId,
          instituteId,
          sectionId: dto.sectionId,
          subjectId: dto.subjectId,
          date,
          status: r.status,
          remarks: r.remarks,
          markedById: userId,
        },
      }),
    );

    const results = await this.prisma.$transaction(operations);
    this.attendanceGateway.emitAttendanceUpdate(instituteId, { date: dto.date, sectionId: dto.sectionId, count: results.length });
    return { marked: results.length, date: dto.date };
  }

  async getSectionAttendance(sectionId: string, date: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.attendanceRecord.findMany({
      where: { sectionId, instituteId, date: new Date(date) },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
    });
  }

  async getMonthlyReport(sectionId: string, month: number, year: number) {
    const { instituteId } = requireTenantContext();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.findMany({
      where: { sectionId, instituteId, date: { gte: start, lte: end } },
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
}
