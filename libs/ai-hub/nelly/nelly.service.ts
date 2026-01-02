import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';
import { PrismaService } from '@el-verse/database';

@Injectable()
export class NellyAI {
  private readonly SYSTEM_PROMPT = `You are Nelly, NEXEL's Social AI Agent.
You are friendly, trendy, and understand social media dynamics.
You analyze trends, engage with users, and create engaging content.
Your personality is vibrant, tech-savvy, and community-focused.
You help users discover content, understand trends, and engage meaningfully.`;

  constructor(
    private aiCore: AiCoreService,
    private prisma: PrismaService,
  ) {}

  /**
   * Analyze social trends
   */
  async analyzeTrends() {
    const recentPosts = await this.prisma.post.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
      },
      take: 100,
      orderBy: { likesCount: 'desc' },
    });

    const hashtags = recentPosts.flatMap((p) => p.hashtags);
    const trendingHashtags = [...new Set(hashtags)].slice(0, 10);

    const prompt = `Analyze these trending hashtags from NEXEL:
${trendingHashtags.join(', ')}

Identify:
1. Top 5 trending topics
2. Emerging trends
3. Content suggestions for creators
4. Engagement opportunities

Return a JSON object with analysis.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.7 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return { trends: trendingHashtags.slice(0, 5) };
    }
  }

  /**
   * Generate stream comment
   */
  async generateStreamComment(giftType: string, streamerName: string) {
    const prompt = `A viewer just sent a "${giftType}" gift to ${streamerName} during a live stream.
Generate an engaging, fun comment that Nelly AI would post in the chat.
Keep it short (under 50 characters), enthusiastic, and on-brand.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.9, maxTokens: 100 },
    );

    return response.text.trim();
  }

  /**
   * Suggest content based on user interests
   */
  async suggestContent(userId: string) {
    const userPosts = await this.prisma.post.findMany({
      where: { authorId: userId },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });

    const interests = userPosts.flatMap((p) => p.hashtags);

    const prompt = `Based on user's recent posts with hashtags: ${interests.join(', ')}
Suggest 5 content ideas that would resonate with this user.
Include post type (CONTENT, PULSE, MARKETPLACE) and suggested hashtags.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.8 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return [];
    }
  }

  /**
   * Generate engaging post caption
   */
  async generateCaption(content: string, postType: string) {
    const prompt = `Generate an engaging social media caption for a ${postType} post.
Content context: "${content}"
Make it:
- Engaging and authentic
- Include relevant hashtags
- Appropriate length for the platform
- On-brand for NEXEL's tech community`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.8 },
    );

    return response.text.trim();
  }
}


