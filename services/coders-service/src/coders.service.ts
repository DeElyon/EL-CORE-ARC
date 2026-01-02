import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/database/prisma.service';
import { LinaAI } from '../../../libs/ai-hub/lina/lina.service';
import { WalletEngineService } from '../../../libs/wallet-engine';
import { AppSource } from '@prisma/client';

@Injectable()
export class CodersService {
  constructor(
    private prisma: PrismaService,
    private lina: LinaAI,
    private walletEngine: WalletEngineService,
  ) {}

  /**
   * Create a project
   */
  async createProject(
    clientId: string,
    title: string,
    description: string,
    budget: number,
    techStack: string[],
  ) {
    return await this.prisma.project.create({
      data: {
        clientId,
        title,
        description,
        budget,
        techStack,
        status: 'OPEN',
      },
    });
  }

  /**
   * Assign developer to project
   */
  async assignDeveloper(projectId: string, developerId: string) {
    return await this.prisma.project.update({
      where: { id: projectId },
      data: {
        developerId,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * Create milestone
   */
  async createMilestone(
    projectId: string,
    title: string,
    description: string,
    amount: number,
    dueDate?: Date,
  ) {
    return await this.prisma.milestone.create({
      data: {
        projectId,
        title,
        description,
        amount,
        dueDate,
        status: 'PENDING',
      },
    });
  }

  /**
   * Submit code
   */
  async submitCode(
    projectId: string,
    developerId: string,
    title: string,
    description: string,
    codeUrl?: string,
  ) {
    // Get code for review
    let code = '';
    if (codeUrl) {
      // In production, fetch code from GitHub/GitLab
      code = `// Code from ${codeUrl}`;
    }

    // Lina pre-check
    const aiFeedback = await this.lina.reviewCode(
      code || description,
      'typescript',
      description,
    );

    const submission = await this.prisma.submission.create({
      data: {
        projectId,
        developerId,
        title,
        description,
        codeUrl,
        aiFeedback: JSON.stringify(aiFeedback),
        status: aiFeedback.status === 'APPROVE' ? 'PENDING' : 'PENDING',
      },
    });

    return submission;
  }

  /**
   * Approve milestone and release payment
   */
  async approveMilestone(
    milestoneId: string,
    projectId: string,
    clientId: string,
    developerId: string,
  ) {
    const milestone = await this.prisma.milestone.findUnique({
      where: { id: milestoneId },
    });

    if (!milestone) {
      throw new Error('Milestone not found');
    }

    // Release escrow payment
    await this.walletEngine.getEscrow().releaseEscrow(
      clientId,
      developerId,
      Number(milestone.amount),
      projectId,
      milestoneId,
    );

    // Update milestone
    await this.prisma.milestone.update({
      where: { id: milestoneId },
      data: {
        status: 'RELEASED',
        completedAt: new Date(),
      },
    });

    return { success: true, milestone };
  }

  /**
   * Start code session (for Shadow Mode)
   */
  async startCodeSession(projectId: string, developerId: string) {
    return await this.prisma.codeSession.create({
      data: {
        projectId,
        developerId,
        isShadowMode: false,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Join shadow mode
   */
  async joinShadowMode(sessionId: string, internId: string) {
    const session = await this.prisma.codeSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const shadowViewers = session.shadowViewers || [];
    if (!shadowViewers.includes(internId)) {
      shadowViewers.push(internId);
    }

    return await this.prisma.codeSession.update({
      where: { id: sessionId },
      data: { shadowViewers },
    });
  }

  /**
   * Get developer dashboard
   */
  async getDashboard(developerId: string) {
    const [wallet, projects, transactions] = await Promise.all([
      this.walletEngine.getLedger().getBalance(developerId),
      this.prisma.project.findMany({
        where: { developerId },
        include: {
          milestones: true,
          _count: { select: { submissions: true } },
        },
      }),
      this.walletEngine.getLedger().getTransactions(developerId, 10),
    ]);

    const totalEarnings = projects
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + Number(p.budget), 0);

    const escrowed = Number(wallet.escrowBalance || 0);
    const withdrawable = Number(wallet.wthBalance || 0);

    return {
      withdrawable,
      escrowed,
      projected: totalEarnings,
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status === 'ACTIVE').length,
      recentTransactions: transactions,
    };
  }

  /**
   * Generate documentation
   */
  async generateDocs(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project || !project.submissions[0]) {
      throw new Error('No code submission found');
    }

    const code = project.submissions[0].codeUrl || '';
    const docs = await this.lina.generateDocs(code, 'typescript');

    return { docs };
  }
}

