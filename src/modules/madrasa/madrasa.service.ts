import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import { DonationType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function toNum(d: Decimal | number): number {
  return typeof d === 'number' ? d : Number(d);
}

const STATUS_MAP: Record<string, string> = {
  COMPLETED: 'MEMORIZED',
  REVISION: 'UNDER_REVISION',
  WEAK: 'WEAK',
};

@Injectable()
export class MadrasaService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Hifz ───────────────────────────────────────────────────────────────────

  async recordHifzProgress(dto: {
    studentId: string;
    surahFrom: number;
    surahTo: number;
    ayahFrom: number;
    ayahTo: number;
    status: string;
    remarks?: string;
  }) {
    const { instituteId, userId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const dbStatus = (STATUS_MAP[dto.status] ?? dto.status) as any;
    const surahLabel = dto.surahFrom === dto.surahTo
      ? `Surah ${dto.surahFrom}`
      : `Surah ${dto.surahFrom}–${dto.surahTo}`;

    return this.prisma.hifzProgress.create({
      data: {
        studentId: dto.studentId,
        instituteId,
        surahName: surahLabel,
        surahNumber: dto.surahFrom,
        fromAyat: dto.ayahFrom,
        toAyat: dto.ayahTo,
        status: dbStatus,
        evaluatedAt: new Date(),
        evaluatorId: userId,
        remarks: dto.remarks,
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
    });
  }

  async getStudentHifzProgress(studentId: string) {
    const { instituteId } = requireTenantContext();
    return this.prisma.hifzProgress.findMany({
      where: { studentId, instituteId },
      orderBy: [{ surahNumber: 'asc' }, { evaluatedAt: 'desc' }],
    });
  }

  async getHifzSummary() {
    const { instituteId } = requireTenantContext();
    const groups = await this.prisma.hifzProgress.groupBy({
      by: ['status'],
      where: { instituteId },
      _count: { status: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.status }));
  }

  async getHifzList(page = 1, limit = 20) {
    const { instituteId } = requireTenantContext();
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.hifzProgress.findMany({
        where: { instituteId },
        skip,
        take: limit,
        orderBy: { evaluatedAt: 'desc' },
        include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
      }),
      this.prisma.hifzProgress.count({ where: { instituteId } }),
    ]);
    return { data, total, page, limit };
  }

  async updateHifz(id: string, dto: { status?: string; remarks?: string; fromAyat?: number; toAyat?: number }) {
    const { instituteId } = requireTenantContext();
    const record = await this.prisma.hifzProgress.findFirst({ where: { id, instituteId } });
    if (!record) throw new NotFoundException('Hifz record not found');

    const dbStatus = dto.status ? ((STATUS_MAP[dto.status] ?? dto.status) as any) : undefined;
    return this.prisma.hifzProgress.update({
      where: { id },
      data: {
        ...(dbStatus && { status: dbStatus }),
        ...(dto.remarks !== undefined && { remarks: dto.remarks }),
        ...(dto.fromAyat !== undefined && { fromAyat: dto.fromAyat }),
        ...(dto.toAyat !== undefined && { toAyat: dto.toAyat }),
      },
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
    });
  }

  async deleteHifz(id: string) {
    const { instituteId } = requireTenantContext();
    const record = await this.prisma.hifzProgress.findFirst({ where: { id, instituteId } });
    if (!record) throw new NotFoundException('Hifz record not found');
    await this.prisma.hifzProgress.delete({ where: { id } });
    return { deleted: true };
  }

  // ─── Sponsorships ────────────────────────────────────────────────────────────

  async createSponsorship(dto: {
    studentId: string;
    sponsorName: string;
    sponsorPhone?: string;
    sponsorEmail?: string;
    amount: number;
    startDate: string;
    remarks?: string;
  }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.sponsorship.create({
      data: {
        studentId: dto.studentId,
        organizationId,
        sponsorName: dto.sponsorName,
        sponsorPhone: dto.sponsorPhone,
        sponsorEmail: dto.sponsorEmail,
        amount: dto.amount,
        frequency: 'MONTHLY',
        startDate: new Date(dto.startDate),
        notes: dto.remarks,
      },
    });
  }

  async getSponsorships(activeOnly?: boolean | string) {
    const { organizationId } = requireTenantContext();
    const active = activeOnly === true || activeOnly === 'true';
    const sponsorships = await this.prisma.sponsorship.findMany({
      where: { organizationId, ...(active && { isActive: true }) },
      orderBy: { createdAt: 'desc' },
    });

    if (sponsorships.length === 0) return [];

    const studentIds = [...new Set(sponsorships.map((s) => s.studentId))];
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: { id: true, firstName: true, lastName: true, admissionNo: true },
    });
    const byId = new Map(students.map((s) => [s.id, s]));

    return sponsorships.map((s) => ({
      id: s.id,
      sponsorName: s.sponsorName,
      amount: toNum(s.amount),
      isActive: s.isActive,
      student: byId.get(s.studentId) ?? { id: s.studentId, firstName: 'Unknown', lastName: '', admissionNo: '' },
    }));
  }

  async getSponsorCoverageRatio() {
    const { organizationId, instituteId } = requireTenantContext();
    const [sponsored, total] = await Promise.all([
      this.prisma.sponsorship.count({ where: { organizationId, isActive: true } }),
      this.prisma.student.count({ where: { ...(instituteId ? { instituteId } : { organizationId: organizationId as string }), isActive: true } }),
    ]);
    return { sponsored, total, ratio: total > 0 ? ((sponsored / total) * 100).toFixed(1) + '%' : '0%' };
  }

  // ─── Donations ───────────────────────────────────────────────────────────────

  async recordDonation(dto: {
    donorName: string;
    donorPhone?: string;
    type: DonationType;
    amount: number;
    date: string;
    remarks?: string;
  }) {
    const { organizationId, userId } = requireTenantContext();
    const entry = await this.prisma.donationLedger.create({
      data: {
        organizationId,
        donorName: dto.donorName,
        donorPhone: dto.donorPhone,
        donationType: dto.type,
        amount: dto.amount,
        receivedAt: new Date(dto.date),
        notes: dto.remarks,
        createdById: userId,
      },
    });
    return this.mapDonation(entry);
  }

  async getDonationLedger(type?: DonationType) {
    const { organizationId } = requireTenantContext();
    const entries = await this.prisma.donationLedger.findMany({
      where: { organizationId, ...(type && { donationType: type }) },
      orderBy: { receivedAt: 'desc' },
    });
    return entries.map((d) => this.mapDonation(d));
  }

  async getDonationSummary() {
    const { organizationId } = requireTenantContext();
    return this.prisma.donationLedger.groupBy({
      by: ['donationType'],
      where: { organizationId },
      _sum: { amount: true },
      _count: { id: true },
    });
  }

  private mapDonation(d: any) {
    return {
      id: d.id,
      donorName: d.donorName,
      amount: toNum(d.amount),
      type: d.donationType,
      date: d.receivedAt instanceof Date ? d.receivedAt.toISOString() : d.receivedAt,
      remarks: d.notes ?? null,
    };
  }
}
