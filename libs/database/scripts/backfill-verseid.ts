import { PrismaClient } from '@prisma/client';
import { VerseIdGenerator } from '../../shared-utils/verse-id.util';

async function main() {
  const prisma = new PrismaClient();
  const generator = new VerseIdGenerator((prisma as any));

  const batchSize = 100;
  while (true) {
    const users = await prisma.user.findMany({ where: { verseId: null }, take: batchSize });
    if (users.length === 0) break;

    for (const u of users) {
      try {
        // Choose app based on role mapping
        const app = (() => {
          switch (u.role) {
            case 'DEVELOPER':
              return 'ELCODERS';
            case 'CLIENT':
            case 'COMPANY':
              return 'MY_SPACE';
            case 'INTERN':
              return 'EL_ACCESS';
            case 'TUTOR':
            case 'LEARNER':
            default:
              return 'ELITES';
          }
        })();

        const newVerse = await generator.generate(app);
        await prisma.user.update({ where: { id: u.id }, data: { verseId: newVerse, verseIdGeneratedAt: new Date() } });
        console.log(`Assigned ${newVerse} to ${u.id}`);
      } catch (err) {
        console.error('Failed to assign verseId for', u.id, err);
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
