import { PrismaClient, AppSource, PostType, MediaType, MediaStatus, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running DB seed...');

  // Create demo users
  const users = [
    { email: 'alice@example.com', username: 'alice', passwordHash: 'hashed', role: 'LEARNER' },
    { email: 'bob@example.com', username: 'bob', passwordHash: 'hashed', role: 'DEVELOPER' },
    { email: 'carol@example.com', username: 'carol', passwordHash: 'hashed', role: 'INTERN' },
  ];

  for (const u of users) {
    const exists = await prisma.user.findUnique({ where: { email: u.email } });
    if (!exists) {
      const created = await prisma.user.create({ data: { email: u.email, username: u.username, passwordHash: u.passwordHash, role: u.role as any, displayName: u.username } });
      await prisma.wallet.create({ data: { userId: created.id, wthBalance: 0, escrowBalance: 0 } });
    }
  }

  // Example media
  const alice = await prisma.user.findUnique({ where: { email: 'alice@example.com' } });
  if (alice) {
    const media = await prisma.media.create({ data: { uploaderId: alice.id, appSource: AppSource.NEXEL, type: MediaType.IMAGE, status: MediaStatus.READY, filename: 'example.jpg', mimeType: 'image/jpeg', size: 12345, url: 'https://cdn.example.com/media/example.jpg', storageKey: `${alice.id}/example.jpg` } });

    // Example post
    await prisma.post.create({ data: { authorId: alice.id, content: 'Hello EL VERSE!', mediaUrl: media.url, mediaType: 'image', type: PostType.CONTENT } });
  }

  // Example livestream
  const bob = await prisma.user.findUnique({ where: { email: 'bob@example.com' } });
  if (bob) {
    await prisma.liveStream.create({ data: { streamerId: bob.id, title: 'Demo Stream', description: 'Streaming demo content', isLive: false } });
  }

  // Example video class
  const carol = await prisma.user.findUnique({ where: { email: 'carol@example.com' } });
  if (carol) {
    await prisma.videoClass.create({ data: { instructorId: carol.id, title: 'Intro to Interning', description: 'Walkthrough for interns', isLive: false } });
  }

  console.log('DB seed finished');
}

main()
  .catch((e) => {
    console.error('Seed error', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
