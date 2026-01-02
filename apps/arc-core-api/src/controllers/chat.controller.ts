import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatService } from '@el-verse/shared-utils';
import { JwtAuthGuard } from '@el-verse/auth-bridge';
import { CurrentUser } from '@el-verse/auth-bridge';
import { ChatRoomType, AppSource } from '@prisma/client';

@ApiTags('Chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('rooms')
  @ApiOperation({ summary: 'Create a chat room' })
  async createRoom(
    @CurrentUser() user: any,
    @Body() body: {
      name?: string;
      type: ChatRoomType;
      appSource: AppSource;
      relatedId?: string;
      memberIds?: string[];
    },
  ) {
    return this.chatService.createRoom(
      body.name,
      body.type,
      body.appSource,
      user.sub,
      body.relatedId,
      body.memberIds,
    );
  }

  @Get('rooms')
  @ApiOperation({ summary: 'Get user chat rooms' })
  async getUserRooms(
    @CurrentUser() user: any,
    @Query('appSource') appSource?: AppSource,
  ) {
    return this.chatService.getUserRooms(user.sub, appSource);
  }

  @Post('rooms/:roomId/members')
  @ApiOperation({ summary: 'Add member to room' })
  async addMember(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() body: { userId: string },
  ) {
    return this.chatService.addMember(roomId, body.userId, user.sub);
  }

  @Post('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Send message to room' })
  async sendMessage(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() body: {
      content: string;
      messageType?: string;
      fileUrl?: string;
    },
  ) {
    return this.chatService.sendMessage(
      roomId,
      user.sub,
      body.content,
      body.messageType,
      body.fileUrl,
    );
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get room messages' })
  async getRoomMessages(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.chatService.getRoomMessages(
      roomId,
      user.sub,
      limit,
      offset,
    );
  }

  @Post('rooms/:roomId/read')
  @ApiOperation({ summary: 'Mark messages as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('roomId') roomId: string,
    @Body() body: { messageIds: string[] },
  ) {
    return this.chatService.markAsRead(roomId, user.sub, body.messageIds);
  }
}