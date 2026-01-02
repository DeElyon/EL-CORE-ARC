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
import { Injectable, UseGuards } from '@nestjs/common';
import { NexelService } from '@el-verse/nexel-service';
import { WalletEngineService } from '@el-verse/wallet-engine';
import { NellyAI } from '@el-verse/ai-hub';

@Injectable()
@WebSocketGateway({
  namespace: 'stream',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class StreamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private streamRooms: Map<string, Set<string>> = new Map(); // streamId -> Set of socketIds

  constructor(
    private nexelService: NexelService,
    private walletEngine: WalletEngineService,
    private nelly: NellyAI,
  ) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to stream: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove from all stream rooms
    this.streamRooms.forEach((sockets, streamId) => {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        this.server.to(streamId).emit('viewer_left', {
          viewerCount: sockets.size,
        });
      }
    });
  }

  @SubscribeMessage('join_stream')
  async handleJoinStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { streamId: string },
  ) {
    const { streamId } = payload;
    await client.join(streamId);

    // Track viewer
    if (!this.streamRooms.has(streamId)) {
      this.streamRooms.set(streamId, new Set());
    }
    this.streamRooms.get(streamId)!.add(client.id);

    // Update viewer count
    const viewerCount = this.streamRooms.get(streamId)!.size;
    this.server.to(streamId).emit('viewer_joined', { viewerCount });

    return { success: true, streamId, viewerCount };
  }

  @SubscribeMessage('leave_stream')
  async handleLeaveStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { streamId: string },
  ) {
    const { streamId } = payload;
    await client.leave(streamId);

    if (this.streamRooms.has(streamId)) {
      this.streamRooms.get(streamId)!.delete(client.id);
      const viewerCount = this.streamRooms.get(streamId)!.size;
      this.server.to(streamId).emit('viewer_left', { viewerCount });
    }

    return { success: true };
  }

  @SubscribeMessage('send_gift')
  async handleGift(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      streamId: string;
      streamerId: string;
      giftType: string;
      amount: number;
      senderId: string;
    },
  ) {
    const { streamId, streamerId, giftType, amount, senderId } = payload;

    try {
      // Process WTH transfer
      await this.walletEngine.getLedger().transfer(
        senderId,
        streamerId,
        amount,
        'NEXEL' as any,
        `Gift: ${giftType}`,
      );

      // Record gift
      await this.nexelService.sendGift(
        streamId,
        senderId,
        streamerId,
        giftType,
        amount,
      );

      // Generate Nelly comment
      const streamer = await this.nexelService['prisma'].user.findUnique({
        where: { id: streamerId },
        select: { username: true },
      });

      const nellyComment = await this.nelly.generateStreamComment(
        giftType,
        streamer?.username || 'Streamer',
      );

      // Broadcast to stream room
      this.server.to(streamId).emit('new_gift', {
        senderId,
        giftType,
        amount,
        animationType: 'pulse_sparkle',
        nellyComment,
      });

      return { success: true, giftType, amount };
    } catch (error) {
      client.emit('gift_error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('stream_chat')
  async handleStreamChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      streamId: string;
      message: string;
      userId: string;
      username: string;
    },
  ) {
    const { streamId, message, userId, username } = payload;

    // Broadcast chat message
    this.server.to(streamId).emit('chat_message', {
      userId,
      username,
      message,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }
}
