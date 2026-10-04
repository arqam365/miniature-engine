import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { requireTenantContext } from '../tenancy/tenant-context';
import { EmploymentStatus } from '@prisma/client';

const EMPLOYEE_SELECT = {
  id: true,
  employeeId: true,
  firstName: true,
  lastName: true,
  designation: true,
  department: true,
  phone: true,
  email: true,
  emergencyContact: true,
  salary: true,
  joinDate: true,
  status: true,
  isActive: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      rolePermissions: {
        select: {
          permission: { select: { id: true, module: true, action: true, description: true } },
        },
      },
    },
  },
};

function formatEmployee(e: any) {
  return {
    ...e,
    joinDate: e.joinDate instanceof Date ? e.joinDate.toISOString() : e.joinDate,
    salary: e.salary != null ? Number(e.salary) : null,
  };
}

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { search?: string; department?: string; page?: number; pageSize?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { instituteId };

    if (params.department) where.department = params.department;

    if (params.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { employeeId: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({ where, skip, take: pageSize, orderBy: { joinDate: 'desc' } }),
      this.prisma.employee.count({ where }),
    ]);

    return { data: data.map(formatEmployee), total, page, pageSize };
  }

  async create(dto: CreateEmployeeDto) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const count = await this.prisma.employee.count({ where: { instituteId } });
    const year = new Date().getFullYear();
    const employeeId = `EMP-${year}-${String(count + 1).padStart(4, '0')}`;

    const employee = await this.prisma.employee.create({
      data: {
        employeeId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        designation: dto.designation,
        department: dto.department,
        phone: dto.phone,
        email: dto.email,
        emergencyContact: dto.emergencyContact,
        salary: dto.salary,
        joinDate: new Date(dto.joinDate),
        instituteId,
      },
    });

    return formatEmployee(employee);
  }

  async findOne(id: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const employee = await this.prisma.employee.findFirst({
      where: { id, instituteId },
      select: EMPLOYEE_SELECT,
    });
    if (!employee) throw new NotFoundException('Employee not found');

    return formatEmployee(employee);
  }

  async update(
    id: string,
    dto: Partial<{
      firstName: string;
      lastName: string;
      designation: string;
      department: string;
      phone: string;
      email: string;
      emergencyContact: string;
      salary: number;
      isActive: boolean;
      status: EmploymentStatus;
      roleId: string | null;
    }>,
  ) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const existing = await this.prisma.employee.findFirst({ where: { id, instituteId } });
    if (!existing) throw new NotFoundException('Employee not found');

    const employee = await this.prisma.employee.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.designation !== undefined && { designation: dto.designation }),
        ...(dto.department !== undefined && { department: dto.department }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.emergencyContact !== undefined && { emergencyContact: dto.emergencyContact }),
        ...(dto.salary !== undefined && { salary: dto.salary }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...('roleId' in dto && { roleId: dto.roleId }),
      },
      select: EMPLOYEE_SELECT,
    });

    return formatEmployee(employee);
  }

  async getDepartments() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const rows = await this.prisma.employee.findMany({
      where: { instituteId, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });

    return rows.map((r) => r.department).filter(Boolean) as string[];
  }

  async getSections(id: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const employee = await this.prisma.employee.findFirst({ where: { id, instituteId } });
    if (!employee) throw new NotFoundException('Employee not found');

    return this.prisma.employeeSection.findMany({
      where: { employeeId: id },
      select: {
        id: true,
        section: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async assignSection(id: string, sectionId: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const [employee, section] = await Promise.all([
      this.prisma.employee.findFirst({ where: { id, instituteId } }),
      this.prisma.section.findFirst({ where: { id: sectionId, instituteId } }),
    ]);
    if (!employee) throw new NotFoundException('Employee not found');
    if (!section) throw new NotFoundException('Section not found');

    const existing = await this.prisma.employeeSection.findUnique({
      where: { employeeId_sectionId: { employeeId: id, sectionId } },
    });
    if (existing) throw new ConflictException('Already assigned to this section');

    return this.prisma.employeeSection.create({
      data: { employeeId: id, sectionId },
      select: {
        id: true,
        section: {
          select: {
            id: true,
            name: true,
            class: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async unassignSection(id: string, sectionId: string) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const record = await this.prisma.employeeSection.findUnique({
      where: { employeeId_sectionId: { employeeId: id, sectionId } },
    });
    if (!record) throw new NotFoundException('Assignment not found');

    await this.prisma.employeeSection.delete({
      where: { employeeId_sectionId: { employeeId: id, sectionId } },
    });

    return { success: true };
  }
}
