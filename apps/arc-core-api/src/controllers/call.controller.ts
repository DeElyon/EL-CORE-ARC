import { Controller, Post, Body, Param } from '@nestjs/common';
import { CallService } from '../services/call.service';

@Controller('calls')
export class CallController {
  constructor(private callService: CallService) {}

  @Post()
  async create(@Body() body: { startedById: string; type: 'VIDEO' | 'AUDIO' }) {
    return this.callService.createCall(body.startedById, body.type);
  }

  @Post(':id/join')
  async join(@Param('id') id: string, @Body() body: { userId: string; isHost?: boolean }) {
    return this.callService.joinCall(id, body.userId, !!body.isHost);
  }

  @Post('participant/:id/leave')
  async leave(@Param('id') id: string) {
    return this.callService.leaveCall(id);
  }
}
