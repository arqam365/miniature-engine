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

  @Get('history')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Paginated history of all paid fee payments' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getHistory(
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feesService.getPaymentHistory({ search, from, to, page: Number(page), limit: Number(limit) });
  }

  @Get('student/:studentId')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get all fee payments for a student' })
  getStudentFees(@Param('studentId') studentId: string) {
    return this.feesService.getStudentFees(studentId);
  }

  @Get('defaulters')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'Get fee defaulters list (paginated)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  getDefaulters(
    @Query('academicYearId') academicYearId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.feesService.getDefaulters({ academicYearId, page: Number(page), limit: Number(limit) });
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

  // ─── Fee Categories ─────────────────────────────────────────────────────────

  @Get('categories')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'List fee categories' })
  getCategories() {
    return this.feesService.getCategories();
  }

  @Post('categories')
  @RequirePermission('fees:create')
  @ApiOperation({ summary: 'Create a fee category' })
  createCategory(@Body() dto: { name: string }) {
    return this.feesService.createCategory(dto);
  }

  // ─── Fee Structures ─────────────────────────────────────────────────────────

  @Get('structures')
  @RequirePermission('fees:read')
  @ApiOperation({ summary: 'List fee structures' })
  @ApiQuery({ name: 'academicYearId', required: false })
  getStructures(
    @Query('academicYearId') academicYearId?: string,
    @Query('classId') classId?: string,
  ) {
    return this.feesService.getStructures({ academicYearId, classId });
  }

  @Post('structures')
  @RequirePermission('fees:create')
  @ApiOperation({ summary: 'Create a fee structure' })
  createStructure(
    @Body() dto: { name: string; feeCategoryId: string; academicYearId: string; amount: number; dueDay?: number; lateFeeAmount?: number },
  ) {
    return this.feesService.createStructure(dto);
  }
}
