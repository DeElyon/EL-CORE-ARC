import { CallService } from '../services/call.service';

const mockPrisma: any = {
  callSession: { create: jest.fn(), findUnique: jest.fn() },
  callParticipant: { create: jest.fn(), update: jest.fn() },
};

describe('CallService', () => {
  let svc: CallService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new CallService(mockPrisma as any);
  });

  it('creates a call', async () => {
    mockPrisma.callSession.create.mockResolvedValue({ id: 'c1', roomName: 'room1' });
    const res = await svc.createCall('u1', 'VIDEO');
    expect(res.roomName).toBe('room1');
  });

  it('joins and leaves call', async () => {
    mockPrisma.callParticipant.create.mockResolvedValue({ id: 'p1', callId: 'c1', userId: 'u1' });
    mockPrisma.callParticipant.update.mockResolvedValue({ id: 'p1', leftAt: new Date() });

    const p = await svc.joinCall('c1', 'u1');
    expect(p.id).toBe('p1');

    const l = await svc.leaveCall('p1');
    expect(l.leftAt).toBeDefined();
  });
});