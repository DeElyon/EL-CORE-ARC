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
import { PrismaService } from '@el-verse/database';
import { ChatService } from '@el-verse/shared-utils';

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
  private roomSockets: Map<string, Set<string>> = new Map(); // roomId -> Set<socketId>

  constructor(
    private prisma: PrismaService,
    private chatService: ChatService,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to chat: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.userSockets.forEach((socketId, userId) => {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
      }
    });

    // Remove from room sockets
    this.roomSockets.forEach((sockets, roomId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.roomSockets.delete(roomId);
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

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; userId: string },
  ) {
    const { roomId, userId } = payload;

    // Verify user is member of room
    try {
      const rooms = await this.chatService.getUserRooms(userId);
      const room = rooms.find(r => r.room.id === roomId);

      if (!room) {
        return { error: 'Not authorized to join this room' };
      }

      client.join(roomId);

      if (!this.roomSockets.has(roomId)) {
        this.roomSockets.set(roomId, new Set());
      }
      this.roomSockets.get(roomId)?.add(client.id);

      return { success: true, roomId };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string },
  ) {
    const { roomId } = payload;
    client.leave(roomId);

    this.roomSockets.get(roomId)?.delete(client.id);
    if (this.roomSockets.get(roomId)?.size === 0) {
      this.roomSockets.delete(roomId);
    }

    return { success: true, roomId };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      roomId?: string;
      senderId: string;
      receiverId?: string;
      content: string;
      messageType?: string;
      fileUrl?: string;
    },
  ) {
    const { roomId, senderId, receiverId, content, messageType, fileUrl } = payload;

    if (roomId) {
      // Room message
      try {
        const message = await this.chatService.sendMessage(
          roomId,
          senderId,
          content,
          messageType,
          fileUrl,
        );

        // Broadcast to room
        this.server.to(roomId).emit('new_message', {
          roomId,
          message,
        });

        return { success: true, message };
      } catch (error) {
        return { error: error.message };
      }
    } else if (receiverId) {
      // Direct message (legacy support)
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

      return { success: true, messageId: message.id };
    }

    return { error: 'Invalid message parameters' };
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @MessageBody() payload: {
      messageId?: string;
      roomId?: string;
      userId: string;
      messageIds?: string[];
    },
  ) {
    const { messageId, roomId, userId, messageIds } = payload;

    if (roomId && messageIds) {
      // Mark room messages as read
      try {
        await this.chatService.markAsRead(roomId, userId, messageIds);
        return { success: true };
      } catch (error) {
        return { error: error.message };
      }
    } else if (messageId) {
      // Mark direct message as read (legacy)
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

    return { error: 'Invalid parameters' };
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; userId: string; username: string },
  ) {
    const { roomId, userId, username } = payload;
    client.to(roomId).emit('user_typing', { userId, username, isTyping: true });
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomId: string; userId: string; username: string },
  ) {
    const { roomId, userId, username } = payload;
    client.to(roomId).emit('user_typing', { userId, username, isTyping: false });
  }
}
