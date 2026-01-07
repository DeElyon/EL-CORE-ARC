import request from 'supertest';
import { MediaController } from '../controllers/media.controller';
import * as sharedUtils from '@el-verse/shared-utils';

const mockProcessing: any = { processMedia: jest.fn().mockResolvedValue({}) };
const mockMediaService: any = { getDownloadUrl: jest.fn().mockResolvedValue('https://cdn.example.com/m1') };

jest.mock('@el-verse/shared-utils', () => ({
  enqueueMedia: jest.fn().mockResolvedValue({}),
}));

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
    expect(sharedUtils.enqueueMedia).toHaveBeenCalledWith('m1');
  });
});
