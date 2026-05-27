import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('attendance')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('mark')
  @RequirePermission('attendance:create')
  @ApiOperation({ summary: 'Mark bulk attendance for a section' })
  markBulk(@Body() dto: MarkAttendanceDto) {
    return this.attendanceService.markBulk(dto);
  }

  @Get('section')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Get section attendance for a specific date' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2025-04-30' })
  getSectionAttendance(@Query('sectionId') sectionId: string, @Query('date') date: string) {
    return this.attendanceService.getSectionAttendance(sectionId, date);
  }

  @Get('monthly-report')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Get monthly attendance report for a section' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'month', required: true, type: Number })
  @ApiQuery({ name: 'year', required: true, type: Number })
  getMonthlyReport(
    @Query('sectionId') sectionId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.attendanceService.getMonthlyReport(sectionId, month, year);
  }

  @Get('daily-summary')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Get daily attendance summary (totals by status)' })
  @ApiQuery({ name: 'date', required: true })
  getDailySummary(@Query('date') date: string) {
    return this.attendanceService.getDailySummary(date);
  }

  @Get('absentees')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Get list of absentees for a date' })
  @ApiQuery({ name: 'date', required: true })
  getAbsentees(@Query('date') date: string) {
    return this.attendanceService.getAbsentees(date);
  }
}
