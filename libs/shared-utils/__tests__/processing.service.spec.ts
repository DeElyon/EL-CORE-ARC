import { ProcessingService } from '../processing.service';

const mockPrisma: any = {};
const mockMediaSvc: any = {
  markProcessing: jest.fn(),
  findById: jest.fn(),
  markReady: jest.fn(),
};

describe('ProcessingService', () => {
  let svc: ProcessingService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new ProcessingService(mockPrisma as any, mockMediaSvc as any);
  });

  it('processes media and marks ready', async () => {
    mockMediaSvc.findById.mockResolvedValue({ id: 'm1', storageKey: 'u/m1/file.mp4' });
    mockMediaSvc.markReady.mockResolvedValue({ id: 'm1', status: 'READY' });

    const res = await svc.processMedia('m1');

    expect(mockMediaSvc.markProcessing).toHaveBeenCalledWith('m1');
    expect(mockMediaSvc.findById).toHaveBeenCalledWith('m1');
    expect(mockMediaSvc.markReady).toHaveBeenCalled();
    expect(res.status).toBe('READY');
  });
});
