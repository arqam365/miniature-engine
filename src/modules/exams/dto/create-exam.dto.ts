import { IsString, IsOptional, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({ example: 'Midterm Examination 2025' })
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  examTypeId: string;

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

  @ApiProperty({ example: 100 })
  @IsNumber()
  totalMarks: number;

  @ApiProperty({ example: 40 })
  @IsNumber()
  passingMarks: number;
}
