import { PrismaService } from '@el-verse/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';

export class MediaService {
  private s3: S3Client | null = null;
  private bucket: string | undefined = process.env.S3_BUCKET;

  constructor(private prisma: PrismaService) {}

  private getS3() {
    if (!this.s3) {
      const region = process.env.S3_REGION || 'us-east-1';
      this.s3 = new S3Client({ region });
    }
    return this.s3;
  }

  async createUploadRecord(
    uploaderId: string,
    appSource: string,
    filename: string,
    mimeType: string,
    size: number,
    type: string,
    metadata?: any,
  ) {
    const media = await this.prisma.media.create({
      data: {
        uploaderId,
        appSource: appSource as any,
        filename,
        mimeType,
        size,
        type: type as any,
        metadata: metadata || {},
        status: 'UPLOADED',
      },
    });

    // Build a storage key and persist it
    const storageKey = `${uploaderId}/${media.id}/${path.basename(filename)}`;
    await this.prisma.media.update({ where: { id: media.id }, data: { storageKey } });

    // Generate a presigned PUT URL for direct upload
    let signedUploadUrl = `https://storage.example.com/upload/${media.id}`;
    if (this.bucket) {
      const s3 = this.getS3();
      const cmd = new PutObjectCommand({ Bucket: this.bucket, Key: storageKey, ContentType: mimeType });
      signedUploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 }); // 15 minutes
    }

    return { media: { ...media, storageKey }, signedUploadUrl, uploadMethod: 'PUT' };
  }

  async markProcessing(mediaId: string) {
    return await this.prisma.media.update({ where: { id: mediaId }, data: { status: 'PROCESSING' } });
  }

  async markReady(mediaId: string, url: string, thumbnailUrl?: string, metadata?: any) {
    return await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        status: 'READY',
        url,
        thumbnailUrl: thumbnailUrl || undefined,
        metadata: metadata || undefined,
      },
    });
  }

  async getDownloadUrl(mediaId: string) {
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) throw new Error('Media not found');
    // If a public URL is stored, return it; otherwise derive from storageKey
    if (media.url) return media.url;
    const cdnDomain = process.env.CDN_DOMAIN || 'cdn.example.com';

    // If we have an S3 bucket configured, generate a signed GET URL
    if (this.bucket && media.storageKey) {
      const s3 = this.getS3();
      const { GetObjectCommand } = await import('@aws-sdk/client-s3');
      const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: media.storageKey });
      try {
        const signed = await getSignedUrl(s3, cmd, { expiresIn: 300 }); // 5 minutes
        return signed;
      } catch (err) {
        // fallback to CDN url
        return `https://${cdnDomain}/media/${media.storageKey}`;
      }
    }

    return `https://${cdnDomain}/media/${media.storageKey || media.id}`;
  }

  async findById(mediaId: string) {
    return this.prisma.media.findUnique({ where: { id: mediaId } });
  }
}
