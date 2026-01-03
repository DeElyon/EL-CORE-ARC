import { Injectable } from '@nestjs/common';
import { PrismaService } from '@el-verse/database';
import crypto from 'crypto';

@Injectable()
export class CallService {
  constructor(private prisma: PrismaService) {}

  async createCall(startedById: string, type: 'VIDEO' | 'AUDIO') {
    const uuid = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`;
    const roomName = `call-${uuid.slice(0, 8)}`;
    return this.prisma.callSession.create({
      data: { startedById, roomName, appSource: 'NEXEL' as any, type, status: 'ACTIVE' },
    });
  }

  async joinCall(callId: string, userId: string, isHost = false) {
    const participant = await this.prisma.callParticipant.create({
      data: { callId, userId, isHost },
    });
    return participant;
  }

  async leaveCall(participantId: string) {
    return this.prisma.callParticipant.update({ where: { id: participantId }, data: { leftAt: new Date() } });
  }

  async getCall(callId: string) {
    return this.prisma.callSession.findUnique({ where: { id: callId }, include: { participants: true } });
  }
}
