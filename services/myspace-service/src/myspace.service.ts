import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../libs/database/prisma.service';
import { BuddyAI } from '../../../libs/ai-hub/buddy/buddy.service';
import { WalletEngineService } from '../../../libs/wallet-engine';
import { AppSource } from '@prisma/client';

const ENTRY_FEES = {
  FREELANCER: 20000, // NGN
  CLIENT: 30000,
  STARTUP: 50000,
};

@Injectable()
export class MySpaceService {
  constructor(
    private prisma: PrismaService,
    private buddy: BuddyAI,
    private walletEngine: WalletEngineService,
  ) {}

  /**
   * Verify gated entry payment
   */
  async verifyGatedEntry(userId: string, tier: 'FREELANCER' | 'CLIENT' | 'STARTUP') {
    const fee = ENTRY_FEES[tier];
    
    // In production, verify payment via Paystack/Flutterwave webhook
    // For now, we'll assume payment is verified
    
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isGatedPaid: true,
        role: tier === 'FREELANCER' ? 'DEVELOPER' : tier === 'CLIENT' ? 'CLIENT' : 'COMPANY',
      },
    });

    // Buddy starts scouting for leads if it's a company
    if (tier === 'STARTUP') {
      // Async - don't await
      this.buddy.scoutLeads(userId, {}).catch(console.error);
    }

    return user;
  }

  /**
   * Create a job posting
   */
  async createJob(
    clientId: string,
    title: string,
    description: string,
    budget: number,
    techStack: string[],
  ) {
    // Verify gated entry
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
    });

    if (!client?.isGatedPaid) {
      throw new BadRequestException('Gated entry required');
    }

    const job = await this.prisma.job.create({
      data: {
        title,
        description,
        budget,
        clientId,
        techStack,
        status: 'OPEN',
      },
    });

    // Buddy matches talent
    const matches = await this.buddy.matchTalent(description, budget, techStack);
    await this.prisma.job.update({
      where: { id: job.id },
      data: { aiMatches: matches.map((m: any) => m.id) },
    });

    return { ...job, aiMatches: matches };
  }

  /**
   * Place a bid
   */
  async placeBid(
    jobId: string,
    developerId: string,
    amount: number,
    proposal: string,
  ) {
    // Verify gated entry
    const developer = await this.prisma.user.findUnique({
      where: { id: developerId },
    });

    if (!developer?.isGatedPaid) {
      throw new BadRequestException('Gated entry required');
    }

    return await this.prisma.bid.create({
      data: {
        jobId,
        developerId,
        amount,
        proposal,
        status: 'PENDING',
      },
    });
  }

  /**
   * Accept a bid
   */
  async acceptBid(bidId: string, clientId: string) {
    const bid = await this.prisma.bid.findUnique({
      where: { id: bidId },
      include: { job: true },
    });

    if (!bid || bid.job.clientId !== clientId) {
      throw new BadRequestException('Invalid bid');
    }

    // Lock escrow
    await this.walletEngine.getEscrow().lockEscrow(
      clientId,
      Number(bid.amount),
      bid.jobId,
      `Escrow for job: ${bid.job.title}`,
    );

    // Update bid and job
    await Promise.all([
      this.prisma.bid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.job.update({
        where: { id: bid.jobId },
        data: { status: 'ASSIGNED' },
      }),
    ]);

    return { success: true, bid };
  }

  /**
   * Create a squad
   */
  async createSquad(
    companyId: string,
    name: string,
    seniorDevId: string,
    juniorDevId?: string,
    internId?: string,
  ) {
    return await this.prisma.squad.create({
      data: {
        companyId,
        name,
        seniorDevId,
        juniorDevId,
        internId,
      },
    });
  }

  /**
   * Get job recommendations (Buddy's lead gen)
   */
  async getJobRecommendations(companyId: string) {
    const company = await this.prisma.user.findUnique({
      where: { id: companyId },
    });

    if (!company || company.role !== 'COMPANY') {
      throw new BadRequestException('Company account required');
    }

    return await this.buddy.scoutLeads(companyId, {
      industry: 'Technology',
      techStack: [],
    });
  }

  /**
   * Get freelancer dashboard
   */
  async getFreelancerDashboard(developerId: string) {
    const [bids, jobs, wallet] = await Promise.all([
      this.prisma.bid.findMany({
        where: { developerId },
        include: { job: true },
      }),
      this.prisma.job.findMany({
        where: {
          bids: {
            some: {
              developerId,
              status: 'ACCEPTED',
            },
          },
        },
      }),
      this.walletEngine.getLedger().getBalance(developerId),
    ]);

    const totalEarnings = bids
      .filter((b) => b.status === 'ACCEPTED')
      .reduce((sum, b) => sum + Number(b.amount), 0);

    return {
      activeBids: bids.filter((b) => b.status === 'PENDING').length,
      acceptedBids: bids.filter((b) => b.status === 'ACCEPTED').length,
      totalEarnings,
      walletBalance: Number(wallet.wthBalance || 0),
      activeJobs: jobs.length,
    };
  }
}


