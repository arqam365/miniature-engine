import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@RequirePermission('reports:read')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('student-strength')
  @ApiOperation({ summary: 'Total enrolment count by class' })
  studentStrength() {
    return this.reportsService.studentStrength();
  }

  @Get('attendance-analytics')
  @ApiOperation({ summary: 'Attendance summary for a given date' })
  @ApiQuery({ name: 'date', required: false, example: '2026-05-26' })
  attendanceAnalytics(@Query('date') date?: string) {
    return this.reportsService.attendanceAnalytics(date ?? new Date().toISOString().slice(0, 10));
  }

  @Get('fee-defaulters')
  @ApiOperation({ summary: 'List pending/overdue fee payments' })
  feeDefaulters() {
    return this.reportsService.feeDefaulters();
  }

  @Get('exam-ranking')
  @ApiOperation({ summary: 'Published exam ranking for a given exam' })
  @ApiQuery({ name: 'examId', required: true })
  examRanking(@Query('examId') examId: string) {
    return this.reportsService.examRanking(examId);
  }
}
