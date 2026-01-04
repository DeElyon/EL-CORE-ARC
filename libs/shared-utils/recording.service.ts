import { PrismaService } from '@el-verse/database';

export class RecordingService {
  constructor(private prisma: PrismaService) {}

  async listForCall(callId: string) {
    return this.prisma.recording.findMany({ where: { callId }, include: { media: true } });
  }

  async getRecording(id: string) {
    return this.prisma.recording.findUnique({ where: { id }, include: { media: true } });
  }
}
