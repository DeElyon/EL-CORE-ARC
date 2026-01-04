import { Queue, Worker, QueueScheduler, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaService } from '@el-verse/database';
import { MediaService } from './media.service';
import { ProcessingService } from './processing.service';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const queueName = process.env.MEDIA_QUEUE_NAME || 'media-processing';

async function start() {
  const prisma = new PrismaService();
  await prisma.$connect();

  const mediaService = new MediaService(prisma as any);
  const processing = new ProcessingService(prisma as any, mediaService as any);

  const queue = new Queue(queueName, { connection });
  new QueueScheduler(queueName, { connection });

  const worker = new Worker(
    queueName,
    async (job: Job) => {
      const { mediaId } = job.data as { mediaId: string };
      console.log('[queue] processing media', mediaId);
      try {
        await processing.processMedia(mediaId);
        console.log('[queue] done', mediaId);
      } catch (err: any) {
        console.error('[queue] failed', mediaId, err?.message || err);
        throw err;
      }
    },
    { connection },
  );

  worker.on('completed', (job) => console.log('[queue] job completed', job.id));
  worker.on('failed', (job, err) => console.error('[queue] job failed', job?.id, err?.message || err));

  // Enqueue currently uploaded media on startup
  const pending = await prisma.media.findMany({ where: { status: 'UPLOADED' }, orderBy: { createdAt: 'asc' } });
  for (const m of pending) {
    await queue.add('process', { mediaId: m.id }, { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
  }

  console.log('Queue worker running, waiting for media jobs...');

  process.on('SIGINT', async () => {
    console.log('Shutting down queue worker');
    await worker.close();
    await queue.close();
    await connection.quit();
    await prisma.$disconnect();
    process.exit(0);
  });
}

start().catch((err) => {
  console.error('Queue worker error', err);
  process.exit(1);
});
