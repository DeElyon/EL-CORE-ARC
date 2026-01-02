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
  namespace: 'notifications',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private userSockets: Map<string, string> = new Map(); // userId -> socketId

  constructor(private prisma: PrismaService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to notifications: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
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

  /**
   * Send notification to a user
   * This is called by services, not via WebSocket
   */
  async sendNotification(
    userId: string,
    type: string,
    title: string,
    message: string,
    appSource: string,
    relatedId?: string,
  ) {
    // Save to database
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type: type as any,
        title,
        message,
        appSource: appSource as any,
        relatedId,
        isRead: false,
      },
    });

    // Send via WebSocket if user is online
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('notification', {
        id: notification.id,
        type,
        title,
        message,
        appSource,
        relatedId,
        createdAt: notification.createdAt,
      });
    }

    return notification;
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() payload: { notificationId: string; userId: string },
  ) {
    const { notificationId, userId } = payload;

    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (notification && notification.userId === userId) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });
    }

    return { success: true };
  }

  @SubscribeMessage('get_unread')
  async handleGetUnread(
    @MessageBody() payload: { userId: string },
  ) {
    const { userId } = payload;

    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        isRead: false,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { notifications };
  }
}
