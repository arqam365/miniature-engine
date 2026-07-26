import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const { instituteId } = requireTenantContext();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const instFilter = instituteId ? { instituteId } : {};

    const [totalStudents, todayPresent, todayAbsent, todayFeeCollection, pendingFees] =
      await Promise.all([
        this.prisma.student.count({ where: { ...instFilter, isActive: true } }),
        this.prisma.attendanceRecord.count({ where: { ...instFilter, date: today, status: 'PRESENT' } }),
        this.prisma.attendanceRecord.count({ where: { ...instFilter, date: today, status: 'ABSENT' } }),
        this.prisma.feePayment.aggregate({
          where: { ...instFilter, status: 'PAID', paidAt: { gte: today, lte: todayEnd } },
          _sum: { totalAmount: true },
        }),
        this.prisma.feePayment.aggregate({
          where: { ...instFilter, status: { in: ['PENDING', 'OVERDUE'] } },
          _sum: { totalAmount: true },
        }),
      ]);

    const attendanceToday =
      todayPresent + todayAbsent > 0
        ? Math.round((todayPresent / (todayPresent + todayAbsent)) * 100)
        : 0;

    return {
      totalStudents,
      attendanceToday,
      feeCollectedToday: Number(todayFeeCollection._sum.totalAmount ?? 0),
      pendingFees: Number(pendingFees._sum.totalAmount ?? 0),
    };
  }

  async getAttendanceTrend() {
    const { instituteId } = requireTenantContext();
    const instFilter = instituteId ? { instituteId } : {};

    const days = 30;
    const results: { date: string; percentage: number }[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);

      const [present, absent] = await Promise.all([
        this.prisma.attendanceRecord.count({ where: { ...instFilter, date: d, status: 'PRESENT' } }),
        this.prisma.attendanceRecord.count({ where: { ...instFilter, date: d, status: 'ABSENT' } }),
      ]);

      const total = present + absent;
      results.push({
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        percentage: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }

    return results;
  }

  async getFeeCollection() {
    const { instituteId } = requireTenantContext();
    const instFilter = instituteId ? { instituteId } : {};

    const months = 6;
    const results: { month: string; amount: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setMonth(dEnd.getMonth() + 1);
      dEnd.setDate(0);
      dEnd.setHours(23, 59, 59, 999);

      const agg = await this.prisma.feePayment.aggregate({
        where: { ...instFilter, status: 'PAID', paidAt: { gte: d, lte: dEnd } },
        _sum: { totalAmount: true },
      });

      results.push({
        month: d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        amount: Number(agg._sum.totalAmount ?? 0),
      });
    }

    return results;
  }

  async getRecentActivity() {
    const { instituteId } = requireTenantContext();
    const instFilter = instituteId ? { instituteId } : {};

    const [students, payments] = await Promise.all([
      this.prisma.student.findMany({
        where: { ...instFilter, isActive: true },
        orderBy: { admittedAt: 'desc' },
        take: 5,
        include: {
          enrollments: { where: { isActive: true }, include: { class: true }, take: 1 },
        },
      }),
      this.prisma.feePayment.findMany({
        where: { ...instFilter, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: { student: { select: { firstName: true, lastName: true } } },
      }),
    ]);

    return {
      recentStudents: students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        class: s.enrollments[0]?.class?.name ?? '—',
        admittedAt: s.admittedAt,
      })),
      recentPayments: payments.map((p) => ({
        id: p.id,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        amount: Number(p.totalAmount),
        paidAt: p.paidAt,
      })),
    };
  }
}
