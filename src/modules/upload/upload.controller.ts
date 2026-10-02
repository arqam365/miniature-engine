import { Controller, Post, Query, Req, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery, ApiConsumes } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';

@ApiTags('upload')
@ApiBearerAuth('access-token')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @RequirePermission('students:create')
  @ApiConsumes('application/octet-stream', 'image/*')
  @ApiQuery({ name: 'filename', required: true })
  @ApiQuery({ name: 'contentType', required: true })
  @ApiQuery({ name: 'folder', required: false })
  async upload(
    @Req() req: any,
    @Query('filename') filename: string,
    @Query('contentType') contentType: string,
    @Query('folder') folder?: string,
  ) {
    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      throw new BadRequestException('Empty or invalid file body');
    }
    return this.uploadService.uploadFile(body, filename, contentType, folder);
  }
}
