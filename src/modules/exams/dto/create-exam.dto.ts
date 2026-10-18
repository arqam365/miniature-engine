import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: 'Midterm Examination 2025' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  examTypeId?: string;

  @ApiProperty()
  @IsString()
  academicYearId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  gradeSchemaId?: string;

  @ApiProperty({ example: '2025-05-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2025-05-10' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ example: 100 })
  @IsNumber()
  @IsOptional()
  totalMarks?: number;

  @ApiPropertyOptional({ example: 40 })
  @IsNumber()
  @IsOptional()
  passingMarks?: number;
}
