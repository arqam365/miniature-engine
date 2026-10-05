import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
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

  // Academic Years
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

  @Put('academic-years/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update academic year' })
  updateAcademicYear(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateAcademicYear(id, dto); }

  @Delete('academic-years/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete academic year' })
  deleteAcademicYear(@Param('id') id: string) { return this.settingsService.deleteAcademicYear(id); }

  // Roles
  @Get('roles')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List roles with permissions' })
  getRoles() { return this.settingsService.getRoles(); }

  @Post('roles')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a custom role' })
  createRole(@Body() dto: any) { return this.settingsService.createRole(dto); }

  @Put('roles/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update role name, description, or permissions' })
  updateRole(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateRole(id, dto); }

  @Delete('roles/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a custom role' })
  deleteRole(@Param('id') id: string) { return this.settingsService.deleteRole(id); }

  @Get('permissions')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List all available permissions' })
  getPermissions() { return this.settingsService.getAllPermissions(); }

  // Classes & Sections
  @Get('classes')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List classes with sections' })
  getClasses() { return this.settingsService.getClasses(); }

  @Post('classes')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a class' })
  createClass(@Body() dto: any) { return this.settingsService.createClass(dto); }

  @Put('classes/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update a class' })
  updateClass(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateClass(id, dto); }

  @Delete('classes/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a class' })
  deleteClass(@Param('id') id: string) { return this.settingsService.deleteClass(id); }

  @Post('sections')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a section' })
  createSection(@Body() dto: any) { return this.settingsService.createSection(dto); }

  @Put('sections/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update a section' })
  updateSection(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateSection(id, dto); }

  @Delete('sections/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a section' })
  deleteSection(@Param('id') id: string) { return this.settingsService.deleteSection(id); }

  // Subjects
  @Get('subjects')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List subjects' })
  getSubjects() { return this.settingsService.getSubjects(); }

  @Post('subjects')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a subject' })
  createSubject(@Body() dto: any) { return this.settingsService.createSubject(dto); }

  @Put('subjects/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update a subject' })
  updateSubject(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateSubject(id, dto); }

  @Delete('subjects/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a subject' })
  deleteSubject(@Param('id') id: string) { return this.settingsService.deleteSubject(id); }

  // Courses
  @Get('courses')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List courses / programs' })
  getCourses() { return this.settingsService.getCourses(); }

  @Post('courses')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a course / program' })
  createCourse(@Body() dto: any) { return this.settingsService.createCourse(dto); }

  @Put('courses/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update a course / program' })
  updateCourse(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateCourse(id, dto); }

  @Delete('courses/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a course / program' })
  deleteCourse(@Param('id') id: string) { return this.settingsService.deleteCourse(id); }

  // Batches
  @Get('batches')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'List batches' })
  getBatches() { return this.settingsService.getBatches(); }

  @Post('batches')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Create a batch' })
  createBatch(@Body() dto: any) { return this.settingsService.createBatch(dto); }

  @Put('batches/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Update a batch' })
  updateBatch(@Param('id') id: string, @Body() dto: any) { return this.settingsService.updateBatch(id, dto); }

  @Delete('batches/:id')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Delete a batch' })
  deleteBatch(@Param('id') id: string) { return this.settingsService.deleteBatch(id); }

  // WhatsApp Integration
  @Get('whatsapp')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get WhatsApp integration config (API key masked)' })
  getWhatsappConfig() { return this.settingsService.getWhatsappConfig(); }

  @Put('whatsapp')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Save WhatsApp provider config' })
  updateWhatsappConfig(@Body() dto: any) { return this.settingsService.updateWhatsappConfig(dto); }

  @Delete('whatsapp')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Disconnect WhatsApp integration' })
  disconnectWhatsapp() { return this.settingsService.disconnectWhatsapp(); }

  // Student Fields
  @Get('student-fields')
  @RequirePermission('settings:read')
  @ApiOperation({ summary: 'Get dynamic student profile field configuration' })
  getStudentFields() { return this.settingsService.getStudentFieldConfig(); }

  @Post('student-fields')
  @RequirePermission('settings:update')
  @ApiOperation({ summary: 'Add or update a custom student field' })
  upsertStudentField(@Body() dto: any) { return this.settingsService.upsertStudentField(dto); }
}
