import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery, ApiProduces } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { ExportService } from './export.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('export')
@ApiBearerAuth('access-token')
@Controller('export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('students')
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'Export all active students to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportStudents(@Res() res: FastifyReply) {
    const buffer = await this.exportService.studentsExcel();
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="students.xlsx"')
      .send(buffer);
  }

  @Get('attendance')
  @RequirePermission('attendance:read')
  @ApiOperation({ summary: 'Export attendance for a given date to Excel' })
  @ApiQuery({ name: 'date', required: false, example: '2026-05-26' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportAttendance(@Query('date') date: string, @Res() res: FastifyReply) {
    const target = date ?? new Date().toISOString().slice(0, 10);
    const buffer = await this.exportService.attendanceExcel(target);
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="attendance-${target}.xlsx"`)
      .send(buffer);
  }

  @Get('fees')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Export all paid fee payments to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportFees(@Res() res: FastifyReply) {
    const buffer = await this.exportService.feesExcel();
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="fees.xlsx"')
      .send(buffer);
  }

  @Get('vouchers')
  @RequirePermission('accounts:read')
  @ApiOperation({ summary: 'Export all vouchers to Excel' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportVouchers(@Res() res: FastifyReply) {
    const buffer = await this.exportService.vouchersExcel();
    res
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', 'attachment; filename="vouchers.xlsx"')
      .send(buffer);
  }
}
