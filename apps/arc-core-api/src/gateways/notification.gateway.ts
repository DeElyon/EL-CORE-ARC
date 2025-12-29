import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/notifications' })
export class NotificationGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('notify')
  handleNotify(@MessageBody() payload: any) {
    // Multi-app global alerts stub
    this.server.emit('notify', payload);
  }
}
