import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';
import { ChatRoomType, AppSource } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a chat room
   */
  async createRoom(
    name: string | null,
    type: ChatRoomType,
    appSource: AppSource,
    createdById: string,
    relatedId?: string,
    memberIds: string[] = [],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Create room
      const room = await tx.chatRoom.create({
        data: {
          name,
          type,
          appSource,
          relatedId,
          createdById,
        },
      });

      // Add creator as member
      await tx.chatRoomMember.create({
        data: {
          roomId: room.id,
          userId: createdById,
          role: 'ADMIN',
        },
      });

      // Add other members
      for (const memberId of memberIds) {
        if (memberId !== createdById) {
          await tx.chatRoomMember.create({
            data: {
              roomId: room.id,
              userId: memberId,
              role: 'MEMBER',
            },
          });
        }
      }

      return room;
    });
  }

  /**
   * Send a message to a room
   */
  async sendMessage(roomId: string, senderId: string, content: string, messageType = 'TEXT', fileUrl?: string) {
    // Verify sender is member of room
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId: senderId },
    });

    if (!membership) {
      throw new Error('User is not a member of this room');
    }

    return await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content,
        messageType,
        fileUrl,
      },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    });
  }

  /**
   * Get messages for a room
   */
  async getRoomMessages(roomId: string, userId: string, limit = 50, offset = 0) {
    // Verify user is member
    const membership = await this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId },
    });

    if (!membership) {
      throw new Error('User is not a member of this room');
    }

    return await this.prisma.chatMessage.findMany({
      where: { roomId },
      include: {
        sender: {
          select: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get user's chat rooms
   */
  async getUserRooms(userId: string, appSource?: AppSource) {
    const where: any = { userId };
    if (appSource) where.room = { appSource };

    return await this.prisma.chatRoomMember.findMany({
      where,
      include: {
        room: {
          include: {
            members: {
              include: {
                user: {
                  select: { id: true, username: true, displayName: true, avatarUrl: true },
                },
              },
            },
            _count: {
              select: { messages: true },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  /**
   * Add member to room
   */
  async addMember(roomId: string, userId: string, addedById: string) {
    // Verify adder has permission
    const adderMembership = await this.prisma.chatRoomMember.findFirst({
      where: { roomId, userId: addedById },
    });

    if (!adderMembership || adderMembership.role === 'MEMBER') {
      throw new Error('Insufficient permissions');
    }

    return await this.prisma.chatRoomMember.create({
      data: {
        roomId,
        userId,
        role: 'MEMBER',
      },
    });
  }

  /**
   * Mark messages as read
   */
  async markAsRead(roomId: string, userId: string, messageIds: string[]) {
    return await this.prisma.chatMessage.updateMany({
      where: {
        id: { in: messageIds },
        roomId,
        senderId: { not: userId }, // Don't mark own messages
      },
      data: {
        isRead: true,
        readBy: { push: userId },
      },
    });
  }
}