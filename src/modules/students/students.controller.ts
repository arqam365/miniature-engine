import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('students')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  @RequirePermission('students:create')
  @ApiOperation({ summary: 'Admit a new student' })
  create(@Body() dto: CreateStudentDto) {
    return this.studentsService.create(dto);
  }

  @Get()
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'List students with filtering & pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'classId', required: false })
  @ApiQuery({ name: 'sectionId', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query() query: any) {
    return this.studentsService.findAll(query);
  }

  @Get(':id')
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'Get student profile with enrollments & guardians' })
  findOne(@Param('id') id: string) {
    return this.studentsService.findOne(id);
  }

  @Put(':id')
  @RequirePermission('students:update')
  @ApiOperation({ summary: 'Update student details' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateStudentDto>) {
    return this.studentsService.update(id, dto);
  }

  @Post(':id/enroll')
  @RequirePermission('students:create')
  @ApiOperation({ summary: 'Enroll student in a class/section/batch' })
  enroll(@Param('id') id: string, @Body() dto: EnrollStudentDto) {
    return this.studentsService.enroll(id, dto);
  }

  @Get(':id/attendance-summary')
  @RequirePermission('students:read')
  @ApiOperation({ summary: 'Get monthly attendance summary for a student' })
  attendanceSummary(
    @Param('id') id: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    return this.studentsService.getAttendanceSummary(id, month, year);
  }

  @Delete(':id')
  @RequirePermission('students:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate student (soft delete)' })
  deactivate(@Param('id') id: string) {
    return this.studentsService.deactivate(id);
  }
}
