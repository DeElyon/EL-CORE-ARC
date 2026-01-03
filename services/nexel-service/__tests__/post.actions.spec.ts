import { NexelService } from '../src/nexel.service';

const mockPrisma: any = {
  post: { findUnique: jest.fn() },
  media: { findFirst: jest.fn() },
  postShare: { create: jest.fn() },
  savedPost: { findUnique: jest.fn(), create: jest.fn(), delete: jest.fn(), findMany: jest.fn() },
};

const mockNelly: any = {};
const mockMediaSvc: any = { getDownloadUrl: jest.fn().mockResolvedValue('https://cdn.example.com/m1') };

describe('NexelService post actions', () => {
  let svc: NexelService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new NexelService(mockPrisma as any, mockNelly as any, mockMediaSvc as any);
  });

  it('saves a post', async () => {
    mockPrisma.savedPost.create.mockResolvedValue({ id: 's1' });
    const res = await svc.savePost('u1', 'p1');
    expect(mockPrisma.savedPost.create).toHaveBeenCalledWith({ data: { postId: 'p1', userId: 'u1' } });
  });

  it('unsaves a post when exists', async () => {
    mockPrisma.savedPost.findUnique.mockResolvedValue({ id: 's1' });
    mockPrisma.savedPost.delete.mockResolvedValue({ id: 's1' });

    const res = await svc.unsavePost('u1', 'p1');
    expect(mockPrisma.savedPost.findUnique).toHaveBeenCalled();
    expect(res.removed).toBe(true);
  });

  it('reposts a post', async () => {
    mockPrisma.postShare.create.mockResolvedValue({ id: 'ps2' });
    const res = await svc.repost('u1', 'p1');
    expect(mockPrisma.postShare.create).toHaveBeenCalledWith({ data: { postId: 'p1', userId: 'u1' } });
  });

  it('gets download url for post with media mapped to media table', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 'p1', mediaUrl: 'https://cdn.example.com/m1' });
    mockPrisma.media.findFirst.mockResolvedValue({ id: 'm1' });

    const url = await svc.getPostDownloadUrl('p1');
    expect(mockPrisma.media.findFirst).toHaveBeenCalled();
    expect(mockMediaSvc.getDownloadUrl).toHaveBeenCalledWith('m1');
    expect(url).toBe('https://cdn.example.com/m1');
  });

  it('falls back to direct mediaUrl when not mapped', async () => {
    mockPrisma.post.findUnique.mockResolvedValue({ id: 'p2', mediaUrl: 'https://other-host/file.mp4' });
    mockPrisma.media.findFirst.mockResolvedValue(null);

    const url = await svc.getPostDownloadUrl('p2');
    expect(url).toBe('https://other-host/file.mp4');
  });
});
