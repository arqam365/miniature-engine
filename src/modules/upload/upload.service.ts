import { Injectable, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    await this.configureBucketCors().catch((e) =>
      this.logger.warn(`R2 CORS setup skipped: ${e.message}`),
    );
  }

  private buildClient() {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY');
    const bucket = this.config.get<string>('R2_BUCKET');
    const publicUrl = this.config.get<string>('R2_PUBLIC_URL');

    if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
      throw new BadRequestException('File storage not configured');
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    return { client, bucket, publicUrl };
  }

  private async configureBucketCors() {
    const { client, bucket } = this.buildClient();
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedMethods: ['PUT'],
              AllowedOrigins: ['*'],
              AllowedHeaders: ['*'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      }),
    );
    this.logger.log('R2 CORS configured');
  }

  async presign(filename: string, contentType: string, folder = 'uploads'): Promise<{ uploadUrl: string; publicUrl: string }> {
    const { client, bucket, publicUrl } = this.buildClient();

    const safeFilename = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.\-_]/g, '');
    const safeFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '').replace(/\/+$/, '');
    const key = `${safeFolder}/${Date.now()}-${safeFilename}`;

    const uploadUrl = await getSignedUrl(
      client,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: 300 },
    );

    return { uploadUrl, publicUrl: `${publicUrl}/${key}` };
  }
}
