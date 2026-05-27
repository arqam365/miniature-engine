import { IsString, IsEmail, IsEnum, MinLength, IsNotEmpty } from 'class-validator';
import { OrgType } from '@prisma/client';

export class OnboardOrgDto {
  @IsString() @IsNotEmpty() orgName: string;
  @IsEnum(OrgType) orgType: OrgType;
  @IsString() @IsNotEmpty() orgSlug: string;
  @IsString() @IsNotEmpty() adminFirstName: string;
  @IsString() @IsNotEmpty() adminLastName: string;
  @IsEmail() adminEmail: string;
  @IsString() @MinLength(8) adminPassword: string;
}
