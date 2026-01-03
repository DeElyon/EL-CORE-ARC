import { Controller, Post, Param, Headers, HttpException, HttpStatus } from '@nestjs/common';
@Controller('media')
export class MediaController {
  constructor(private processing: any) {}

  @Post(':id/complete')
  async uploadComplete(
    @Param('id') id: string,
    @Headers('x-upload-complete-token') token: string,
  ) {
    const expected = process.env.UPLOAD_COMPLETE_TOKEN || 'upload-secret';
    if (!token || token !== expected) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    // Kick off background processing (do not await long-running work)
    this.processing.processMedia(id).catch((err) => {
      console.error('Media processing failed', err);
    });

    return { accepted: true };
  }
}
