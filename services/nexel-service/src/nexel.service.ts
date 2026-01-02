import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/database/prisma.service';
import { NellyAI } from '../../../libs/ai-hub/nelly/nelly.service';
import { AppSource, PostType } from '@prisma/client';

@Injectable()
export class NexelService {
  constructor(
    private prisma: PrismaService,
    private nelly: NellyAI,
  ) {}

  /**
   * Create a post
   */
  async createPost(
    authorId: string,
    content: string,
    type: PostType,
    mediaUrl?: string,
    hashtags?: string[],
  ) {
    // Generate caption if needed
    let finalContent = content;
    if (!content && mediaUrl) {
      finalContent = await this.nelly.generateCaption('', type);
    }

    return await this.prisma.post.create({
      data: {
        authorId,
        content: finalContent,
        type,
        mediaUrl,
        hashtags: hashtags || [],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            verseScore: true,
          },
        },
      },
    });
  }

  /**
   * Get feed (Universe Feed)
   */
  async getFeed(userId: string, limit = 20, offset = 0) {
    // Get posts from followed users + trending
    const posts = await this.prisma.post.findMany({
      take: limit,
      skip: offset,
      orderBy: [
        { likesCount: 'desc' },
        { createdAt: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            verseScore: true,
            isVerified: true,
          },
        },
        comments: {
          take: 3,
          orderBy: { createdAt: 'desc' },
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return posts;
  }

  /**
   * Like a post
   */
  async likePost(postId: string, userId: string) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.postLike.create({
        data: { postId, userId },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  /**
   * Comment on a post
   */
  async commentOnPost(postId: string, authorId: string, content: string) {
    const comment = await this.prisma.comment.create({
      data: {
        postId,
        authorId,
        content,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  }

  /**
   * Get Pulse videos (short-form)
   */
  async getPulseVideos(limit = 20) {
    return await this.prisma.post.findMany({
      where: { type: PostType.PULSE },
      take: limit,
      orderBy: { viewsCount: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Start live stream
   */
  async startLiveStream(streamerId: string, title: string, description?: string) {
    return await this.prisma.liveStream.create({
      data: {
        streamerId,
        title,
        description,
        isLive: true,
      },
    });
  }

  /**
   * End live stream
   */
  async endLiveStream(streamId: string) {
    return await this.prisma.liveStream.update({
      where: { id: streamId },
      data: {
        isLive: false,
        endedAt: new Date(),
      },
    });
  }

  /**
   * Send gift during live stream
   */
  async sendGift(
    streamId: string,
    senderId: string,
    receiverId: string,
    giftType: string,
    amount: number,
  ) {
    const gift = await this.prisma.gift.create({
      data: {
        streamId,
        senderId,
        receiverId,
        giftType,
        amount,
      },
    });

    // Update stream total gifts
    await this.prisma.liveStream.update({
      where: { id: streamId },
      data: {
        totalGifts: { increment: amount },
      },
    });

    return gift;
  }

  /**
   * Get marketplace items
   */
  async getMarketplaceItems(limit = 20) {
    return await this.prisma.post.findMany({
      where: { type: PostType.MARKETPLACE_ITEM },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Get trending hashtags
   */
  async getTrendingHashtags() {
    const recentPosts = await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
      select: { hashtags: true },
    });

    const hashtagCounts: Record<string, number> = {};
    recentPosts.forEach((post) => {
      post.hashtags.forEach((tag) => {
        hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
      });
    });

    return Object.entries(hashtagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }
}


