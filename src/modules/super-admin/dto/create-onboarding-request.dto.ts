import { IsString, IsEmail, IsEnum, IsOptional, IsInt, Min, IsNotEmpty } from 'class-validator';
import { OrgType } from '@prisma/client';

export class CreateOnboardingRequestDto {
  @IsString() @IsNotEmpty() orgName: string;
  @IsEnum(OrgType) orgType: OrgType;
  @IsString() @IsNotEmpty() contactName: string;
  @IsEmail() contactEmail: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsInt() @Min(1) estimatedStudents?: number;
  @IsOptional() @IsString() message?: string;
}
