import request from 'supertest';
import { MediaController } from '../controllers/media.controller';

const mockProcessing: any = { processMedia: jest.fn().mockResolvedValue({}) };
const mockMediaService: any = { getDownloadUrl: jest.fn().mockResolvedValue('https://cdn.example.com/m1') };

describe('MediaController', () => {
  let ctrl: MediaController;

  beforeEach(() => {
    jest.clearAllMocks();
    ctrl = new MediaController(mockProcessing as any, mockMediaService as any);
  });

  it('rejects without token', async () => {
    try {
      // @ts-ignore
      await ctrl.uploadComplete('m1', undefined);
    } catch (e: any) {
      expect(e.status).toBe(401);
    }
  });

  it('accepts with correct token and kicks off processing', async () => {
    process.env.UPLOAD_COMPLETE_TOKEN = 'tok-123';
    const res = await ctrl.uploadComplete('m1', 'tok-123');
    expect(res.accepted).toBe(true);
    expect(mockProcessing.processMedia).toHaveBeenCalledWith('m1');
  });
});
