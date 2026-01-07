import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();
  const email = process.argv[2] || `test+${Date.now()}@example.com`;
  const username = process.argv[3] || `testuser${Date.now() % 10000}`;
  const password = process.argv[4] || 'Password123!';

  const passwordHash = await bcrypt.hash(password, 10);

  // Simple verseId for test
  const verseId = `TST${Math.floor(Math.random() * 10000000)}`;

  const user = await prisma.user.create({
    data: {
      email,
      username,
      passwordHash,
      role: 'LEARNER',
      displayName: username,
      verseId,
      isEmailVerified: true,
    },
  });

  await prisma.wallet.create({ data: { userId: user.id, wthBalance: 0, escrowBalance: 0 } });

  console.log(JSON.stringify({ email, username, password, userId: user.id }));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
