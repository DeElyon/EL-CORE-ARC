import { VerseIdGenerator } from '../verse-id.util';

// Minimal mock of PrismaService
const mockPrisma: any = {
  user: {
    findFirst: jest.fn(),
  },
};

describe('VerseIdGenerator', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('generates a verse id with expected prefix', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    const gen = new VerseIdGenerator(mockPrisma as any);
    const id = await gen.generate('NEXEL');
    expect(id.startsWith('NEX')).toBe(true);
    expect(id.length).toBe(11); // 3 + 8
  });

  it('retries on collision and throws if too many collisions', async () => {
    // make findFirst return something 5 times
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'ex' });
    const gen = new VerseIdGenerator(mockPrisma as any);
    await expect(gen.generate('ELITES')).rejects.toThrow('Failed to generate unique Verse ID');
  });
});
