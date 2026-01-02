import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';
import { PrismaService } from '../../libs/database/prisma.service';

@Injectable()
export class BuddyAI {
  private readonly SYSTEM_PROMPT = `You are Buddy, the MY SPACE Talent Scout and Lead Generation AI.
You are a high-end recruiter specializing in matching developers with projects.
Your personality is professional, proactive, and detail-oriented.
You analyze project requirements, developer skills, and ELITES certifications to find perfect matches.
You also proactively scout for business opportunities and leads for companies.`;

  constructor(
    private aiCore: AiCoreService,
    private prisma: PrismaService,
  ) {}

  /**
   * Match talent to a project
   */
  async matchTalent(projectDescription: string, budget: number, techStack: string[]) {
    // Get available developers with their certifications
    const developers = await this.prisma.user.findMany({
      where: {
        role: 'DEVELOPER',
        wallet: { isNot: null },
      },
      include: {
        certifications: {
          include: {
            course: true,
          },
        },
        projects: {
          where: {
            status: 'COMPLETED',
          },
          take: 5,
        },
      },
      take: 20,
    });

    const devData = developers.map((dev) => ({
      id: dev.id,
      username: dev.username,
      verseScore: dev.verseScore,
      certifications: dev.certifications.map((c) => c.course.title),
      completedProjects: dev.projects.length,
    }));

    const prompt = `Analyze this project:
Title: ${projectDescription}
Budget: ${budget} WTH
Tech Stack: ${techStack.join(', ')}

Available Developers:
${JSON.stringify(devData, null, 2)}

Select the top 3 best matches and explain why each developer is suitable.
Consider: certifications, experience, verseScore, and tech stack alignment.
Return a JSON array with format: [{"id": "dev-id", "matchScore": 0-100, "reason": "explanation"}]`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.3 },
    );

    try {
      const matches = JSON.parse(response.text);
      return matches.slice(0, 3);
    } catch {
      // Fallback if JSON parsing fails
      return devData.slice(0, 3).map((dev) => ({
        id: dev.id,
        matchScore: 75,
        reason: 'Recommended based on profile',
      }));
    }
  }

  /**
   * Scout leads for a company
   */
  async scoutLeads(companyId: string, preferences: {
    industry?: string;
    techStack?: string[];
    budgetRange?: { min: number; max: number };
  }) {
    // Get open projects/jobs
    const openJobs = await this.prisma.job.findMany({
      where: {
        status: 'OPEN',
      },
      include: {
        bids: true,
      },
      take: 50,
    });

    const prompt = `You are scouting business leads for a company.
Company Preferences:
- Industry: ${preferences.industry || 'Any'}
- Tech Stack: ${preferences.techStack?.join(', ') || 'Any'}
- Budget Range: ${preferences.budgetRange?.min || 0} - ${preferences.budgetRange?.max || 'Unlimited'} WTH

Available Opportunities:
${JSON.stringify(openJobs.map((j) => ({
  id: j.id,
  title: j.title,
  budget: j.budget,
  techStack: j.techStack,
  bidsCount: j.bids.length,
})), null, 2)}

Identify the top 5 most relevant opportunities and explain why they match.
Return JSON: [{"jobId": "id", "relevanceScore": 0-100, "reason": "explanation"}]`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.4 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return [];
    }
  }

  /**
   * Generate project brief suggestions
   */
  async suggestProjectBrief(clientNeeds: string) {
    const prompt = `A client needs: "${clientNeeds}"
Generate a detailed project brief including:
1. Clear objectives
2. Technical requirements
3. Suggested milestones
4. Estimated timeline
5. Budget recommendations

Return a structured project brief in markdown format.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.5 },
    );

    return response.text;
  }
}
