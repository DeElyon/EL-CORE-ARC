import { PrismaClient } from '@prisma/client';

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: ts-node scripts/check-media.ts <mediaId>');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const m = await prisma.media.findUnique({ where: { id } });
    if (!m) {
      console.error('Media not found');
      process.exit(2);
    }
    console.log(JSON.stringify(m, null, 2));
  } catch (err) {
    console.error('Error querying media:', err);
    process.exit(3);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
