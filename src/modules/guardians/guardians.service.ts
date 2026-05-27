import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGuardianDto } from './dto/create-guardian.dto';
import { LinkGuardianDto } from './dto/link-guardian.dto';

@Injectable()
export class GuardiansService {
  constructor(private readonly prisma: PrismaService) {}

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
