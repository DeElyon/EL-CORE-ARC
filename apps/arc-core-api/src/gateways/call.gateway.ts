import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { CallService } from '../services/call.service';

@Injectable()
@WebSocketGateway({ namespace: 'call', cors: { origin: '*', credentials: true } })
export class CallGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private rooms = new Map<string, Set<string>>(); // roomName -> socketIds

  constructor(private callService: CallService) {}

  handleConnection(client: Socket) {
    console.log('Call client connected', client.id);
  }

  handleDisconnect(client: Socket) {
    this.rooms.forEach((sockets, room) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        this.server.to(room).emit('participant_left', { socketId: client.id });
      }
    });
  }

  @SubscribeMessage('join_call')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string; userId: string }) {
    const { room, userId } = payload;
    await client.join(room);
    if (!this.rooms.has(room)) this.rooms.set(room, new Set());
    this.rooms.get(room)!.add(client.id);
    this.server.to(room).emit('participant_joined', { userId, socketId: client.id });
    return { success: true };
  }

  @SubscribeMessage('leave_call')
  async onLeave(@ConnectedSocket() client: Socket, @MessageBody() payload: { room: string; userId: string }) {
    const { room } = payload;
    await client.leave(room);
    this.rooms.get(room)?.delete(client.id);
    this.server.to(room).emit('participant_left', { socketId: client.id });
    return { success: true };
  }

  @SubscribeMessage('offer')
  async handleOffer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    // payload: { room, sdp, from }
    this.server.to(payload.room).emit('offer', payload);
    return { success: true };
  }

  @SubscribeMessage('answer')
  async handleAnswer(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    this.server.to(payload.room).emit('answer', payload);
    return { success: true };
  }

  @SubscribeMessage('ice')
  async handleIce(@ConnectedSocket() client: Socket, @MessageBody() payload: any) {
    this.server.to(payload.room).emit('ice', payload);
    return { success: true };
  }
}
