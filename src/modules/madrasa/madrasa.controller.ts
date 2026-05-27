import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MadrasaService } from './madrasa.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('madrasa')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RbacGuard)
@Controller('madrasa')
export class MadrasaController {
  constructor(private readonly madrasaService: MadrasaService) {}

  @Post('hifz')
  @RequirePermission('madrasa:create')
  @ApiOperation({ summary: 'Record Hifz progress for a student' })
  recordHifz(@Body() dto: any) { return this.madrasaService.recordHifzProgress(dto); }

  @Get('hifz/student/:studentId')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'Get full Hifz history for a student' })
  getStudentHifz(@Param('studentId') studentId: string) {
    return this.madrasaService.getStudentHifzProgress(studentId);
  }

  @Get('hifz/summary')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'Get Hifz completion summary by status' })
  getHifzSummary() { return this.madrasaService.getHifzSummary(); }

  @Post('sponsorships')
  @RequirePermission('madrasa:create')
  @ApiOperation({ summary: 'Create student sponsorship' })
  createSponsorship(@Body() dto: any) { return this.madrasaService.createSponsorship(dto); }

  @Get('sponsorships')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'List all sponsorships' })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  getSponsorships(@Query('activeOnly') activeOnly: boolean) {
    return this.madrasaService.getSponsorships(activeOnly);
  }

  @Get('sponsorships/coverage')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'Get sponsor coverage ratio vs total students' })
  getCoverage() { return this.madrasaService.getSponsorCoverageRatio(); }

  @Post('donations')
  @RequirePermission('madrasa:create')
  @ApiOperation({ summary: 'Record a donation (Zakat, Sadaqah, Waqf, etc.)' })
  recordDonation(@Body() dto: any) { return this.madrasaService.recordDonation(dto); }

  @Get('donations')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'Get donation ledger' })
  @ApiQuery({ name: 'type', required: false, enum: ['ZAKAT', 'SADAQAH', 'WAQF', 'QURBANI', 'GENERAL'] })
  getDonations(@Query('type') type: any) { return this.madrasaService.getDonationLedger(type); }

  @Get('donations/summary')
  @RequirePermission('madrasa:read')
  @ApiOperation({ summary: 'Get donation totals by type' })
  getDonationSummary() { return this.madrasaService.getDonationSummary(); }
}
