import { IsEmail, IsString, MinLength, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'admin@school.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'Ahmad' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'Al Noor Educational Trust' })
  @IsString()
  organizationName: string;

  @ApiProperty({ example: 'al-noor-trust' })
  @IsString()
  organizationSlug: string;

  @ApiProperty({ enum: OrgType, default: OrgType.SCHOOL })
  @IsEnum(OrgType)
  organizationType: OrgType;
}
