import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SwitchInstituteDto {
  @ApiProperty({ description: 'Target institute ID to switch context to' })
  @IsString()
  @IsNotEmpty()
  instituteId: string;
}
