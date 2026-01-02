import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { FundingMethod, AppSource } from '@prisma/client';

export interface FundingRequestData {
  userId: string;
  amount: number;
  method: FundingMethod;
  appSource: AppSource;
  receiptUrl?: string;
  accountDetails?: any;
}

@Injectable()
export class FundingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create funding request
   */
  async createFundingRequest(data: FundingRequestData) {
    return await this.prisma.fundingRequest.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        method: data.method,
        appSource: data.appSource,
        receiptUrl: data.receiptUrl,
        accountDetails: data.accountDetails,
      },
    });
  }

  /**
   * Verify funding with fingerprint
   */
  async verifyFundingFingerprint(requestId: string, fingerprintData: string, verifiedBy: string) {
    // In production, verify fingerprint against user's stored data
    const request = await this.prisma.fundingRequest.findUnique({
      where: { id: requestId },
      include: { user: true },
    });

    if (!request) throw new Error('Funding request not found');

    // Simple verification - in production use proper biometric matching
    const isValidFingerprint = request.user.fingerprintData === fingerprintData;

    if (!isValidFingerprint) throw new Error('Invalid fingerprint');

    return await this.prisma.fundingRequest.update({
      where: { id: requestId },
      data: {
        isFingerprintVerified: true,
        status: 'VERIFIED',
      },
    });
  }

  /**
   * Approve funding request (admin only)
   */
  async approveFunding(requestId: string, adminId: string, adminNotes?: string) {
    const request = await this.prisma.fundingRequest.findUnique({
      where: { id: requestId },
      include: { user: { include: { wallet: true } } },
    });

    if (!request) throw new Error('Funding request not found');
    if (!request.isFingerprintVerified) throw new Error('Funding not fingerprint verified');

    return await this.prisma.$transaction(async (tx) => {
      // Update request status
      await tx.fundingRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          processedBy: adminId,
          processedAt: new Date(),
          adminNotes,
        },
      });

      // Credit wallet
      await tx.wallet.update({
        where: { userId: request.userId },
        data: {
          wthBalance: { increment: request.amount },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: request.user.wallet.id,
          amount: request.amount,
          type: 'CREDIT',
          appSource: request.appSource,
          description: `Funding via ${request.method}`,
          status: 'SUCCESS',
        },
      });

      return { success: true, amount: request.amount, userId: request.userId, method: request.method };
    });
  }

  /**
   * Get funding requests for user
   */
  async getUserFundingRequests(userId: string) {
    return await this.prisma.fundingRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all funding requests (admin)
   */
  async getAllFundingRequests(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return await this.prisma.fundingRequest.findMany({
      where,
      include: {
        user: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}