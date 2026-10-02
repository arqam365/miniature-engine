import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  constructor(private readonly config: ConfigService) {}

  private buildClient() {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET');
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new BadRequestException('File storage not configured');
    }

    return {
      client: new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      }),
      bucket,
      publicUrl,
    };
  }

  async uploadFile(buffer: Buffer, filename: string, contentType: string, folder = 'uploads'): Promise<{ url: string }> {
    const { client, bucket, publicUrl } = this.buildClient();

    const safe = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '') || `${randomUUID()}.bin`;
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+$/, '');
    const key = `${safeFolder}/${Date.now()}-${safe}`;

    try {
      await client.send(new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType, Body: buffer }));
    } catch (err) {
      this.logger.error('R2 upload failed', err);
      throw new BadRequestException(`Upload failed: ${(err as Error).message}`);
    }

    return { url: `${publicUrl}/${key}` };
  }
}
