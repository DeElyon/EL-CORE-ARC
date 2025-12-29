import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/ide' })
export class IdeGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('ide-sync')
  handleSync(@MessageBody() payload: any) {
    // ELCODERS Real-time IDE Sync stub
    this.server.emit('ide-sync', payload);
  }
}
