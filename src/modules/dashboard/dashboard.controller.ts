import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get key dashboard stats (students, attendance, fees, exams)' })
  getStats() { return this.dashboardService.getStats(); }

  @Get('attendance-trend')
  @ApiOperation({ summary: 'Get attendance percentage for the last 30 days' })
  getAttendanceTrend() { return this.dashboardService.getAttendanceTrend(); }

  @Get('fee-collection')
  @ApiOperation({ summary: 'Get fee collection totals for the last 6 months' })
  getFeeCollection() { return this.dashboardService.getFeeCollection(); }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity (new admissions, payments)' })
  getActivity() { return this.dashboardService.getRecentActivity(); }
}
