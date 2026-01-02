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
}


