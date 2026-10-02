import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkImportRowDto {
  @IsString() admissionNo: string;
  @IsString() firstName: string;
  @IsString() @IsOptional() lastName?: string;
  @IsString() @IsOptional() dateOfBirth?: string;
  @IsString() @IsOptional() gender?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() religion?: string;
  @IsString() @IsOptional() nationality?: string;
  @IsString() @IsOptional() bloodGroup?: string;
  @IsString() @IsOptional() city?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() rationCard?: string;
  @IsString() guardianFirstName: string;
  @IsString() guardianLastName: string;
  @IsString() guardianRelationship: string;
  @IsString() guardianPhone: string;
  @IsString() @IsOptional() guardianWhatsApp?: string;
  @IsString() @IsOptional() guardianEmail?: string;
  @IsString() @IsOptional() guardianOccupation?: string;
  @IsString() @IsOptional() academicYear?: string;
  @IsString() @IsOptional() className?: string;
  @IsString() @IsOptional() section?: string;
  @IsString() @IsOptional() rollNumber?: string;
}

export class BulkImportStudentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportRowDto)
  rows: BulkImportRowDto[];
}
