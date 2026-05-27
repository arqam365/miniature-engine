import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const { organizationId, instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const existing = await this.prisma.student.findUnique({
      where: { instituteId_admissionNo: { instituteId, admissionNo: dto.admissionNo } },
    });
    if (existing) throw new ConflictException('Admission number already exists');

    return this.prisma.student.create({
      data: { ...dto, organizationId, instituteId },
    });
  }

  async findAll(query: { search?: string; classId?: string; sectionId?: string; page?: number; limit?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    const { search, classId, sectionId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: any = { instituteId, isActive: true };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { admissionNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (classId || sectionId) {
      where.enrollments = {
        some: {
          isActive: true,
          ...(classId && { classId }),
          ...(sectionId && { sectionId }),
        },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { admissionNo: 'asc' },
        include: {
          enrollments: {
            where: { isActive: true },
            include: {
              class: { select: { id: true, name: true } },
              section: { select: { id: true, name: true } },
            },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const { instituteId } = requireTenantContext();
    const student = await this.prisma.student.findFirst({
      where: { id, instituteId },
      include: {
        enrollments: {
          include: {
            class: true,
            section: true,
            batch: true,
            academicYear: true,
          },
        },
        guardians: { include: { guardian: true } },
        customFields: true,
      },
    });
    if (!student) throw new NotFoundException('Student not found');
    return student;
  }

  async update(id: string, dto: Partial<CreateStudentDto>) {
    const { instituteId } = requireTenantContext();
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: dto,
    });
  }

  async enroll(studentId: string, dto: EnrollStudentDto) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');

    await this.findOne(studentId);

    await this.prisma.enrollment.updateMany({
      where: { studentId, instituteId, isActive: true },
      data: { isActive: false },
    });

    return this.prisma.enrollment.create({
      data: {
        studentId,
        instituteId,
        classId: dto.classId,
        academicYearId: dto.academicYearId,
        sectionId: dto.sectionId,
        batchId: dto.batchId,
        rollNumber: dto.rollNumber,
        isActive: true,
      },
      include: {
        class: true,
        section: true,
        academicYear: true,
      },
    });
  }

  async getAttendanceSummary(studentId: string, month: number, year: number) {
    const { instituteId } = requireTenantContext();
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const records = await this.prisma.attendanceRecord.groupBy({
      by: ['status'],
      where: {
        studentId,
        instituteId,
        date: { gte: start, lte: end },
      },
      _count: { status: true },
    });

    return records.reduce((acc, r) => {
      acc[r.status] = r._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  async deactivate(id: string) {
    const { instituteId } = requireTenantContext();
    await this.findOne(id);
    return this.prisma.student.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
