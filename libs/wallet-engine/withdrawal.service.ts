import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';
import { TransactionType, AppSource } from '@prisma/client';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'BANK' | 'CRYPTO' | 'PAYPAL';
  appSource: AppSource;
  accountDetails: {
    accountNumber?: string;
    bankName?: string;
    cryptoAddress?: string;
    paypalEmail?: string;
  };
  fingerprintData?: string;
  password?: string;
}

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Process withdrawal request with 2.5% fee and biometric verification
   */
  async requestWithdrawal(request: WithdrawalRequest) {
    const { userId, amount, method, appSource, accountDetails, fingerprintData, password } = request;

    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, fingerprintData: true },
      });

      // Verify password if provided
      if (password) {
        const bcrypt = require('bcrypt');
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
          throw new BadRequestException('Invalid password');
        }
      }

      // Verify fingerprint if provided
      if (fingerprintData) {
        const isFingerprintValid = user.fingerprintData === fingerprintData;
        if (!isFingerprintValid) {
          throw new BadRequestException('Invalid fingerprint');
        }
      }

      // Calculate 2.5% fee
      const fee = amount * 0.025;
      const totalDeduction = amount + fee;

      if (Number(wallet.wthBalance) < totalDeduction) {
        throw new BadRequestException('Insufficient balance');
      }

      // Create withdrawal request
      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          fee,
          totalAmount: totalDeduction,
          method,
          accountDetails,
          appSource,
          isFingerprintVerified: !!fingerprintData,
          isPasswordVerified: !!password,
          status: 'PENDING',
        },
      });

      // TODO: Notify admin via email and dashboard
      // await this.notifyAdmin(withdrawalRequest);

      return {
        withdrawalId: withdrawalRequest.id,
        amount,
        fee,
        totalDeduction,
        method,
        status: 'PENDING',
      };
    });
  }

  /**
   * Approve withdrawal request (admin only)
   */
  async approveWithdrawal(requestId: string, adminId: string) {
    const request = await this.prisma.withdrawalRequest.findUnique({
      where: { id: requestId },
      include: { user: { include: { wallet: true } } },
    });

    if (!request) throw new BadRequestException('Withdrawal request not found');

    return await this.prisma.$transaction(async (tx) => {
      // Update request status
      await tx.withdrawalRequest.update({
        where: { id: requestId },
        data: {
          status: 'APPROVED',
          processedBy: adminId,
          processedAt: new Date(),
        },
      });

      // Debit from wallet
      await tx.wallet.update({
        where: { userId: request.userId },
        data: {
          wthBalance: { decrement: request.totalAmount },
        },
      });

      // Create transaction record
      await tx.transaction.create({
        data: {
          walletId: request.user.wallet.id,
          amount: request.totalAmount,
          type: TransactionType.WITHDRAWAL,
          appSource: request.appSource,
          description: `Withdrawal via ${request.method}`,
          status: 'SUCCESS',
        },
      });

      // TODO: Process actual payment to user's account
      // await this.processPayment(request);

      return { success: true, amount: request.amount, fee: request.fee, userId: request.userId, method: request.method };
    });
  }

  /**
   * Get withdrawal requests for user
   */
  async getUserWithdrawalRequests(userId: string) {
    return await this.prisma.withdrawalRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all withdrawal requests (admin)
   */
  async getAllWithdrawalRequests(status?: string) {
    const where: any = {};
    if (status) where.status = status;

    return await this.prisma.withdrawalRequest.findMany({
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
