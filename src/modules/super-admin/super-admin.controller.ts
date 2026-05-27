import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SuperAdminService } from './super-admin.service';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Public } from '../../common/decorators/public.decorator';
import { OnboardOrgDto } from './dto/onboard-org.dto';
import { CreateOnboardingRequestDto } from './dto/create-onboarding-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@ApiTags('super-admin')
@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly service: SuperAdminService) {}

  // ── Orgs (protected) ─────────────────────────────────────────────────

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Get('orgs')
  listOrgs() { return this.service.listOrgs(); }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Post('orgs')
  onboardOrg(@Body() dto: OnboardOrgDto) { return this.service.onboardOrg(dto); }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Get('orgs/:id')
  getOrg(@Param('id') id: string) { return this.service.getOrgDetail(id); }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Get('orgs/:id/stats')
  getOrgStats(@Param('id') id: string) { return this.service.getOrgStats(id); }

  // ── Onboarding requests ───────────────────────────────────────────────

  @Public()
  @Post('onboarding-requests')
  createRequest(@Body() dto: CreateOnboardingRequestDto) {
    return this.service.createRequest(dto);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Get('onboarding-requests')
  listRequests(@Query('status') status?: string) {
    return this.service.listRequests(status);
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Get('onboarding-requests/counts')
  getRequestCounts() {
    return this.service.getRequestCounts();
  }

  @ApiBearerAuth('access-token')
  @UseGuards(SuperAdminGuard)
  @Patch('onboarding-requests/:id')
  updateRequestStatus(@Param('id') id: string, @Body() dto: UpdateRequestStatusDto) {
    return this.service.updateRequestStatus(id, dto);
  }
}
