import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats() {
    const { instituteId, organizationId } = requireTenantContext();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const filter = instituteId ? { instituteId } : { student: { organizationId } };
    const instFilter = instituteId ? { instituteId } : {};

    const [
      totalStudents,
      todayPresent,
      todayAbsent,
      todayFeeCollection,
      pendingFees,
      activeExams,
    ] = await Promise.all([
      this.prisma.student.count({ where: { ...(instituteId ? { instituteId } : {}), isActive: true } }),
      this.prisma.attendanceRecord.count({ where: { ...instFilter, date: today, status: 'PRESENT' } }),
      this.prisma.attendanceRecord.count({ where: { ...instFilter, date: today, status: 'ABSENT' } }),
      this.prisma.feePayment.aggregate({
        where: { ...instFilter, status: 'PAID', paidAt: { gte: today, lte: todayEnd } },
        _sum: { totalAmount: true },
      }),
      this.prisma.feePayment.aggregate({
        where: { ...instFilter, status: { in: ['PENDING', 'OVERDUE'] } },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.exam.count({ where: { ...instFilter, status: { in: ['PUBLISHED', 'ONGOING'] } } }),
    ]);

    const attendanceRate =
      todayPresent + todayAbsent > 0
        ? ((todayPresent / (todayPresent + todayAbsent)) * 100).toFixed(1)
        : '0';

    return {
      totalStudents,
      attendance: {
        present: todayPresent,
        absent: todayAbsent,
        rate: attendanceRate + '%',
      },
      fees: {
        todayCollection: todayFeeCollection._sum.totalAmount ?? 0,
        pendingAmount: pendingFees._sum.totalAmount ?? 0,
        pendingCount: pendingFees._count.id,
      },
      activeExams,
    };
  }

  async getRecentActivity() {
    const { instituteId } = requireTenantContext();
    const instFilter = instituteId ? { instituteId } : {};

    const [recentStudents, recentPayments] = await Promise.all([
      this.prisma.student.findMany({
        where: { ...instFilter, isActive: true },
        orderBy: { admittedAt: 'desc' },
        take: 5,
        select: { id: true, firstName: true, lastName: true, admissionNo: true, admittedAt: true },
      }),
      this.prisma.feePayment.findMany({
        where: { ...instFilter, status: 'PAID' },
        orderBy: { paidAt: 'desc' },
        take: 5,
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      }),
    ]);

    return { recentStudents, recentPayments };
  }
}
