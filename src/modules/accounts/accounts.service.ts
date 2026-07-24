import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import dayjs from 'dayjs';
import { Decimal } from '@prisma/client/runtime/library';

function toNum(d: Decimal | number | null | undefined): number {
  if (d == null) return 0;
  return typeof d === 'number' ? d : Number(d);
}

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async chartOfAccounts() {
    const { instituteId } = requireTenantContext();
    return this.prisma.account.findMany({
      where: { instituteId, isActive: true },
      select: { id: true, name: true, code: true, type: true },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(dto: { name: string; code: string; type: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new NotFoundException('Institute context required');
    return this.prisma.account.create({
      data: { name: dto.name, code: dto.code, type: dto.type as any, instituteId },
      select: { id: true, name: true, code: true, type: true },
    });
  }

  async dayBook(date: string) {
    const { instituteId } = requireTenantContext();
    const targetDate = dayjs(date).startOf('day').toDate();
    const nextDate = dayjs(date).add(1, 'day').startOf('day').toDate();

    const entries = await this.prisma.ledgerEntry.findMany({
      where: {
        account: { instituteId },
        entryDate: { gte: targetDate, lt: nextDate },
      },
      include: {
        account: { select: { name: true } },
        voucher: { select: { voucherNo: true } },
        receipt: { select: { receiptNo: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return entries.map((e) => ({
      id: e.id,
      date: e.entryDate.toISOString(),
      description: e.description ?? '',
      voucherNo: e.voucher?.voucherNo ?? e.receipt?.receiptNo ?? '—',
      debit: toNum(e.debit),
      credit: toNum(e.credit),
      account: { name: e.account.name },
    }));
  }

  async ledger(accountId: string) {
    const { instituteId } = requireTenantContext();

    const account = await this.prisma.account.findFirst({
      where: { id: accountId, instituteId },
    });
    if (!account) throw new NotFoundException('Account not found');

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { accountId },
      include: {
        voucher: { select: { voucherNo: true } },
        receipt: { select: { receiptNo: true } },
      },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });

    let balance = 0;
    return entries.map((e) => {
      const debit = toNum(e.debit);
      const credit = toNum(e.credit);
      balance += debit - credit;
      return {
        id: e.id,
        date: e.entryDate.toISOString(),
        description: e.description ?? '',
        voucherNo: e.voucher?.voucherNo ?? e.receipt?.receiptNo ?? '—',
        debit,
        credit,
        balance,
      };
    });
  }

  async createVoucher(dto: CreateVoucherDto, userId: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new NotFoundException('Institute context required');

    const account = await this.prisma.account.findFirst({
      where: { id: dto.accountId, instituteId },
    });
    if (!account) throw new NotFoundException('Account not found');

    const voucherDate = dayjs(dto.date).startOf('day').toDate();

    const count = await this.prisma.voucher.count({ where: { instituteId } });
    const voucherNo = `VCH-${String(count + 1).padStart(5, '0')}`;

    return this.prisma.$transaction(async (tx) => {
      const voucher = await tx.voucher.create({
        data: {
          voucherNo,
          instituteId,
          type: 'JOURNAL',
          amount: dto.amount,
          description: dto.remarks ?? dto.description,
          voucherDate,
          createdById: userId,
        },
      });

      await tx.ledgerEntry.create({
        data: {
          accountId: dto.accountId,
          voucherId: voucher.id,
          debit: dto.type === 'DEBIT' ? dto.amount : 0,
          credit: dto.type === 'CREDIT' ? dto.amount : 0,
          description: dto.description,
          entryDate: voucherDate,
        },
      });

      return { id: voucher.id, voucherNo };
    });
  }

  async getVouchers(page = 1, limit = 20) {
    const { instituteId } = requireTenantContext();
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.voucher.findMany({
        where: { instituteId },
        orderBy: { voucherDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.voucher.count({ where: { instituteId } }),
    ]);

    return {
      data: data.map((v) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        type: v.type,
        amount: toNum(v.amount),
        description: v.description ?? '',
        date: v.voucherDate.toISOString(),
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCollection(from: string, to: string) {
    const { instituteId } = requireTenantContext();
    const start = dayjs(from).startOf('day').toDate();
    const end = dayjs(to).endOf('day').toDate();

    const payments = await this.prisma.feePayment.groupBy({
      by: ['paymentMethod'],
      where: {
        instituteId,
        status: 'PAID',
        paidAt: { gte: start, lte: end },
      },
      _count: { id: true },
      _sum: { totalAmount: true },
    });

    return payments.map((p) => ({
      mode: p.paymentMethod ?? 'CASH',
      count: p._count.id,
      amount: toNum(p._sum.totalAmount),
    }));
  }

  async getCashInHand() {
    const { instituteId } = requireTenantContext();

    const accounts = await this.prisma.account.findMany({
      where: { instituteId, isActive: true, type: 'ASSET' },
      include: {
        ledgerEntries: { select: { debit: true, credit: true } },
      },
    });

    return accounts.map((a) => {
      const receipts = a.ledgerEntries.reduce((s, e) => s + toNum(e.debit), 0);
      const payments = a.ledgerEntries.reduce((s, e) => s + toNum(e.credit), 0);
      return {
        id: a.id,
        name: a.name,
        openingBalance: 0,
        receipts,
        payments,
        closingBalance: receipts - payments,
      };
    });
  }

  async getTrialBalance(asOf: string) {
    const { instituteId } = requireTenantContext();
    const endDate = dayjs(asOf).endOf('day').toDate();

    const accounts = await this.prisma.account.findMany({
      where: { instituteId, isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { code: 'asc' },
    });

    const entries = await this.prisma.ledgerEntry.groupBy({
      by: ['accountId'],
      where: {
        account: { instituteId },
        entryDate: { lte: endDate },
      },
      _sum: { debit: true, credit: true },
    });

    const entryMap = new Map(entries.map((e) => [e.accountId, e]));

    return accounts
      .map((a) => {
        const e = entryMap.get(a.id);
        return {
          code: a.code,
          name: a.name,
          debit: toNum(e?._sum.debit),
          credit: toNum(e?._sum.credit),
        };
      })
      .filter((r) => r.debit > 0 || r.credit > 0);
  }

  async getReceipts(params: {
    search?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { instituteId } = requireTenantContext();
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { instituteId, status: 'PAID' };

    if (params.from || params.to) {
      where.paidAt = {};
      if (params.from) where.paidAt.gte = dayjs(params.from).startOf('day').toDate();
      if (params.to) where.paidAt.lte = dayjs(params.to).endOf('day').toDate();
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
        take: pageSize,
        orderBy: { paidAt: 'desc' },
        include: {
          student: { select: { firstName: true, lastName: true, admissionNo: true } },
          feeStructure: {
            select: { name: true, feeCategory: { select: { name: true } } },
          },
        },
      }),
      this.prisma.feePayment.count({ where }),
    ]);

    return {
      data: data.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        admissionNo: r.student.admissionNo,
        amount: toNum(r.totalAmount),
        paymentMode: r.paymentMethod ?? 'CASH',
        feeType: r.feeStructure?.feeCategory?.name ?? r.feeStructure?.name ?? '—',
        date: (r.paidAt ?? r.createdAt).toISOString(),
      })),
      total,
    };
  }

  async getVendors() {
    const { instituteId } = requireTenantContext();
    return this.prisma.vendor.findMany({
      where: { instituteId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, phone: true, email: true, address: true, balance: true },
    }).then((rows) => rows.map((v) => ({ ...v, balance: toNum(v.balance) })));
  }

  async createVendor(dto: { name: string; phone?: string; email?: string; address?: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new NotFoundException('Institute context required');
    return this.prisma.vendor.create({
      data: { name: dto.name, phone: dto.phone, email: dto.email, address: dto.address, instituteId },
      select: { id: true, name: true, phone: true, email: true, address: true, balance: true },
    });
  }

  async seedDefaultAccounts() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new NotFoundException('Institute context required');

    const existing = await this.prisma.account.count({ where: { instituteId } });
    if (existing > 0) return { seeded: false, message: 'Accounts already exist' };

    const defaults = [
      { code: '1000', name: 'Cash in Hand', type: 'ASSET' },
      { code: '1001', name: 'Bank Account', type: 'ASSET' },
      { code: '1100', name: 'Fees Receivable', type: 'ASSET' },
      { code: '2000', name: 'Accounts Payable', type: 'LIABILITY' },
      { code: '3000', name: 'Capital', type: 'EQUITY' },
      { code: '4000', name: 'Fee Income', type: 'INCOME' },
      { code: '4001', name: 'Other Income', type: 'INCOME' },
      { code: '5000', name: 'Salaries', type: 'EXPENSE' },
      { code: '5001', name: 'Utilities', type: 'EXPENSE' },
      { code: '5002', name: 'Miscellaneous Expense', type: 'EXPENSE' },
    ] as const;

    await this.prisma.account.createMany({
      data: defaults.map((a) => ({ ...a, instituteId })),
    });

    return { seeded: true, count: defaults.length };
  }
}
