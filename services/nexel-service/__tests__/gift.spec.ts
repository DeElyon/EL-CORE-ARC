import { NexelService } from '../src/nexel.service';

const mockPrisma: any = {
  user: { findUnique: jest.fn() },
  gift: { create: jest.fn() },
  liveStream: { update: jest.fn() },
};

describe('NexelService.sendGift', () => {
  let service: NexelService;

  beforeEach(() => {
    jest.resetAllMocks();
    const mockNelly: any = {};
    service = new NexelService(mockPrisma as any, mockNelly as any);
    mockPrisma.user.findUnique.mockImplementation(({ where: { id } }: any) => {
      if (id === 'sender') return Promise.resolve({ verseId: 'NEX00000001', fullName: 'Sender' });
      return Promise.resolve({ verseId: 'NEX00000002', fullName: 'Receiver' });
    });
    mockPrisma.gift.create.mockResolvedValue({ id: 'gift-1' });
  });

  it('creates a gift that includes sender and receiver verse snapshots', async () => {
    const gift = await service.sendGift('stream-1', 'sender', 'receiver', 'pulse_sparkle', 5);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
    expect(mockPrisma.gift.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        senderVerseId: 'NEX00000001',
        senderName: 'Sender',
        receiverVerseId: 'NEX00000002',
        receiverName: 'Receiver',
      }),
    }));

    expect(gift).toHaveProperty('id', 'gift-1');
  });
});
