import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ namespace: '/stream' })
export class StreamGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('stream-event')
  handleStream(@MessageBody() payload: any) {
    // NEXEL Live Stream logic stub
    this.server.emit('stream-event', payload);
  }
}
