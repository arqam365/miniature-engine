import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { requireTenantContext } from '../tenancy/tenant-context';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { search?: string; department?: string; page?: number; pageSize?: number }) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: any = { instituteId, isActive: true };

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
      this.prisma.employee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { joinDate: 'desc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: data.map((e) => ({
        ...e,
        joinDate: e.joinDate.toISOString(),
        salary: e.salary ? Number(e.salary) : null,
      })),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateEmployeeDto) {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    // Generate employee ID: EMP-YYYY-NNNNN
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

    return { ...employee, joinDate: employee.joinDate.toISOString(), salary: employee.salary ? Number(employee.salary) : null };
  }

  async getDepartments() {
    const { instituteId } = requireTenantContext();
    if (!instituteId) throw new BadRequestException('X-Institute-Id header required');

    const rows = await this.prisma.employee.findMany({
      where: { instituteId, isActive: true, department: { not: null } },
      select: { department: true },
      distinct: ['department'],
      orderBy: { department: 'asc' },
    });

    return rows.map((r) => r.department).filter(Boolean) as string[];
  }
}
