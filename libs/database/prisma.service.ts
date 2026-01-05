import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    if (process.env.SKIP_DB === 'true') {
      console.warn('SKIP_DB=true — skipping Prisma connect (dev only)');
      return;
    }

    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Shutdown hook will be handled by NestJS
  }
}
