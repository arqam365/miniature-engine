import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import dayjs from 'dayjs';
import { Decimal } from '@prisma/client/runtime/library';

function toNum(d: Decimal | number): number {
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
}
