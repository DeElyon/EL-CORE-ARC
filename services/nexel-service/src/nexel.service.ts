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
            isBiometricVerified: true,
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

  // ============================================
  // MARKETPLACE FEATURES
  // ============================================

  /**
   * Create marketplace item
   */
  async createMarketplaceItem(
    sellerId: string,
    title: string,
    description: string,
    price: number,
    mediaUrl?: string,
    category?: string,
  ) {
    return await this.createPost(
      sellerId,
      `${title}\n\n${description}`,
      PostType.MARKETPLACE_ITEM,
      mediaUrl,
      [category || 'marketplace'],
    );
  }

  /**
   * Purchase marketplace item
   */
  async purchaseMarketplaceItem(buyerId: string, itemId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const item = await tx.post.findUnique({
        where: { id: itemId },
        include: { author: { include: { wallet: true } } },
      });

      if (!item || item.type !== PostType.MARKETPLACE_ITEM) {
        throw new Error('Item not found');
      }

      if (item.isSold) {
        throw new Error('Item already sold');
      }

      const buyer = await tx.user.findUnique({
        where: { id: buyerId },
        include: { wallet: true },
      });

      if (!buyer || !buyer.wallet) {
        throw new Error('Buyer wallet not found');
      }

      if (Number(buyer.wallet.wthBalance) < Number(item.price)) {
        throw new Error('Insufficient balance');
      }

      // Lock funds in escrow
      await tx.wallet.update({
        where: { userId: buyerId },
        data: {
          wthBalance: { decrement: item.price },
          escrowBalance: { increment: item.price },
        },
      });

      // Update item as sold
      await tx.post.update({
        where: { id: itemId },
        data: {
          isSold: true,
          buyerId,
        },
      });

      // Notify seller
      // await this.notificationService.notifyMarketplacePurchase(
      //   item.authorId,
      //   buyer.username,
      //   item.content.split('\n')[0], // title
      // );

      return {
        purchaseId: itemId,
        amount: item.price,
        status: 'PENDING_SELLER_CONFIRMATION',
      };
    });
  }

  /**
   * Confirm marketplace sale (seller)
   */
  async confirmMarketplaceSale(sellerId: string, itemId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const item = await tx.post.findUnique({
        where: { id: itemId },
        include: { author: { include: { wallet: true } } },
      });

      if (!item || item.authorId !== sellerId) {
        throw new Error('Item not found or not authorized');
      }

      if (!item.buyerId) {
        throw new Error('No buyer for this item');
      }

      const buyer = await tx.user.findUnique({
        where: { id: item.buyerId },
        include: { wallet: true },
      });

      // Release funds from escrow to seller
      await tx.wallet.update({
        where: { userId: sellerId },
        data: {
          wthBalance: { increment: item.price },
        },
      });

      // Remove from buyer's escrow
      await tx.wallet.update({
        where: { userId: item.buyerId },
        data: {
          escrowBalance: { decrement: item.price },
        },
      });

      // Notify buyer
      // await this.notificationService.notifyMarketplaceSaleConfirmed(
      //   item.buyerId,
      //   item.author.username,
      //   item.content.split('\n')[0],
      // );

      return { success: true, amount: item.price };
    });
  }

  /**
   * Get marketplace items
   */
  async getMarketplaceItems(category?: string, limit = 20, offset = 0) {
    const where: any = { type: PostType.MARKETPLACE_ITEM };
    if (category) {
      where.hashtags = { has: category };
    }

    return await this.prisma.post.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  // ============================================
  // STORIES & REELS (Instagram/TikTok features)
  // ============================================

  /**
   * Create story
   */
  async createStory(authorId: string, mediaUrl: string, mediaType: string, duration?: number) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    return await this.prisma.post.create({
      data: {
        authorId,
        content: '',
        type: PostType.STORY,
        mediaUrl,
        mediaType,
        expiresAt,
        duration,
      },
    });
  }

  /**
   * Create reel (short video)
   */
  async createReel(authorId: string, content: string, videoUrl: string, duration: number) {
    return await this.prisma.post.create({
      data: {
        authorId,
        content,
        type: PostType.REEL,
        mediaUrl: videoUrl,
        mediaType: 'video',
        duration,
      },
    });
  }

  /**
   * Get active stories
   */
  async getActiveStories() {
    return await this.prisma.post.findMany({
      where: {
        type: PostType.STORY,
        expiresAt: {
          gt: new Date(),
        },
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
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get reels feed
   */
  async getReelsFeed(limit = 20, offset = 0) {
    return await this.prisma.post.findMany({
      where: { type: PostType.REEL },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            verseScore: true,
          },
        },
        _count: {
          select: { likes: true, comments: true },
        },
      },
      orderBy: [
        { viewsCount: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
    });
  }

  // ============================================
  // GROUP MESSAGES (WhatsApp style)
  // ============================================

  /**
   * Create group chat
   */
  async createGroupChat(creatorId: string, name: string, memberIds: string[]) {
    // This would use the ChatService
    // return await this.chatService.createRoom(
    //   name,
    //   ChatRoomType.GROUP,
    //   AppSource.NEXEL,
    //   creatorId,
    //   undefined,
    //   memberIds,
    // );
    return { message: 'Group chat creation - integrate with ChatService' };
  }
}


