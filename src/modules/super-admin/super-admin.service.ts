import { Injectable, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { OnboardOrgDto } from './dto/onboard-org.dto';
import { CreateOnboardingRequestDto } from './dto/create-onboarding-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Injectable()
export class SuperAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrgs() {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { institutes: true, users: true } } },
    });

    const withCounts = await Promise.all(
      orgs.map(async (org) => {
        const studentCount = await this.prisma.student.count({
          where: { institute: { organizationId: org.id } },
        });
        return {
          id: org.id,
          name: org.name,
          type: org.type,
          slug: org.slug,
          isActive: org.isActive,
          createdAt: org.createdAt,
          instituteCount: org._count.institutes,
          userCount: org._count.users,
          studentCount,
        };
      }),
    );

    return withCounts;
  }

  async getOrgDetail(orgId: string) {
    return this.prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      include: {
        institutes: {
          select: { id: true, name: true, type: true, code: true, isActive: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
        orgSettings: { select: { timezone: true, currency: true, language: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async getOrgStats(orgId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [studentCount, feeAllTime, feeThisMonth, examCount, attendanceThisMonth] =
      await Promise.all([
        this.prisma.student.count({ where: { institute: { organizationId: orgId } } }),
        this.prisma.feePayment.aggregate({
          where: { institute: { organizationId: orgId }, status: 'PAID' },
          _sum: { totalAmount: true },
        }),
        this.prisma.feePayment.aggregate({
          where: {
            institute: { organizationId: orgId },
            status: 'PAID',
            paidAt: { gte: monthStart },
          },
          _sum: { totalAmount: true },
        }),
        this.prisma.exam.count({ where: { institute: { organizationId: orgId } } }),
        this.prisma.attendanceRecord.count({
          where: { institute: { organizationId: orgId }, date: { gte: monthStart } },
        }),
      ]);

    return {
      studentCount,
      totalFeeCollection: Number(feeAllTime._sum.totalAmount ?? 0),
      feeCollectionThisMonth: Number(feeThisMonth._sum.totalAmount ?? 0),
      examCount,
      attendanceRecordsThisMonth: attendanceThisMonth,
    };
  }

  async onboardOrg(dto: OnboardOrgDto) {
    const [emailExists, slugExists] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.adminEmail } }),
      this.prisma.organization.findUnique({ where: { slug: dto.orgSlug } }),
    ]);

    if (emailExists) throw new ConflictException('Email already registered');
    if (slugExists) throw new ConflictException('Organization slug already taken');

    const hash = await argon2.hash(dto.adminPassword);

    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: { name: dto.orgName, type: dto.orgType, slug: dto.orgSlug },
      });

      await tx.orgSettings.create({ data: { organizationId: org.id } });

      const admin = await tx.user.create({
        data: {
          email: dto.adminEmail,
          passwordHash: hash,
          firstName: dto.adminFirstName,
          lastName: dto.adminLastName,
          organizationId: org.id,
        },
      });

      return {
        organizationId: org.id,
        adminUserId: admin.id,
        message: 'Organization onboarded successfully',
      };
    });
  }

  // ── Onboarding requests ───────────────────────────────────────────────

  async createRequest(dto: CreateOnboardingRequestDto) {
    return this.prisma.onboardingRequest.create({ data: dto });
  }

  async listRequests(status?: string) {
    return this.prisma.onboardingRequest.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateRequestStatus(id: string, dto: UpdateRequestStatusDto) {
    return this.prisma.onboardingRequest.update({
      where: { id },
      data: { status: dto.status, notes: dto.notes },
    });
  }

  async getRequestCounts() {
    const [pending, contacted, onboarded, rejected] = await Promise.all([
      this.prisma.onboardingRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.onboardingRequest.count({ where: { status: 'CONTACTED' } }),
      this.prisma.onboardingRequest.count({ where: { status: 'ONBOARDED' } }),
      this.prisma.onboardingRequest.count({ where: { status: 'REJECTED' } }),
    ]);
    return { pending, contacted, onboarded, rejected, total: pending + contacted + onboarded + rejected };
  }
}
