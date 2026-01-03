import { ElitesService } from '../src/elites.service';

const mockPrisma: any = {
  videoClass: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  media: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

const mockLibrarian: any = {};
const mockWallet: any = { getLedger: () => ({ credit: jest.fn(), debit: jest.fn(), getBalance: jest.fn() }) };

describe('ElitesService - Video Classes', () => {
  let svc: ElitesService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ElitesService(mockPrisma as any, mockLibrarian as any, mockWallet as any);
  });

  it('creates a video class', async () => {
    mockPrisma.videoClass.create.mockResolvedValue({ id: 'vc1', title: 'Intro to Testing' });

    const res = await svc.createVideoClass('ins1', 'Intro to Testing', 'desc');

    expect(mockPrisma.videoClass.create).toHaveBeenCalled();
    expect(res.id).toBe('vc1');
  });

  it('uploads media for class and attaches media', async () => {
    mockPrisma.media.create.mockResolvedValue({ id: 'm1', filename: 'v.mp4' });
    mockPrisma.videoClass.update.mockResolvedValue({ id: 'vc1', mediaId: 'm1' });

    const res = await svc.uploadMediaForClass('vc1', 'user1', 'v.mp4', 'video/mp4', 1000, 'VIDEO');

    expect(mockPrisma.media.create).toHaveBeenCalled();
    expect(mockPrisma.videoClass.update).toHaveBeenCalledWith({ where: { id: 'vc1' }, data: { mediaId: 'm1' } });
    expect(res.media.id).toBe('m1');
    expect(res.signedUploadUrl).toContain('upload/m1');
  });
});
