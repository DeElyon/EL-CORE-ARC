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
import { CodersService } from '../../services/coders-service/src/coders.service';

@Injectable()
@WebSocketGateway({
  namespace: 'ide',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class IdeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private projectRooms: Map<string, Set<string>> = new Map(); // projectId -> Set of socketIds
  private shadowRooms: Map<string, Set<string>> = new Map(); // projectId -> Set of shadow viewer socketIds

  constructor(private codersService: CodersService) {}

  handleConnection(client: Socket) {
    console.log(`Client connected to IDE: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    // Remove from all project rooms
    this.projectRooms.forEach((sockets, projectId) => {
      sockets.delete(client.id);
    });
    this.shadowRooms.forEach((sockets, projectId) => {
      sockets.delete(client.id);
    });
  }

  @SubscribeMessage('join_project')
  async handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; userId: string; isShadow?: boolean },
  ) {
    const { projectId, userId, isShadow } = payload;
    await client.join(projectId);

    if (isShadow) {
      // Shadow mode (read-only for interns)
      if (!this.shadowRooms.has(projectId)) {
        this.shadowRooms.set(projectId, new Set());
      }
      this.shadowRooms.get(projectId)!.add(client.id);

      // Notify project room
      this.server.to(projectId).emit('shadow_viewer_joined', {
        viewerId: userId,
        viewerCount: this.shadowRooms.get(projectId)!.size,
      });

      // Join shadow mode in database
      const sessions = await this.codersService['prisma'].codeSession.findMany({
        where: { projectId, isShadowMode: false },
        orderBy: { startedAt: 'desc' },
        take: 1,
      });

      if (sessions.length > 0) {
        await this.codersService.joinShadowMode(sessions[0].id, userId);
      }
    } else {
      // Developer mode
      if (!this.projectRooms.has(projectId)) {
        this.projectRooms.set(projectId, new Set());
      }
      this.projectRooms.get(projectId)!.add(client.id);
    }

    return { success: true, projectId, isShadow: !!isShadow };
  }

  @SubscribeMessage('code_change')
  async handleCodeChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      projectId: string;
      delta: any;
      filePath: string;
      userId: string;
    },
  ) {
    const { projectId, delta, filePath, userId } = payload;

    // Broadcast to all in project room (except sender)
    client.to(projectId).emit('remote_change', {
      delta,
      filePath,
      userId,
      timestamp: new Date().toISOString(),
    });

    // Also broadcast to shadow viewers
    this.server.to(projectId).emit('shadow_change', {
      delta,
      filePath,
      userId,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  }

  @SubscribeMessage('cursor_position')
  async handleCursorPosition(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: {
      projectId: string;
      position: { line: number; column: number };
      userId: string;
      username: string;
    },
  ) {
    const { projectId, position, userId, username } = payload;

    // Broadcast cursor position to others
    client.to(projectId).emit('remote_cursor', {
      userId,
      username,
      position,
    });

    return { success: true };
  }

  @SubscribeMessage('start_session')
  async handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string; developerId: string },
  ) {
    const { projectId, developerId } = payload;

    const session = await this.codersService.startCodeSession(projectId, developerId);

    this.server.to(projectId).emit('session_started', {
      sessionId: session.id,
      developerId,
      startedAt: session.startedAt,
    });

    return { success: true, session };
  }
}
