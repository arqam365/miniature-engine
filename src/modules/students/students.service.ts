import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { BulkImportStudentsDto } from './dto/bulk-import-student.dto';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudentDto) {
    const { organizationId, instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const existing = await this.prisma.student.findUnique({
      where: { instituteId_admissionNo: { instituteId, admissionNo: dto.admissionNo } },
    });
    if (existing) throw new ConflictException('Admission number already exists');

    return this.prisma.student.create({
      data: {
        ...dto,
        organizationId,
        instituteId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async findAll(query: { search?: string; classId?: string; sectionId?: string; page?: number; limit?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const page = parseInt(query.page as any, 10) || 1;
    const limit = parseInt(query.limit as any, 10) || 20;
    const { search, classId, sectionId } = query;
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
      data: {
        ...dto,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  async enroll(studentId: string, dto: EnrollStudentDto) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

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

  async bulkImport(dto: BulkImportStudentsDto) {
    const { organizationId, instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const results: Array<{ row: number; admissionNo: string; status: 'success' | 'error'; message?: string }> = [];

    for (const [i, row] of dto.rows.entries()) {
      try {
        // Find or create guardian by phone within this org
        let guardian = await this.prisma.guardian.findFirst({
          where: { phone: row.guardianPhone, students: { some: { student: { organizationId } } } },
        });
        if (!guardian) {
          guardian = await this.prisma.guardian.create({
            data: {
              firstName: row.guardianFirstName,
              lastName: row.guardianLastName,
              relationship: row.guardianRelationship,
              phone: row.guardianPhone,
              whatsappNumber: row.guardianWhatsApp || null,
              email: row.guardianEmail || null,
              occupation: row.guardianOccupation || null,
            },
          });
        }

        // Create student
        const student = await this.prisma.student.create({
          data: {
            admissionNo: row.admissionNo,
            firstName: row.firstName,
            lastName: row.lastName || null,
            dateOfBirth: row.dateOfBirth ? new Date(row.dateOfBirth) : null,
            gender: (row.gender as any) || null,
            phone: row.phone || null,
            email: row.email || null,
            religion: row.religion || null,
            nationality: row.nationality || null,
            bloodGroup: row.bloodGroup || null,
            city: row.city || null,
            address: row.address || null,
            category: row.category || null,
            rationCard: row.rationCard || null,
            organizationId,
            instituteId,
          },
        });

        // Enroll if academicYear + className provided
        if (row.academicYear && row.className) {
          const [year, cls] = await Promise.all([
            this.prisma.academicYear.findFirst({ where: { name: row.academicYear, organizationId } }),
            this.prisma.class.findFirst({ where: { name: row.className, instituteId } }),
          ]);
          if (year && cls) {
            let sectionId: string | null = null;
            if (row.section) {
              const sec = await this.prisma.section.findFirst({ where: { name: row.section, classId: cls.id } });
              sectionId = sec?.id ?? null;
            }
            await this.prisma.enrollment.create({
              data: { studentId: student.id, academicYearId: year.id, classId: cls.id, sectionId, instituteId, rollNumber: row.rollNumber || null, isActive: true },
            });
          }
        }

        // Link guardian as primary
        await this.prisma.studentGuardian.create({
          data: { studentId: student.id, guardianId: guardian.id, isPrimary: true },
        });

        results.push({ row: i + 1, admissionNo: row.admissionNo, status: 'success' });
      } catch (err: any) {
        const msg = err?.code === 'P2002' ? 'Admission number already exists' : (err?.message ?? 'Unknown error');
        results.push({ row: i + 1, admissionNo: row.admissionNo, status: 'error', message: msg });
      }
    }

    return results;
  }
}
