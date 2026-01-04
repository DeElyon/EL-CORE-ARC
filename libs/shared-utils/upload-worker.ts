import { PrismaService } from '@el-verse/database';
import { MediaService } from './media.service';
import { ProcessingService } from './processing.service';
import * as Sentry from '@sentry/node';
import * as client from 'prom-client';

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const mediaService = new MediaService(prisma as any);
  const processor = new ProcessingService(prisma as any, mediaService as any);

  console.log('Upload worker started — polling for UPLOADED media');

  if (process.env.SENTRY_DSN) Sentry.init({ dsn: process.env.SENTRY_DSN });
  client.collectDefaultMetrics();
  const processedCounter = new client.Counter({ name: 'el_upload_processed_total', help: 'Processed uploads' });


  let running = true;
  process.on('SIGINT', () => (running = false));
  process.on('SIGTERM', () => (running = false));

  while (running) {
    try {
      const pending = await prisma.media.findMany({ where: { status: 'UPLOADED' }, take: 10, orderBy: { createdAt: 'asc' } });
      if (pending.length === 0) {
        await new Promise((r) => setTimeout(r, 3000));
        continue;
      }

      for (const m of pending) {
        try {
          console.log('Processing media', m.id, m.filename);
          await processor.processMedia(m.id);
          console.log('Processed', m.id);
        } catch (err: any) {
          console.error('Failed processing media', m.id, err?.message || err);
          try {
            await prisma.media.update({ where: { id: m.id }, data: { status: 'FAILED' } });
          } catch (e) {
            // ignore
          }
        }
      }
    } catch (err) {
      console.error('Upload worker error', err);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  await prisma.$disconnect();
  console.log('Upload worker stopped');
}

main().catch((err) => {
  console.error('Upload worker failed to start', err);
  process.exit(1);
});
