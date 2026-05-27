import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async studentStrength() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const [total, byClass] = await Promise.all([
      this.prisma.student.count({ where: { instituteId, isActive: true } }),
      this.prisma.enrollment.groupBy({
        by: ['classId'],
        where: { instituteId, isActive: true },
        _count: { studentId: true },
      }),
    ]);

    const classIds = byClass.map((r) => r.classId);
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: { id: true, name: true },
    });

    const classMap = Object.fromEntries(classes.map((c) => [c.id, c.name]));

    return {
      total,
      byClass: byClass
        .map((r) => ({ className: classMap[r.classId] ?? 'Unknown', count: r._count.studentId }))
        .sort((a, b) => b.count - a.count),
    };
  }

  async attendanceAnalytics(date: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const targetDate = dayjs(date).startOf('day').toDate();

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: { instituteId, date: targetDate },
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const r of records) counts[r.status] = r._count.id;

    const present = counts['PRESENT'] ?? 0;
    const absent = counts['ABSENT'] ?? 0;
    const late = counts['LATE'] ?? 0;
    const excused = counts['EXCUSED'] ?? 0;
    const total = present + absent + late + excused;
    const rate = total > 0 ? Math.round((present / total) * 100) : 0;

    return [{ date, present, absent, late, excused, total, rate }];
  }

  async feeDefaulters() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const payments = await this.prisma.feePayment.findMany({
      where: {
        instituteId,
        status: { in: ['PENDING', 'OVERDUE', 'PARTIAL'] },
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true, phone: true } },
        feeStructure: { select: { name: true } },
      },
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    });

    return payments.map((p) => ({
      ...p,
      totalAmount: Number(p.totalAmount),
      amount: Number(p.amount),
    }));
  }

  async examRanking(examId: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const results = await this.prisma.examResult.findMany({
      where: { exam: { id: examId, instituteId }, isPublished: true },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        marks: { include: { subject: { select: { name: true } } } },
      },
      orderBy: { totalMarks: 'desc' },
    });

    return results.map((r, i) => ({
      rank: i + 1,
      student: r.student,
      totalMarks: Number(r.totalMarks),
      grade: r.grade,
      isPassed: r.isPassed,
      marks: r.marks.map((m) => ({
        subject: m.subject.name,
        obtained: Number(m.marksObtained),
        max: Number(m.maxMarks),
      })),
    }));
  }
}
