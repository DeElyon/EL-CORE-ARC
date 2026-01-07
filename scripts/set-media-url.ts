import { PrismaClient } from '@prisma/client';

async function main() {
  const id = process.argv[2];
  const url = process.argv[3];
  if (!id || !url) {
    console.error('Usage: ts-node scripts/set-media-url.ts <mediaId> <url>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const updated = await prisma.media.update({ where: { id }, data: { url, storageKey: `manual/${id}`, status: 'UPLOADED' } });
    console.log('Updated media:', updated.id, updated.url);
  } catch (err) {
    console.error('Failed to update media:', err);
    process.exit(2);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
