import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Get key dashboard stats (students, attendance, fees, exams)' })
  getStats() { return this.dashboardService.getStats(); }

  @Get('activity')
  @ApiOperation({ summary: 'Get recent activity (new admissions, payments)' })
  getActivity() { return this.dashboardService.getRecentActivity(); }
}
