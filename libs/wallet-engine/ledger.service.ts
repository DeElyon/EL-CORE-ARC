import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';
import { TransactionType, AppSource } from '@prisma/client';

@Injectable()
export class LedgerService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get wallet balance for a user
   */
  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!wallet) {
      // Create wallet if it doesn't exist
      return await this.prisma.wallet.create({
        data: { userId, wthBalance: 0, escrowBalance: 0 },
      });
    }

    return wallet;
  }

  /**
   * Credit WTH to a user's wallet
   */
  async credit(
    userId: string,
    amount: number,
    appSource: AppSource,
    description?: string,
    relatedId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.upsert({
        where: { userId },
        update: {
          wthBalance: { increment: amount },
        },
        create: {
          userId,
          wthBalance: amount,
          escrowBalance: 0,
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.CREDIT,
          appSource,
          description,
          relatedId,
          status: 'SUCCESS',
        },
      });

      return wallet;
    });
  }

  /**
   * Debit WTH from a user's wallet
   */
  async debit(
    userId: string,
    amount: number,
    appSource: AppSource,
    description?: string,
    relatedId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (Number(wallet.wthBalance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          wthBalance: { decrement: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.DEBIT,
          appSource,
          description,
          relatedId,
          status: 'SUCCESS',
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Transfer WTH between two users
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number,
    appSource: AppSource,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Debit from sender
      const fromWallet = await tx.wallet.findUnique({
        where: { userId: fromUserId },
      });

      if (!fromWallet || Number(fromWallet.wthBalance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      await tx.wallet.update({
        where: { userId: fromUserId },
        data: { wthBalance: { decrement: amount } },
      });

      // Credit to receiver
      const toWallet = await tx.wallet.upsert({
        where: { userId: toUserId },
        update: { wthBalance: { increment: amount } },
        create: {
          userId: toUserId,
          wthBalance: amount,
          escrowBalance: 0,
        },
      });

      // Create transactions
      await tx.transaction.createMany({
        data: [
          {
            walletId: fromWallet.id,
            amount,
            type: TransactionType.DEBIT,
            appSource,
            description: description || `Transfer to ${toUserId}`,
            status: 'SUCCESS',
          },
          {
            walletId: toWallet.id,
            amount,
            type: TransactionType.CREDIT,
            appSource,
            description: description || `Transfer from ${fromUserId}`,
            status: 'SUCCESS',
          },
        ],
      });

      return { fromWallet, toWallet };
    });
  }

  /**
   * Get transaction history
   */
  async getTransactions(userId: string, limit = 50) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return [];
    }

    return await this.prisma.transaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
