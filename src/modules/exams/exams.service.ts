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
    if (!instituteId) throw new Error('Institute context required');

    return this.prisma.exam.create({
      data: {
        name: dto.name,
        examTypeId: dto.examTypeId,
        gradeSchemaId: dto.gradeSchemaId,
        instituteId,
        academicYearId: dto.academicYearId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalMarks: dto.totalMarks,
        passingMarks: dto.passingMarks,
      },
      include: {
        examType: true,
        gradeSchema: { include: { gradeBands: true } },
      },
    });
  }

  async findAll() {
    const { instituteId } = requireTenantContext();
    return this.prisma.exam.findMany({
      where: { instituteId },
      include: { examType: true, academicYear: true },
      orderBy: { startDate: 'desc' },
    });
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
    const { instituteId } = requireTenantContext();
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
            maxMarks: exam.totalMarks,
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
        const isPassed = total >= Number(exam.passingMarks);
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
    const { instituteId } = requireTenantContext();
    const results = await this.prisma.examResult.findMany({
      where: { examId, isPublished: true },
      orderBy: { totalMarks: 'desc' },
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true } } },
    });

    return results.map((r, i) => ({ ...r, rank: i + 1 }));
  }
}
