import { Injectable, NotFoundException } from '@nestjs/common';
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

  async getAllPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { action: 'asc' }] });
  }

  // Classes & Sections
  async getClasses() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');
    return this.prisma.class.findMany({
      where: { instituteId, isActive: true },
      include: { sections: true, classSubject: { include: { subject: true } } },
      orderBy: { order: 'asc' },
    });
  }

  async createClass(dto: { name: string; code?: string; order?: number; courseId?: string }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');
    return this.prisma.class.create({ data: { ...dto, instituteId } });
  }

  async createSection(dto: { name: string; classId: string; capacity?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new Error('Institute context required');
    return this.prisma.section.create({ data: { ...dto, instituteId } });
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
