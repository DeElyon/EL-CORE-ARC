import { PrismaService } from '@el-verse/database';
import { MediaService } from './media.service';
import ffmpegPath from 'ffmpeg-static';
import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync, spawn } from 'child_process';

export class ProcessingService {
  constructor(private prisma: PrismaService, private mediaService: MediaService) {}

  private async runFFmpeg(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, args, { stdio: 'inherit' });
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });
      ffmpeg.on('error', reject);
    });
  }

  async processMedia(mediaId: string) {
    await this.mediaService.markProcessing(mediaId);

    const media = await this.mediaService.findById(mediaId);
    if (!media) throw new Error('Media not found');

    // If media is a video, attempt to transcode to a safe H264 mp4 and create a thumbnail
    if (media.type === 'VIDEO') {
      const tmpDir = process.env.TMP_DIR || '/tmp';
      const localIn = path.join(tmpDir, `${media.id}-${path.basename(media.filename)}`);
      const localOut = path.join(tmpDir, `${media.id}-transcoded.mp4`);
      const thumbOut = path.join(tmpDir, `${media.id}-thumb.jpg`);

      // Download from S3 or CDN to local temp if storageKey present
      // NOTE: in production, use streaming and robust streaming transfer; here we assume direct URL access
      const downloadUrl = (await this.mediaService.getDownloadUrl(media.id)) as string;

      // Use curl to fetch file (simple approach) — keep small for demo
      try {
        const { execSync } = await import('child_process');
        execSync(`curl -sS -L -o "${localIn}" "${downloadUrl}"`, { stdio: 'ignore' });
      } catch (err) {
        // If download fails, mark failed
        await this.prisma.media.update({ where: { id: media.id }, data: { status: 'FAILED' } });
        throw err;
      }

      // Run ffmpeg transcode
      await this.runFFmpeg([
        '-i', localIn,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '23',
        '-c:a', 'aac',
        ...(media.duration ? ['-t', media.duration.toString()] : []),
        '-y', // overwrite output files
        localOut
      ]);

      // Generate thumbnail
      await this.runFFmpeg([
        '-i', localOut,
        '-ss', '00:00:05', // seek to 5 seconds
        '-vframes', '1',   // extract 1 frame
        '-vf', 'scale=320:-1', // scale to 320px width, maintain aspect ratio
        '-y', // overwrite output files
        thumbOut
      ]);

      // In real setup we would upload localOut and thumbOut to S3 and record final URLs.
      // For now construct CDN urls based on storageKey.
      const cdn = process.env.CDN_DOMAIN || 'cdn.example.com';
      const url = `https://${cdn}/media/${media.storageKey || media.id}`;
      const thumbnail = `https://${cdn}/media/${media.storageKey || media.id}-thumb.jpg`;

      // cleanup temp files
      try {
        await fs.unlink(localIn).catch(() => {});
        await fs.unlink(localOut).catch(() => {});
        await fs.unlink(thumbOut).catch(() => {});
      } catch {}

      const updated = await this.mediaService.markReady(mediaId, url, thumbnail, { transcoded: true });
      return updated;
    }

    // Non-video: mark ready and keep url derivation
    const cdn = process.env.CDN_DOMAIN || 'cdn.example.com';
    const url = `https://${cdn}/media/${media.storageKey || media.id}`;
    const thumbnail = `https://${cdn}/media/${media.storageKey || media.id}-thumb.jpg`;
    return await this.mediaService.markReady(mediaId, url, thumbnail, { processed: true });
  }
}
