import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('settings')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('organization')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get organization profile' })
  getOrganization() { return this.settingsService.getOrganization(); }

  @Put('organization')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update organization profile' })
  updateOrganization(@Body() dto: any) { return this.settingsService.updateOrganization(dto); }

  @Get('general')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get general settings (timezone, language, currency etc.)' })
  getSettings() { return this.settingsService.getOrgSettings(); }

  @Put('general')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update general settings' })
  updateSettings(@Body() dto: any) { return this.settingsService.updateOrgSettings(dto); }

  @Get('institutes')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List all institutes/campuses' })
  getInstitutes() { return this.settingsService.getInstitutes(); }

  @Post('institutes')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a new institute/campus' })
  createInstitute(@Body() dto: any) { return this.settingsService.createInstitute(dto); }

  @Get('academic-years')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List academic years' })
  getAcademicYears() { return this.settingsService.getAcademicYears(); }

  @Post('academic-years')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create academic year' })
  createAcademicYear(@Body() dto: any) { return this.settingsService.createAcademicYear(dto); }

  @Put('academic-years/:id/activate')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Set active academic year' })
  activateAcademicYear(@Param('id') id: string) { return this.settingsService.activateAcademicYear(id); }

  @Get('roles')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List roles with permissions' })
  getRoles() { return this.settingsService.getRoles(); }

  @Post('roles')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a custom role' })
  createRole(@Body() dto: any) { return this.settingsService.createRole(dto); }

  @Get('permissions')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List all available permissions' })
  getPermissions() { return this.settingsService.getAllPermissions(); }

  @Get('classes')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List classes with sections' })
  getClasses() { return this.settingsService.getClasses(); }

  @Post('classes')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a class' })
  createClass(@Body() dto: any) { return this.settingsService.createClass(dto); }

  @Post('sections')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a section' })
  createSection(@Body() dto: any) { return this.settingsService.createSection(dto); }

  @Get('subjects')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List subjects' })
  getSubjects() { return this.settingsService.getSubjects(); }

  @Post('subjects')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a subject' })
  createSubject(@Body() dto: any) { return this.settingsService.createSubject(dto); }

  @Get('student-fields')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get dynamic student profile field configuration' })
  getStudentFields() { return this.settingsService.getStudentFieldConfig(); }

  @Post('student-fields')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Add or update a custom student field' })
  upsertStudentField(@Body() dto: any) { return this.settingsService.upsertStudentField(dto); }
}
