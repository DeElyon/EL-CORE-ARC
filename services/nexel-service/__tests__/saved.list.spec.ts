import { NexelService } from '../src/nexel.service';

const mockPrisma: any = {
  savedPost: { findMany: jest.fn() },
};

const mockNelly: any = {};

describe('NexelService saved posts', () => {
  let svc: NexelService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new NexelService(mockPrisma as any, mockNelly as any);
  });

  it('lists saved posts for user', async () => {
    mockPrisma.savedPost.findMany.mockResolvedValue([{ id: 's1', post: { id: 'p1', content: 'hi' } }]);
    const res = await svc.getSavedPosts('u1', 10, 0);
    expect(mockPrisma.savedPost.findMany).toHaveBeenCalled();
    expect(res.length).toBe(1);
  });
});
