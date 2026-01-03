import { ElitesService } from '../src/elites.service';
const { MediaService } = require('../../../libs/shared-utils/media.service');

const mockPrisma: any = {
  videoClass: { findUnique: jest.fn() },
};

const mockLibrarian: any = {};
const mockWallet: any = { getLedger: () => ({ credit: jest.fn(), debit: jest.fn(), getBalance: jest.fn() }) };

describe('ElitesService video download', () => {
  let svc: ElitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ElitesService(mockPrisma as any, mockLibrarian as any, mockWallet as any);
  });

  it('returns download url for class with media', async () => {
    mockPrisma.videoClass.findUnique.mockResolvedValue({ id: 'vc1', mediaId: 'm1' });
    // Monkey patch MediaService prototype used inside method
    const mediaSvc = require('../../../libs/shared-utils/media.service').MediaService;
    jest.spyOn(mediaSvc.prototype, 'getDownloadUrl').mockResolvedValue('https://cdn.example.com/m1');

    // Replace instance creation inside method temporarily
    svc['getVideoClass'] = async () => ({ id: 'vc1', mediaId: 'm1' } as any);
    const url = await svc.getVideoClassDownload('vc1');
    expect(url).toBeDefined();
  });
});