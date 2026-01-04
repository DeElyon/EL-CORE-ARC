import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const connection = new IORedis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
const queueName = process.env.MEDIA_QUEUE_NAME || 'media-processing';

export const mediaQueue = new Queue(queueName, { connection });

export async function enqueueMedia(mediaId: string) {
  return mediaQueue.add('process', { mediaId }, { removeOnComplete: true, attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
}

export async function closeQueue() {
  await mediaQueue.close();
  await connection.quit();
}
