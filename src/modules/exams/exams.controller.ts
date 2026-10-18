import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { IsArray, IsString, IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MarkEntryDto {
  @ApiProperty() @IsString() studentId: string;
  @ApiProperty() @IsString() subjectId: string;
  @ApiProperty() @IsNumber() marksObtained: number;
}
class EnterMarksDto {
  @ApiProperty({ type: [MarkEntryDto] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => MarkEntryDto)
  entries: MarkEntryDto[];
}
class AddClassDto {
  @ApiProperty() @IsString() classId: string;
}
class AddSubjectDto {
  @ApiProperty() @IsString() subjectId: string;
}
class ComponentDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsString() type: string;
  @ApiProperty() @IsString() category: string;
  @ApiProperty() @IsNumber() maxMarks: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() passingMarks?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() weightPercent?: number;
}

@ApiTags('exams')
@ApiBearerAuth('access-token')
@UseGuards(RbacGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @RequirePermission('exams:create')
  @ApiOperation({ summary: 'Create a new exam' })
  create(@Body() dto: CreateExamDto) {
    return this.examsService.create(dto);
  }

  @Get()
  @RequirePermission('exams:read')
  @ApiOperation({ summary: 'List all exams for the institute' })
  findAll() {
    return this.examsService.findAll();
  }

  @Get(':id')
  @RequirePermission('exams:read')
  @ApiOperation({ summary: 'Get exam details' })
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Post(':id/marks')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Enter marks for students' })
  enterMarks(@Param('id') id: string, @Body() dto: EnterMarksDto) {
    return this.examsService.enterMarks(id, dto.entries);
  }

  @Post(':id/publish')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Publish exam results' })
  publishResults(@Param('id') id: string) {
    return this.examsService.publishResults(id);
  }

  @Get(':id/ranking')
  @RequirePermission('exams:read')
  @ApiOperation({ summary: 'Get student ranking for an exam' })
  getRanking(@Param('id') id: string) {
    return this.examsService.getRanking(id);
  }

  // ── Structure endpoints ────────────────────────────────────────────────

  @Get(':id/config')
  @RequirePermission('exams:read')
  @ApiOperation({ summary: 'Get exam structure config (classes, subjects, components)' })
  getExamConfig(@Param('id') id: string) {
    return this.examsService.getExamConfig(id);
  }

  @Post(':id/classes')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Add a class to an exam' })
  addClassToExam(@Param('id') id: string, @Body() dto: AddClassDto) {
    return this.examsService.addClassToExam(id, dto.classId);
  }

  @Delete(':id/classes/:classId')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Remove a class (and its subjects/components) from an exam' })
  removeClassFromExam(@Param('id') id: string, @Param('classId') classId: string) {
    return this.examsService.removeClassFromExam(id, classId);
  }

  @Post(':id/classes/:examClassId/subjects')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Add a subject to an exam class' })
  addSubjectToExamClass(@Param('examClassId') examClassId: string, @Body() dto: AddSubjectDto) {
    return this.examsService.addSubjectToExamClass(examClassId, dto.subjectId);
  }

  @Delete(':id/subjects/:examSubjectId')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Remove a subject (and its components) from an exam class' })
  removeExamSubject(@Param('examSubjectId') examSubjectId: string) {
    return this.examsService.removeExamSubject(examSubjectId);
  }

  @Post(':id/subjects/:examSubjectId/components')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Add a component to an exam subject' })
  addComponent(@Param('examSubjectId') examSubjectId: string, @Body() dto: ComponentDto) {
    return this.examsService.addComponent(examSubjectId, dto);
  }

  @Put(':id/components/:componentId')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Update an exam component' })
  updateComponent(@Param('componentId') componentId: string, @Body() dto: ComponentDto) {
    return this.examsService.updateComponent(componentId, dto);
  }

  @Delete(':id/components/:componentId')
  @RequirePermission('exams:update')
  @ApiOperation({ summary: 'Delete an exam component' })
  deleteComponent(@Param('componentId') componentId: string) {
    return this.examsService.deleteComponent(componentId);
  }
}
