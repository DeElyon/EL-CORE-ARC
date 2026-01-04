import { Controller, Get, Param } from '@nestjs/common';
import { RecordingService } from '@el-verse/shared-utils';

@Controller('recordings')
export class RecordingsController {
  constructor(private recordingService: RecordingService) {}

  @Get('call/:callId')
  async listForCall(@Param('callId') callId: string) {
    return this.recordingService.listForCall(callId);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.recordingService.getRecording(id);
  }
}
