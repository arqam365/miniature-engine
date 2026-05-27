import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeePaymentDto } from './dto/create-fee-payment.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { FeeStatus } from '@prisma/client';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async collectPayment(dto: CreateFeePaymentDto) {
    const { instituteId, userId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const receiptNo = await this.generateReceiptNo(instituteId);
    const discount = dto.discount ?? 0;
    const lateFee = dto.lateFee ?? 0;
    const totalAmount = dto.amount - discount + lateFee;

    return this.prisma.feePayment.create({
      data: {
        receiptNo,
        studentId: dto.studentId,
        feeStructureId: dto.feeStructureId,
        instituteId,
        amount: dto.amount,
        discount,
        lateFee,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        remarks: dto.remarks,
        status: FeeStatus.PAID,
        paidAt: new Date(),
        createdById: userId,
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        feeStructure: { select: { name: true } },
      },
    });
  }

  async getStudentFees(studentId: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.feePayment.findMany({
      where: { studentId, instituteId },
      orderBy: { createdAt: 'desc' },
      include: { feeStructure: { select: { name: true } } },
    });
  }

  async getDefaulters(academicYearId?: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.feePayment.findMany({
      where: {
        instituteId,
        status: { in: [FeeStatus.PENDING, FeeStatus.OVERDUE] },
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true } },
        feeStructure: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async getCollectionSummary(startDate: string, endDate: string) {
    const { instituteId } = requireTenantContext();
    const result = await this.prisma.feePayment.aggregate({
      where: {
        instituteId,
        status: FeeStatus.PAID,
        paidAt: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    return {
      totalCollected: result._sum.totalAmount ?? 0,
      totalTransactions: result._count.id,
    };
  }

  async getDashboardStats() {
    const { instituteId } = requireTenantContext();
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const [todayCollection, pendingFees, overdueCount] = await Promise.all([
      this.prisma.feePayment.aggregate({
        where: { instituteId, status: FeeStatus.PAID, paidAt: { gte: startOfDay, lte: endOfDay } },
        _sum: { totalAmount: true },
      }),
      this.prisma.feePayment.aggregate({
        where: { instituteId, status: FeeStatus.PENDING },
        _sum: { totalAmount: true },
        _count: { id: true },
      }),
      this.prisma.feePayment.count({
        where: { instituteId, status: FeeStatus.OVERDUE },
      }),
    ]);

    return {
      todayCollection: todayCollection._sum.totalAmount ?? 0,
      pendingAmount: pendingFees._sum.totalAmount ?? 0,
      pendingCount: pendingFees._count.id,
      overdueCount,
    };
  }

  private async generateReceiptNo(instituteId: string): Promise<string> {
    const count = await this.prisma.feePayment.count({ where: { instituteId } });
    const year = new Date().getFullYear();
    return `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
  }
}
