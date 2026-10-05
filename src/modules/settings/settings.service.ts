import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { requireTenantContext } from '../tenancy/tenant-context';
import { OrgType, InstituteType } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrgSettings() {
    const { organizationId } = requireTenantContext();
    const settings = await this.prisma.orgSettings.findUnique({ where: { organizationId } });
    if (!settings) throw new NotFoundException('Settings not found');
    return settings;
  }

  async updateOrgSettings(dto: Partial<{
    timezone: string; language: string; currency: string;
    dateFormat: string; theme: string; reportHeader: string;
  }>) {
    const { organizationId } = requireTenantContext();
    return this.prisma.orgSettings.upsert({
      where: { organizationId },
      update: dto,
      create: { organizationId, ...dto },
    });
  }

  async getOrganization() {
    const { organizationId } = requireTenantContext();
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { institutes: true },
    });
  }

  async updateOrganization(dto: Partial<{
    name: string; type: OrgType; logo: string; address: string; phone: string; email: string; website: string;
  }>) {
    const { organizationId } = requireTenantContext();
    return this.prisma.organization.update({ where: { id: organizationId }, data: dto });
  }

  // Institutes
  async getInstitutes() {
    const { organizationId } = requireTenantContext();
    return this.prisma.institute.findMany({ where: { organizationId, isActive: true } });
  }

  async createInstitute(dto: { name: string; type: InstituteType; code?: string; address?: string; phone?: string; email?: string }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.institute.create({ data: { ...dto, organizationId } });
  }

  // Academic Years
  async getAcademicYears() {
    const { organizationId } = requireTenantContext();
    return this.prisma.academicYear.findMany({
      where: { organizationId },
      orderBy: { startDate: 'desc' },
    });
  }

  async createAcademicYear(dto: { name: string; startDate: string; endDate: string }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.academicYear.create({
      data: { ...dto, organizationId, startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) },
    });
  }

  async activateAcademicYear(id: string) {
    const { organizationId } = requireTenantContext();
    await this.prisma.academicYear.updateMany({ where: { organizationId }, data: { isActive: false } });
    return this.prisma.academicYear.update({ where: { id }, data: { isActive: true } });
  }

  async updateAcademicYear(id: string, dto: { name?: string; startDate?: string; endDate?: string }) {
    return this.prisma.academicYear.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async deleteAcademicYear(id: string) {
    return this.prisma.academicYear.delete({ where: { id } });
  }

  // Roles
  async getRoles() {
    const { organizationId } = requireTenantContext();
    return this.prisma.role.findMany({
      where: { organizationId },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async createRole(dto: { name: string; description?: string; permissionIds?: string[] }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        organizationId,
        rolePermissions: dto.permissionIds?.length
          ? { create: dto.permissionIds.map((permissionId) => ({ permissionId })) }
          : undefined,
      },
      include: { rolePermissions: { include: { permission: true } } },
    });
  }

  async updateRole(id: string, dto: { name?: string; description?: string; permissionIds?: string[] }) {
    const { organizationId } = requireTenantContext();
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot modify system roles');

    return this.prisma.$transaction(async (tx) => {
      if (dto.permissionIds !== undefined) {
        await tx.rolePermission.deleteMany({ where: { roleId: id } });
        if (dto.permissionIds.length) {
          await tx.rolePermission.createMany({
            data: dto.permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
          });
        }
      }
      return tx.role.update({
        where: { id },
        data: {
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.description !== undefined && { description: dto.description }),
        },
        include: { rolePermissions: { include: { permission: true } } },
      });
    });
  }

  async deleteRole(id: string) {
    const { organizationId } = requireTenantContext();
    const role = await this.prisma.role.findFirst({ where: { id, organizationId } });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('Cannot delete system roles');
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  // Classes & Sections
  async getClasses() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');
    return this.prisma.class.findMany({
      where: { instituteId, isActive: true },
      include: { sections: { where: { isActive: true } }, classSubject: { include: { subject: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async createClass(dto: { name: string; code?: string; order?: number; courseId?: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');
    return this.prisma.class.create({ data: { ...dto, instituteId } });
  }

  async updateClass(id: string, dto: { name?: string; code?: string; order?: number }) {
    return this.prisma.class.update({ where: { id }, data: dto });
  }

  async deleteClass(id: string) {
    return this.prisma.class.update({ where: { id }, data: { isActive: false } });
  }

  async createSection(dto: { name: string; classId: string; capacity?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');
    return this.prisma.section.create({ data: { ...dto, instituteId } });
  }

  async updateSection(id: string, dto: { name?: string; capacity?: number }) {
    return this.prisma.section.update({ where: { id }, data: dto });
  }

  async deleteSection(id: string) {
    return this.prisma.section.update({ where: { id }, data: { isActive: false } });
  }

  // Subjects
  async getSubjects() {
    const { organizationId } = requireTenantContext();
    return this.prisma.subject.findMany({ where: { organizationId, isActive: true } });
  }

  async createSubject(dto: { name: string; code?: string }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.subject.create({ data: { ...dto, organizationId } });
  }

  async updateSubject(id: string, dto: { name?: string; code?: string }) {
    return this.prisma.subject.update({ where: { id }, data: dto });
  }

  async deleteSubject(id: string) {
    return this.prisma.subject.update({ where: { id }, data: { isActive: false } });
  }

  // Courses
  async getCourses() {
    const { organizationId } = requireTenantContext();
    return this.prisma.course.findMany({ where: { organizationId, isActive: true } });
  }

  async createCourse(dto: { name: string; code?: string; description?: string }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.course.create({ data: { ...dto, organizationId } });
  }

  async updateCourse(id: string, dto: { name?: string; code?: string; description?: string }) {
    return this.prisma.course.update({ where: { id }, data: dto });
  }

  async deleteCourse(id: string) {
    return this.prisma.course.update({ where: { id }, data: { isActive: false } });
  }

  // Batches
  async getBatches() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');
    return this.prisma.batch.findMany({ where: { instituteId, isActive: true } });
  }

  async createBatch(dto: { name: string; description?: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');
    return this.prisma.batch.create({ data: { name: dto.name, description: dto.description, instituteId } });
  }

  async updateBatch(id: string, dto: { name?: string; description?: string }) {
    return this.prisma.batch.update({ where: { id }, data: { name: dto.name, description: dto.description } });
  }

  async deleteBatch(id: string) {
    return this.prisma.batch.update({ where: { id }, data: { isActive: false } });
  }

  // WhatsApp Integration
  async getWhatsappConfig() {
    const { organizationId } = requireTenantContext();
    const s = await this.prisma.orgSettings.findUnique({ where: { organizationId } });
    return {
      provider: s?.whatsappProvider ?? null,
      apiKey: s?.whatsappApiKey ? '••••••••' : null, // never return plaintext key
      apiUrl: s?.whatsappApiUrl ?? null,
      templateId: s?.whatsappTemplateId ?? null,
      messageTemplate: s?.whatsappMessageTemplate ?? null,
      configured: !!s?.whatsappApiKey,
    };
  }

  async updateWhatsappConfig(dto: {
    provider?: string;
    apiKey?: string;
    apiUrl?: string;
    templateId?: string;
    messageTemplate?: string;
  }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.orgSettings.upsert({
      where: { organizationId },
      update: {
        whatsappProvider: dto.provider,
        ...(dto.apiKey && dto.apiKey !== '••••••••' && { whatsappApiKey: dto.apiKey }),
        whatsappApiUrl: dto.apiUrl ?? null,
        whatsappTemplateId: dto.templateId ?? null,
        whatsappMessageTemplate: dto.messageTemplate ?? null,
      },
      create: {
        organizationId,
        whatsappProvider: dto.provider,
        whatsappApiKey: dto.apiKey,
        whatsappApiUrl: dto.apiUrl,
        whatsappTemplateId: dto.templateId,
        whatsappMessageTemplate: dto.messageTemplate,
      },
    });
  }

  async disconnectWhatsapp() {
    const { organizationId } = requireTenantContext();
    return this.prisma.orgSettings.update({
      where: { organizationId },
      data: {
        whatsappProvider: null,
        whatsappApiKey: null,
        whatsappApiUrl: null,
        whatsappTemplateId: null,
        whatsappMessageTemplate: null,
      },
    });
  }

  // Student Field Config
  async getStudentFieldConfig() {
    const { organizationId } = requireTenantContext();
    return this.prisma.studentFieldConfig.findMany({
      where: { organizationId, isActive: true },
      orderBy: { order: 'asc' },
    });
  }

  async upsertStudentField(dto: {
    fieldKey: string; label: string; fieldType: string;
    options?: string[]; isMandatory?: boolean; order?: number;
  }) {
    const { organizationId } = requireTenantContext();
    return this.prisma.studentFieldConfig.upsert({
      where: { organizationId_fieldKey: { organizationId, fieldKey: dto.fieldKey } },
      update: dto,
      create: { ...dto, organizationId },
    });
  }
}
