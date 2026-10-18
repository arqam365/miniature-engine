import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { ExamStatus } from '@prisma/client';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExamDto) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    return this.prisma.exam.create({
      data: {
        name: dto.name,
        examTypeId: dto.examTypeId ?? null,
        gradeSchemaId: dto.gradeSchemaId,
        instituteId,
        academicYearId: dto.academicYearId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalMarks: dto.totalMarks ?? null,
        passingMarks: dto.passingMarks ?? null,
      },
      include: {
        examType: true,
        gradeSchema: { include: { gradeBands: true } },
        academicYear: true,
      },
    });
  }

  async findAll() {
    const { instituteId } = requireTenantContext();
    const exams = await this.prisma.exam.findMany({
      where: { instituteId },
      include: { examType: true, academicYear: true },
      orderBy: { startDate: 'desc' },
    });
    return exams.map((exam) => ({
      ...exam,
      isPublished: exam.status === ExamStatus.COMPLETED,
    }));
  }

  async findOne(id: string) {
    const { instituteId } = requireTenantContext();
    const exam = await this.prisma.exam.findFirst({
      where: { id, instituteId },
      include: {
        examType: true,
        gradeSchema: { include: { gradeBands: true } },
        academicYear: true,
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async enterMarks(examId: string, entries: { studentId: string; subjectId: string; marksObtained: number }[]) {
    const exam = await this.findOne(examId);

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const entry of entries) {
        let result = await tx.examResult.findUnique({
          where: { examId_studentId: { examId, studentId: entry.studentId } },
        });

        if (!result) {
          result = await tx.examResult.create({
            data: { examId, studentId: entry.studentId, totalMarks: 0, isPassed: false },
          });
        }

        await tx.examMark.upsert({
          where: { examResultId_subjectId: { examResultId: result.id, subjectId: entry.subjectId } },
          update: { marksObtained: entry.marksObtained },
          create: {
            examResultId: result.id,
            examId,
            subjectId: entry.subjectId,
            marksObtained: entry.marksObtained,
            maxMarks: exam.totalMarks ?? 100,
          },
        });

        results.push(result as any);
      }
      return results;
    });
  }

  async publishResults(examId: string) {
    const exam = await this.findOne(examId);
    if (exam.status === ExamStatus.COMPLETED) {
      throw new BadRequestException('Results already published');
    }

    const results = await this.prisma.examResult.findMany({
      where: { examId },
      include: { marks: true },
    });

    await this.prisma.$transaction(
      results.map((r) => {
        const total = r.marks.reduce((s, m) => s + Number(m.marksObtained), 0);
        const isPassed = total >= Number(exam.passingMarks ?? 0);
        return this.prisma.examResult.update({
          where: { id: r.id },
          data: { totalMarks: total, isPassed, isPublished: true },
        });
      }),
    );

    await this.prisma.exam.update({
      where: { id: examId },
      data: { status: ExamStatus.COMPLETED },
    });

    return { message: 'Results published', examId };
  }

  async getRanking(examId: string) {
    const results = await this.prisma.examResult.findMany({
      where: { examId, isPublished: true },
      orderBy: { totalMarks: 'desc' },
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true } } },
    });

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }

  // ── Structure methods ──────────────────────────────────────────────────

  async getExamConfig(examId: string) {
    const { instituteId } = requireTenantContext();
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, instituteId },
      include: {
        academicYear: true,
        examType: true,
        examClasses: {
          include: {
            class: { select: { id: true, name: true, code: true } },
            examSubjects: {
              include: {
                subject: { select: { id: true, name: true, code: true } },
                components: true,
              },
            },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');
    return exam;
  }

  async addClassToExam(examId: string, classId: string) {
    const { instituteId } = requireTenantContext();
    await this.prisma.exam.findFirstOrThrow({ where: { id: examId, instituteId } });
    return this.prisma.examClass.create({ data: { examId, classId } });
  }

  async removeClassFromExam(examId: string, classId: string) {
    const { instituteId } = requireTenantContext();
    await this.prisma.exam.findFirstOrThrow({ where: { id: examId, instituteId } });
    return this.prisma.examClass.delete({ where: { examId_classId: { examId, classId } } });
  }

  async addSubjectToExamClass(examClassId: string, subjectId: string) {
    const examClass = await this.prisma.examClass.findUniqueOrThrow({ where: { id: examClassId } });
    return this.prisma.examSubject.create({
      data: { examId: examClass.examId, examClassId, subjectId },
    });
  }

  async removeExamSubject(examSubjectId: string) {
    return this.prisma.examSubject.delete({ where: { id: examSubjectId } });
  }

  async addComponent(examSubjectId: string, dto: {
    name: string; type: string; category: string;
    maxMarks: number; passingMarks?: number | null; weightPercent?: number | null;
  }) {
    return this.prisma.examComponent.create({
      data: {
        examSubjectId,
        name: dto.name,
        type: dto.type as any,
        category: dto.category as any,
        maxMarks: dto.maxMarks,
        passingMarks: dto.passingMarks ?? null,
        weightPercent: dto.weightPercent ?? null,
      },
    });
  }

  async updateComponent(componentId: string, dto: {
    name: string; type: string; category: string;
    maxMarks: number; passingMarks?: number | null; weightPercent?: number | null;
  }) {
    return this.prisma.examComponent.update({
      where: { id: componentId },
      data: {
        name: dto.name,
        type: dto.type as any,
        category: dto.category as any,
        maxMarks: dto.maxMarks,
        passingMarks: dto.passingMarks ?? null,
        weightPercent: dto.weightPercent ?? null,
      },
    });
  }

  async deleteComponent(componentId: string) {
    return this.prisma.examComponent.delete({ where: { id: componentId } });
  }
}
