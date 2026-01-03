import { AuthBridgeService } from '../auth-bridge.service';

const mockPrisma: any = {
  user: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  wallet: { create: jest.fn() },
};

const mockNotification: any = {
  sendOTP: jest.fn(),
  verifyOTP: jest.fn(),
};

// Mock VerseIdGenerator module imported dynamically
jest.mock('../../shared-utils/verse-id.util', () => ({
  VerseIdGenerator: jest.fn().mockImplementation(() => ({ generate: jest.fn().mockResolvedValue('NEX00000001') })),
}));

describe('AuthBridgeService.register', () => {
  let service: AuthBridgeService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new AuthBridgeService(null as any, mockPrisma as any, mockNotification as any);
    mockPrisma.user.findFirst.mockResolvedValue(null);
    mockNotification.sendOTP.mockResolvedValue('0000');
    mockPrisma.user.create.mockResolvedValue({ id: 'user-1', email: 'j@example.com', username: 'jane', verseId: 'NEX00000001' });
    mockPrisma.wallet.create.mockResolvedValue({ id: 'wallet-1' });
  });

  it('creates a user and assigns a verseId and returns it', async () => {
    const res = await service.register('j@example.com', 'jane', 'pw', 'LEARNER', 'Jane Doe', 'NEXEL');

    expect(mockPrisma.user.findFirst).toHaveBeenCalled();
    expect(mockNotification.sendOTP).toHaveBeenCalledWith('j@example.com', 'jane');
    expect(mockPrisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        email: 'j@example.com',
        username: 'jane',
        fullName: 'Jane Doe',
        verseId: 'NEX00000001',
      }),
    }));

    expect(res).toHaveProperty('verseId', 'NEX00000001');
  });
});
