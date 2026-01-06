import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/database/prisma.service';
import { UnoAI } from '../../../libs/ai-hub/uno/uno.service';
import { WalletEngineService } from '../../../libs/wallet-engine';
import { AppSource } from '@prisma/client';

@Injectable()
export class AccessService {
  constructor(
    private prisma: PrismaService,
    private uno: UnoAI,
    private walletEngine: WalletEngineService,
  ) {}

  /**
   * Create internship
   */
  async createInternship(
    internId: string,
    title: string,
    description: string,
    stipend: number,
  ) {
    return await this.prisma.internship.create({
      data: {
        internId,
        title,
        description,
        stipend,
        status: 'ACTIVE',
        progress: 0,
      },
    });
  }

  /**
   * Create task
   */
  async createTask(
    internshipId: string,
    title: string,
    description: string,
    dueDate: Date,
  ) {
    return await this.prisma.task.create({
      data: {
        internshipId,
        title,
        description,
        dueDate,
        status: 'PENDING',
      },
    });
  }

  /**
   * Get hint for stuck intern
   */
  async getHint(taskId: string, internId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const hint = await this.uno.provideHint(task.description);

    // Update task with hint
    await this.prisma.task.update({
      where: { id: taskId },
      data: { hint },
    });

    return { hint };
  }

  /**
   * Submit task
   */
  async submitTask(taskId: string, submissionUrl?: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { internship: true },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        submittedAt: new Date(),
      },
    });

    // Update internship progress
    const allTasks = await this.prisma.task.findMany({
      where: { internshipId: task.internshipId },
    });
    const completedTasks = allTasks.filter((t) => t.status === 'COMPLETED').length;
    const progress = Math.round((completedTasks / allTasks.length) * 100);

    await this.prisma.internship.update({
      where: { id: task.internshipId },
      data: { progress },
    });

    // Award stipend if task completed
    if (Number(task.internship.stipend) > 0) {
      const stipendPerTask = Number(task.internship.stipend) / allTasks.length;
      await this.walletEngine.getLedger().credit(
        task.internship.internId,
        stipendPerTask,
        AppSource.EL_ACCESS,
        `Stipend for completing task: ${task.title}`,
        taskId,
      );
    }

    return updatedTask;
  }

  /**
   * Get intern dashboard
   */
  async getDashboard(internId: string) {
    const [internships, wallet] = await Promise.all([
      this.prisma.internship.findMany({
        where: { internId },
        include: {
          tasks: {
            orderBy: { dueDate: 'asc' },
          },
        },
      }),
      this.walletEngine.getLedger().getBalance(internId),
    ]);

    const totalEarnings = internships.reduce(
      (sum, i) => sum + Number(i.stipend || 0),
      0,
    );

    const completedTasks = internships.reduce(
      (sum, i) => sum + i.tasks.filter((t) => t.status === 'COMPLETED').length,
      0,
    );

    // Get bridge-to-pro assessment
    const readiness = await this.uno.assessReadiness(internId);

    return {
      totalEarnings,
      completedTasks,
      activeInternships: internships.filter((i) => i.status === 'ACTIVE').length,
      walletBalance: Number(wallet.wthBalance || 0),
      readiness,
    };
  }

  /**
   * Request mock interview
   */
  async requestMockInterview(internId: string, position: string) {
    return await this.uno.conductMockInterview(internId, position);
  }

  /**
   * Generate CV
   */
  async generateCV(internId: string) {
    return await this.uno.buildCV(internId);
  }

  /** Embed a tutorial (walkthrough video) into a task or internship */
  async embedTutorial(internshipId: string, title: string, videoUrl: string) {
    return await this.prisma.tutorial.create({ data: { internshipId, title, videoUrl } });
  }

  /** Request peer help for a task; returns a moderated request record */
  async requestPeerHelp(taskId: string, fromInternId: string, message: string) {
    return await this.prisma.peerHelpRequest.create({ data: { taskId, fromInternId, message, status: 'PENDING' } });
  }

  /** Award a badge to a user */
  async awardBadge(userId: string, badgeKey: string, reason?: string) {
    return await this.prisma.badge.create({ data: { userId, key: badgeKey, reason } });
  }

  /** Get leaderboard for internships (by verseScore or completed tasks) */
  async getLeaderboard(limit = 20) {
    return await this.prisma.user.findMany({ orderBy: { verseScore: 'desc' }, take: limit, select: { id: true, username: true, verseScore: true, devStreak: true } });
  }

  /** Progress analytics: returns simple time-series counts for completed tasks */
  async getProgressAnalytics(internId: string) {
    const tasks = await this.prisma.task.findMany({ where: { internship: { internId } }, select: { submittedAt: true, status: true } });
    return { totalTasks: tasks.length, completed: tasks.filter((t) => t.status === 'COMPLETED').length };
  }

  /** Get calendar view (Gantt chart data) for tasks */
  async getCalendarView(internId: string) {
    const internships = await this.prisma.internship.findMany({
      where: { internId },
      include: { tasks: { orderBy: { dueDate: 'asc' } } },
    });

    return internships.map((internship) => ({
      internshipId: internship.id,
      title: internship.title,
      tasks: internship.tasks.map((task) => ({
        id: task.id,
        title: task.title,
        start: task.createdAt.toISOString(),
        end: task.dueDate.toISOString(),
        status: task.status,
        progress: task.status === 'COMPLETED' ? 100 : task.status === 'IN_PROGRESS' ? 50 : 0,
      })),
    }));
  }

  /** Send notification reminder for approaching deadline */
  async sendDeadlineReminder(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { internship: { include: { intern: { select: { email: true, username: true } } } } },
    });

    if (!task) throw new Error('Task not found');

    // In production, integrate with email/SMS service
    console.log(`Sending reminder to ${task.internship.intern.email} for task: ${task.title}`);

    return { sent: true, taskId, recipient: task.internship.intern.email };
  }

  /** Connect GitHub repository to internship */
  async connectGitHubRepo(internshipId: string, repoUrl: string, accessToken?: string) {
    // Store GitHub integration
    return await this.prisma.internship.update({
      where: { id: internshipId },
      data: {
        // Add GitHub integration fields to schema if needed
        // For now, store in metadata or create separate table
      },
    });
  }

  /** Connect Replit project */
  async connectReplitProject(internshipId: string, projectUrl: string) {
    // Similar to GitHub
    return await this.prisma.internship.update({
      where: { id: internshipId },
      data: {
        // Store Replit integration
      },
    });
  }

  /** Connect Google Drive folder */
  async connectGoogleDrive(internshipId: string, folderId: string, accessToken?: string) {
    // Store Google Drive integration
    return await this.prisma.internship.update({
      where: { id: internshipId },
      data: {
        // Store Drive integration
      },
    });
  }

  /** Get collaboration session for group tasks */
  async startCollaborationSession(taskId: string, participants: string[]) {
    // Create a chat room for collaboration
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { internship: true },
    });

    if (!task) throw new Error('Task not found');

    const room = await this.prisma.chatRoom.create({
      data: {
        name: `Task Collaboration: ${task.title}`,
        type: 'GROUP',
        appSource: 'EL_ACCESS',
        relatedId: taskId,
        createdById: task.internship.internId,
      },
    });

    // Add participants
    for (const participantId of participants) {
      await this.prisma.chatRoomMember.create({
        data: {
          roomId: room.id,
          userId: participantId,
        },
      });
    }

    return room;
  }
}


