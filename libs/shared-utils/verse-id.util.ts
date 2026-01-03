import { PrismaService } from '../database/prisma.service';

const PREFIXES: Record<string, string> = {
  ELCODERS: 'ELC',
  NEXEL: 'NEX',
  EL_ACCESS: 'ELA',
  MY_SPACE: 'MYS',
  ELITES: 'ELI',
};

export class VerseIdGenerator {
  constructor(private prisma: PrismaService) {}

  private randomDigits(length = 8) {
    let s = '';
    for (let i = 0; i < length; i++) s += Math.floor(Math.random() * 10).toString();
    return s;
  }

  public async generate(appKey: string) {
    const prefix = PREFIXES[appKey] || 'ELV';

    // Try up to 5 times to avoid collisions
    for (let i = 0; i < 5; i++) {
      const candidate = `${prefix}${this.randomDigits(8)}`;
      const existing = await this.prisma.user.findFirst({ where: { verseId: candidate } });
      if (!existing) return candidate;
    }

    throw new Error('Failed to generate unique Verse ID');
  }
}
