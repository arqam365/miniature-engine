import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { IsArray, IsString, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

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
}
