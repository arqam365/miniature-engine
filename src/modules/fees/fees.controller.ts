import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { FeesService } from './fees.service';
import { CreateFeePaymentDto } from './dto/create-fee-payment.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('fees')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('collect')
  @RequirePermission('fees:create')
  @ApiOperation({ summary: 'Collect fee payment and generate receipt' })
  collect(@Body() dto: CreateFeePaymentDto) {
    return this.feesService.collectPayment(dto);
  }

  @Get('student/:studentId')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get all fee payments for a student' })
  getStudentFees(@Param('studentId') studentId: string) {
    return this.feesService.getStudentFees(studentId);
  }

  @Get('defaulters')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get fee defaulters list' })
  getDefaulters(@Query('academicYearId') academicYearId?: string) {
    return this.feesService.getDefaulters(academicYearId);
  }

  @Get('collection-summary')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get fee collection summary for a date range' })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getCollectionSummary(@Query('startDate') startDate: string, @Query('endDate') endDate: string) {
    return this.feesService.getCollectionSummary(startDate, endDate);
  }

  @Get('dashboard-stats')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get fee dashboard stats (today, pending, overdue)' })
  getDashboardStats() {
    return this.feesService.getDashboardStats();
  }
}
