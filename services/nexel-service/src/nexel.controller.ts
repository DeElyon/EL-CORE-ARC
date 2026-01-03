import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NexelService } from './nexel.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { CurrentUser } from '../../../libs/auth-bridge/decorators/current-user.decorator';
import { PostType } from '@prisma/client';

@ApiTags('NEXEL')
@Controller('nexel')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NexelController {
  constructor(private readonly nexelService: NexelService) {}

  @Post('posts')
  @ApiOperation({ summary: 'Create a post' })
  async createPost(
    @CurrentUser() user: any,
    @Body() body: {
      content: string;
      type: PostType;
      mediaUrl?: string;
      hashtags?: string[];
    },
  ) {
    return this.nexelService.createPost(
      user.sub,
      body.content,
      body.type,
      body.mediaUrl,
      body.hashtags,
    );
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get Universe Feed' })
  async getFeed(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.nexelService.getFeed(user.sub, limit || 20, offset || 0);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: 'Like/Unlike a post' })
  async likePost(@CurrentUser() user: any, @Param('postId') postId: string) {
    return this.nexelService.likePost(postId, user.sub);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: 'Comment on a post' })
  async commentOnPost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body() body: { content: string },
  ) {
    return this.nexelService.commentOnPost(postId, user.sub, body.content);
  }

  @Post('posts/:postId/save')
  @ApiOperation({ summary: 'Save (bookmark) a post' })
  async savePost(@CurrentUser() user: any, @Param('postId') postId: string) {
    return this.nexelService.savePost(user.sub, postId);
  }

  @Delete('posts/:postId/save')
  @ApiOperation({ summary: 'Remove saved bookmark' })
  async unsavePost(@CurrentUser() user: any, @Param('postId') postId: string) {
    return this.nexelService.unsavePost(user.sub, postId);
  }

  @Post('posts/:postId/repost')
  @ApiOperation({ summary: 'Repost (share) a post' })
  async repost(@CurrentUser() user: any, @Param('postId') postId: string) {
    return this.nexelService.repost(user.sub, postId);
  }

  @Get('posts/:postId/download')
  @ApiOperation({ summary: 'Get download URL for a post media' })
  async downloadPost(@Param('postId') postId: string) {
    return this.nexelService.getPostDownloadUrl(postId);
  }

  @Get('saved')
  @ApiOperation({ summary: 'Get saved posts' })
  async getSaved(@CurrentUser() user: any, @Query('limit') limit?: number, @Query('offset') offset?: number) {
    return this.nexelService.getSavedPosts(user.sub, limit ? Number(limit) : 20, offset ? Number(offset) : 0);
  }

  @Get('pulse')
  @ApiOperation({ summary: 'Get Pulse videos' })
  async getPulseVideos(@Query('limit') limit?: number) {
    return this.nexelService.getPulseVideos(limit || 20);
  }

  @Post('streams')
  @ApiOperation({ summary: 'Start live stream' })
  async startStream(
    @CurrentUser() user: any,
    @Body() body: { title: string; description?: string },
  ) {
    return this.nexelService.startLiveStream(user.sub, body.title, body.description);
  }

  @Post('streams/:streamId/end')
  @ApiOperation({ summary: 'End live stream' })
  async endStream(@Param('streamId') streamId: string) {
    return this.nexelService.endLiveStream(streamId);
  }

  @Get('marketplace')
  @ApiOperation({ summary: 'Get marketplace items' })
  async getMarketplace(@Query('limit') limit?: number) {
    return this.nexelService.getMarketplaceItems(undefined, limit ? Number(limit) : 20);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending hashtags' })
  async getTrending() {
    return this.nexelService.getTrendingHashtags();
  }
}


