import { LedgerService } from '../ledger.service';

const mockTx: any = {
  wallet: {
    findUnique: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
  },
  user: { findUnique: jest.fn() },
  transaction: { createMany: jest.fn() },
};

const mockPrisma: any = {
  $transaction: jest.fn((cb: any) => cb(mockTx)),
};

describe('LedgerService.transfer', () => {
  let service: LedgerService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new LedgerService(mockPrisma as any);
    mockTx.wallet.findUnique.mockResolvedValue({ id: 'from-wallet', wthBalance: 100 });
    mockTx.user.findUnique.mockImplementation(({ where: { id } }: any) => {
      if (id === 'from') return Promise.resolve({ verseId: 'NEX00000001', fullName: 'From Name' });
      return Promise.resolve({ verseId: 'NEX00000002', fullName: 'To Name' });
    });
    mockTx.wallet.upsert.mockResolvedValue({ id: 'to-wallet' });
  });

  it('records counterparty verseId and name in transactions', async () => {
    await service.transfer('from', 'to', 10, 'NEXEL' as any, 'desc');

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.transaction.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([
        expect.objectContaining({ counterpartyVerseId: 'NEX00000002', counterpartyName: 'To Name' }),
        expect.objectContaining({ counterpartyVerseId: 'NEX00000001', counterpartyName: 'From Name' }),
      ]),
    }));
  });
});
