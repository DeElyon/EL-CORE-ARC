import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';

@Injectable()
@WebSocketGateway({
  namespace: 'chat',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove user from map
    this.userSockets.forEach((socketId, userId) => {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
      }
    });
  }

  @SubscribeMessage('register_user')
  async handleRegisterUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId: string },
  ) {
    const { userId } = payload;
    this.userSockets.set(userId, client.id);
    return { success: true, userId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      senderId: string;
      receiverId: string;
      content: string;
    },
  ) {
    const { senderId, receiverId, content } = payload;

    // Save message to database
    const message = await this.prisma.message.create({
      data: {
        senderId,
        receiverId,
        content,
        isEncrypted: true,
        isRead: false,
      },
    });

    // Send to receiver if online
    const receiverSocketId = this.userSockets.get(receiverId);
    if (receiverSocketId) {
      this.server.to(receiverSocketId).emit('new_message', {
        id: message.id,
        senderId,
        content,
        createdAt: message.createdAt,
      });
    }

    // Confirm to sender
    return { success: true, messageId: message.id };
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() payload: { messageId: string; userId: string },
  ) {
    const { messageId, userId } = payload;

    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (message && message.receiverId === userId) {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { isRead: true },
      });
    }

    return { success: true };
  }
}
