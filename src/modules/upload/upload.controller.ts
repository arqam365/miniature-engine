import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';
import { UploadService } from './upload.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

class UploadBodyDto {
  @IsString() data: string;
  @IsString() filename: string;
  @IsString() contentType: string;
  @IsString() @IsOptional() folder?: string;
}

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @RequirePermission('students:create')
  async upload(@Body() body: UploadBodyDto) {
    const buffer = Buffer.from(body.data, 'base64');
    if (buffer.length === 0) throw new BadRequestException('Empty file');
    return this.uploadService.uploadFile(buffer, body.filename, body.contentType, body.folder);
  }
}
