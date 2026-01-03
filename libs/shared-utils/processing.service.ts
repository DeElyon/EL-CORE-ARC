import { PrismaService } from '@el-verse/database';
import { MediaService } from './media.service';

export class ProcessingService {
  constructor(private prisma: PrismaService, private mediaService: MediaService) {}

  async processMedia(mediaId: string) {
    // mark processing
    await this.mediaService.markProcessing(mediaId);

    // Fetch media and simulate processing (e.g. ffmpeg)
    const media = await this.mediaService.findById(mediaId);
    if (!media) throw new Error('Media not found');

    // Simulate processing delay
    await new Promise((res) => setTimeout(res, 300));

    const cdn = process.env.CDN_DOMAIN || 'cdn.example.com';
    const url = `https://${cdn}/media/${media.storageKey || media.id}`;
    const thumbnail = `https://${cdn}/media/${media.storageKey || media.id}-thumb.jpg`;

    // Mark ready with derived URLs and metadata
    const updated = await this.mediaService.markReady(mediaId, url, thumbnail, { transcoded: true });

    return updated;
  }
}
