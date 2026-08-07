import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { search?: string; page?: number; pageSize?: number }) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [raw, total] = await Promise.all([
      this.prisma.guardian.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.guardian.count({ where }),
    ]);

    const data = raw.map((g, i) => ({
      id: g.id,
      refId: String(skip + i + 1).padStart(6, '0'),
      guardianId: `GRD-${g.id.slice(-6).toUpperCase()}`,
      firstName: g.firstName,
      lastName: g.lastName,
      relationship: g.relationship,
      name: `${g.firstName} ${g.lastName}`,
      phone: g.phone,
      email: g.email,
      country: null,
      state: null,
      city: g.address ?? null,
      address: g.address,
      pincode: null,
      googleMapLocation: null,
      remarks: null,
      createdAt: g.createdAt.toISOString(),
    }));

    return { data, total, page, pageSize };
  }

  async findSponsors(params: { search?: string; page?: number; pageSize?: number }) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { isSponsor: true };
    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [raw, total] = await Promise.all([
      this.prisma.guardian.findMany({ where, skip, take: pageSize, orderBy: { createdAt: 'desc' } }),
      this.prisma.guardian.count({ where }),
    ]);

    const data = raw.map((g, i) => ({
      id: g.id,
      refId: String(skip + i + 1).padStart(6, '0'),
      sponsorId: `SPO-${g.id.slice(-6).toUpperCase()}`,
      name: `${g.firstName} ${g.lastName}`,
      phone: g.phone,
      email: g.email,
      country: null,
      organizationName: g.occupation ?? null,
      sponsorshipType: null,
      createdAt: g.createdAt.toISOString(),
    }));

    return { data, total, page, pageSize };
  }

  async create(dto: CreateGuardianDto) {
    return this.prisma.guardian.create({ data: dto });
  }

  async linkToStudent(studentId: string, dto: LinkGuardianDto, instituteId: string) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, instituteId },
    });
    if (!student) throw new NotFoundException('Student not found');

    const guardian = await this.prisma.guardian.findUnique({ where: { id: dto.guardianId } });
    if (!guardian) throw new NotFoundException('Guardian not found');

    const existing = await this.prisma.studentGuardian.findUnique({
      where: { studentId_guardianId: { studentId, guardianId: dto.guardianId } },
    });
    if (existing) throw new ConflictException('Guardian already linked to this student');

    // If marking as primary, unset existing primary
    if (dto.isPrimary) {
      await this.prisma.studentGuardian.updateMany({
        where: { studentId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    return this.prisma.studentGuardian.create({
      data: { studentId, guardianId: dto.guardianId, isPrimary: dto.isPrimary ?? false },
      include: { guardian: true },
    });
  }

  async findById(guardianId: string) {
    const guardian = await this.prisma.guardian.findUnique({
      where: { id: guardianId },
      include: {
        students: {
          include: {
            student: {
              select: {
                id: true,
                admissionNo: true,
                firstName: true,
                lastName: true,
                photo: true,
                isActive: true,
                institute: { select: { id: true, name: true } },
                enrollments: {
                  where: { isActive: true },
                  include: { class: { select: { name: true } }, section: { select: { name: true } } },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!guardian) throw new NotFoundException('Guardian not found');
    return guardian;
  }
}
