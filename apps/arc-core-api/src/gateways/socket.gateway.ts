import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class VerseGateway {
  @WebSocketServer() server: Server;

  @SubscribeMessage('ide:sync')
  handleIdeSync(client: Socket, payload: { projectId: string; delta: any }) {
    // Syncs code for ELCODERS and allows "Shadow Mode" for EL ACCESS
    client.to(payload.projectId).emit('ide:remote_update', payload.delta);
  }

  @SubscribeMessage('nexel:gift')
  async handleGifting(client: Socket, payload: { streamerId: string; giftAmount: number }) {
    // Process real-time WTH Coin tipping
    this.server.to(payload.streamerId).emit('nexel:new_gift', { amount: payload.giftAmount });
  }
}
