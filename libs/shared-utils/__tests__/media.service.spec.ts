import { MediaService } from '../media.service';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

jest.mock('@aws-sdk/s3-request-presigner', () => ({ getSignedUrl: jest.fn().mockResolvedValue('https://signed-url.example.com') }));

const mockPrisma: any = {
  media: {
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('MediaService', () => {
  let svc: MediaService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.S3_BUCKET = 'test-bucket';
    svc = new MediaService(mockPrisma as any);
  });

  it('creates upload record and returns signed URL', async () => {
    mockPrisma.media.create.mockResolvedValue({ id: 'm1', filename: 'video.mp4' });
    mockPrisma.media.update.mockResolvedValue({ id: 'm1', storageKey: 'user1/m1/video.mp4' });

    const res = await svc.createUploadRecord('user1', 'NEXEL', 'video.mp4', 'video/mp4', 1024, 'VIDEO');

    expect(mockPrisma.media.create).toHaveBeenCalled();
    expect(res.media.id).toBe('m1');
    expect(res.signedUploadUrl).toBe('https://signed-url.example.com');
    expect(res.uploadMethod).toBe('PUT');
  });

  it('marks media as processing', async () => {
    mockPrisma.media.update.mockResolvedValue({ id: 'm1', status: 'PROCESSING' });

    const res = await svc.markProcessing('m1');

    expect(mockPrisma.media.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { status: 'PROCESSING' } });
    expect(res.status).toBe('PROCESSING');
  });

  it('marks media as ready with url and thumbnail', async () => {
    mockPrisma.media.update.mockResolvedValue({ id: 'm1', status: 'READY', url: 'https://cdn.example.com/m1' });

    const res = await svc.markReady('m1', 'https://cdn.example.com/m1', 'https://cdn.example.com/m1-thumb');

    expect(mockPrisma.media.update).toHaveBeenCalled();
    expect(res.status).toBe('READY');
  });

  it('returns download url', async () => {
    mockPrisma.media.findUnique.mockResolvedValue({ id: 'm1', url: 'https://cdn.example.com/m1' });

    const url = await svc.getDownloadUrl('m1');

    expect(mockPrisma.media.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });
    expect(url).toBe('https://cdn.example.com/m1');
  });
});
