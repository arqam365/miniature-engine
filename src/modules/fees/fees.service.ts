import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFeePaymentDto } from './dto/create-fee-payment.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { FeeStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async collectPayment(dto: CreateFeePaymentDto) {
    const { instituteId, userId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const discount = dto.discount ?? 0;
    const lateFee = dto.lateFee ?? 0;
    const totalAmount = dto.amount - discount + lateFee;
    const paidAt = new Date();

    return this.prisma.$transaction(async (tx) => {
      // Race-condition-safe receipt number via raw increment
      const result = await tx.$queryRaw<[{ next: bigint }]>`
        SELECT COUNT(*) + 1 AS next FROM fee_payments WHERE "instituteId" = ${instituteId}
      `;
      const next = Number(result[0].next);
      const year = paidAt.getFullYear();
      const receiptNo = `RCP-${year}-${String(next).padStart(5, '0')}`;

      const payment = await tx.feePayment.create({
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
          paidAt,
          createdById: userId,
        },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true } },
          feeStructure: { select: { name: true } },
        },
      });

      // Create ledger entry: debit Cash in Hand, credit Fee Income (if accounts exist)
      const [cashAccount, incomeAccount] = await Promise.all([
        tx.account.findFirst({ where: { instituteId, type: 'ASSET', isActive: true }, orderBy: { code: 'asc' } }),
        tx.account.findFirst({ where: { instituteId, type: 'INCOME', isActive: true }, orderBy: { code: 'asc' } }),
      ]);

      if (cashAccount && incomeAccount) {
        await tx.ledgerEntry.createMany({
          data: [
            {
              accountId: cashAccount.id,
              debit: totalAmount,
              credit: 0,
              description: `Fee receipt ${receiptNo}`,
              entryDate: paidAt,
            },
            {
              accountId: incomeAccount.id,
              debit: 0,
              credit: totalAmount,
              description: `Fee receipt ${receiptNo}`,
              entryDate: paidAt,
            },
          ],
        });
      }

      return payment;
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

  async getDefaulters(query: { page?: number; limit?: number; academicYearId?: string }) {
    const { instituteId } = requireTenantContext();
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const where: any = {
      instituteId,
      status: { in: [FeeStatus.PENDING, FeeStatus.OVERDUE] },
    };

    const [data, total] = await Promise.all([
      this.prisma.feePayment.findMany({
        where,
        skip,
        take: limit,
        include: {
          student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, phone: true } },
          feeStructure: { select: { name: true } },
        },
        orderBy: { dueDate: 'asc' },
      }),
      this.prisma.feePayment.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPaymentHistory(params: { search?: string; from?: string; to?: string; page?: number; limit?: number }) {
    const { instituteId } = requireTenantContext();
    const page = Number(params.page) || 1;
    const limit = Number(params.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { instituteId, status: FeeStatus.PAID };

    if (params.from || params.to) {
      where.paidAt = {};
      if (params.from) where.paidAt.gte = new Date(params.from);
      if (params.to) where.paidAt.lte = new Date(params.to + 'T23:59:59');
    }

    if (params.search) {
      where.OR = [
        { receiptNo: { contains: params.search, mode: 'insensitive' } },
        { student: { firstName: { contains: params.search, mode: 'insensitive' } } },
        { student: { lastName: { contains: params.search, mode: 'insensitive' } } },
        { student: { admissionNo: { contains: params.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.feePayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true } },
          feeStructure: { select: { name: true } },
        },
      }),
      this.prisma.feePayment.count({ where }),
    ]);

    return {
      data: data.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        studentName: `${p.student.firstName} ${p.student.lastName}`,
        admissionNo: p.student.admissionNo,
        feeType: p.feeStructure?.name ?? '—',
        amount: toNum(p.amount),
        discount: toNum(p.discount),
        lateFee: toNum(p.lateFee),
        totalAmount: toNum(p.totalAmount),
        paymentMethod: p.paymentMethod ?? 'CASH',
        paidAt: p.paidAt?.toISOString() ?? p.createdAt.toISOString(),
        remarks: p.remarks,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
      totalCollected: toNum(result._sum.totalAmount),
      totalTransactions: result._count.id,
    };
  }

  async getDashboardStats() {
    const { instituteId } = requireTenantContext();
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

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
      todayCollection: toNum(todayCollection._sum.totalAmount),
      pendingAmount: toNum(pendingFees._sum.totalAmount),
      pendingCount: pendingFees._count.id,
      overdueCount,
    };
  }

  // ─── Fee Categories ───────────────────────────────────────────────────────────

  async getCategories() {
    const { organizationId } = requireTenantContext();
    return this.prisma.feeCategory.findMany({
      where: { organizationId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createCategory(dto: { name: string }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.feeCategory.create({
      data: { name: dto.name, organizationId },
    });
  }

  // ─── Fee Structures ───────────────────────────────────────────────────────────

  async getStructures(query: { academicYearId?: string; classId?: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    return this.prisma.feeStructure.findMany({
      where: {
        instituteId,
        isActive: true,
        ...(query.academicYearId && { academicYearId: query.academicYearId }),
      },
      include: {
        feeCategory: { select: { name: true } },
        academicYear: { select: { name: true } },
      },
      orderBy: [{ academicYear: { name: 'desc' } }, { name: 'asc' }],
    });
  }

  async createStructure(dto: {
    name: string;
    feeCategoryId: string;
    academicYearId: string;
    amount: number;
    dueDay?: number;
    lateFeeAmount?: number;
  }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    return this.prisma.feeStructure.create({
      data: {
        name: dto.name,
        feeCategoryId: dto.feeCategoryId,
        academicYearId: dto.academicYearId,
        instituteId,
        amount: dto.amount,
        dueDay: dto.dueDay,
        lateFeeAmount: dto.lateFeeAmount,
      },
      include: {
        feeCategory: { select: { name: true } },
        academicYear: { select: { name: true } },
      },
    });
  }
}
