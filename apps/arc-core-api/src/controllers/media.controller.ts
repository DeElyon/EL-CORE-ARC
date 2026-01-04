import { Controller, Post, Param, Headers, HttpException, HttpStatus, Get } from '@nestjs/common';
import { ProcessingService, MediaService, enqueueMedia } from '@el-verse/shared-utils';

@Controller('media')
export class MediaController {
  constructor(private processing: ProcessingService, private mediaService: MediaService) {}

  @Post(':id/complete')
  async uploadComplete(
    @Param('id') id: string,
    @Headers('x-upload-complete-token') token: string,
  ) {
    const expected = process.env.UPLOAD_COMPLETE_TOKEN || 'upload-secret';
    if (!token || token !== expected) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Enqueue media for processing via the queue worker
    try {
      await enqueueMedia(id);
    } catch (err) {
      // As a fallback, trigger processing directly but do not block the request
      this.processing.processMedia(id).catch((e) => console.error('Fallback processing failed', e));
    }

    return { accepted: true };
  }

  @Get(':id/download')
  async getDownload(@Param('id') id: string) {
    try {
      const url = await this.mediaService.getDownloadUrl(id);
      return { url };
    } catch (err) {
      throw new HttpException('Not found', HttpStatus.NOT_FOUND);
    }
  }

  @Post('initiate')
  async initiateUpload(@Body() body: { uploaderId: string; appSource: string; filename: string; mimeType: string; size: number; type: string; metadata?: any }) {
    const res = await this.mediaService.createUploadRecord(
      body.uploaderId,
      body.appSource,
      body.filename,
      body.mimeType,
      body.size,
      body.type,
      body.metadata,
    );
    return res;
  }
}
