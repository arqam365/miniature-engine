import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
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
}
