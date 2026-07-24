import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('employees')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  @RequirePermission('employees:read')
  @ApiOperation({ summary: 'List employees (paginated, searchable)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'department', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'pageSize', required: false })
  findAll(
    @Query('search') search?: string,
    @Query('department') department?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.employeesService.findAll({ search, department, page: Number(page), pageSize: Number(pageSize) });
  }

  @Post()
  @RequirePermission('employees:create')
  @ApiOperation({ summary: 'Create an employee' })
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Get('departments')
  @RequirePermission('employees:read')
  @ApiOperation({ summary: 'List distinct departments' })
  getDepartments() {
    return this.employeesService.getDepartments();
  }
}
