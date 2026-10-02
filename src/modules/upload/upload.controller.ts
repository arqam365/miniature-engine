import { Controller, Get, Post, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { UploadService } from './upload.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Get('presign')
  @RequirePermission('students:create')
  @ApiQuery({ name: 'filename', required: true })
  @ApiQuery({ name: 'contentType', required: true })
  @ApiQuery({ name: 'folder', required: false })
  presign(
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @Query('folder') folder?: string,
  ) {
    return this.uploadService.presign(filename, contentType, folder);
  }

  @Post()
  @RequirePermission('students:create')
  @ApiConsumes('multipart/form-data')
  @ApiQuery({ name: 'folder', required: false })
  async upload(@Req() req: FastifyRequest, @Query('folder') folder?: string) {
    const file = await req.file();
    if (!file) throw new BadRequestException('No file provided');
    const buffer = await file.toBuffer();
    return this.uploadService.uploadFile(buffer, file.filename, file.mimetype, folder);
  }
}
