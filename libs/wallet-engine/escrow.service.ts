import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';
import { TransactionType, AppSource } from '@prisma/client';

@Injectable()
export class EscrowService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lock funds in escrow for a project
   */
  async lockEscrow(
    clientId: string,
    amount: number,
    projectId: string,
    description?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: clientId },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      if (Number(wallet.wthBalance) < amount) {
        throw new BadRequestException('Insufficient balance');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId: clientId },
        data: {
          wthBalance: { decrement: amount },
          escrowBalance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.ESCROW_LOCK,
          appSource: AppSource.MY_SPACE,
          description: description || `Escrow for project ${projectId}`,
          relatedId: projectId,
          status: 'SUCCESS',
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Release escrow funds to developer
   */
  async releaseEscrow(
    clientId: string,
    developerId: string,
    amount: number,
    projectId: string,
    milestoneId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // Verify client has enough in escrow
      const clientWallet = await tx.wallet.findUnique({
        where: { userId: clientId },
      });

      if (!clientWallet || Number(clientWallet.escrowBalance) < amount) {
        throw new BadRequestException('Insufficient escrow balance');
      }

      // Decrement client escrow
      await tx.wallet.update({
        where: { userId: clientId },
        data: {
          escrowBalance: { decrement: amount },
        },
      });

      // Credit developer
      const devWallet = await tx.wallet.upsert({
        where: { userId: developerId },
        update: {
          wthBalance: { increment: amount },
        },
        create: {
          userId: developerId,
          wthBalance: amount,
          escrowBalance: 0,
        },
      });

      // Create transactions
      await tx.transaction.createMany({
        data: [
          {
            walletId: clientWallet.id,
            amount,
            type: TransactionType.ESCROW_RELEASE,
            appSource: AppSource.ELCODERS,
            description: `Payment released for project ${projectId}`,
            relatedId: projectId,
            status: 'SUCCESS',
          },
          {
            walletId: devWallet.id,
            amount,
            type: TransactionType.CREDIT,
            appSource: AppSource.ELCODERS,
            description: `Payment received for project ${projectId}`,
            relatedId: milestoneId || projectId,
            status: 'SUCCESS',
          },
        ],
      });

      return { clientWallet, devWallet };
    });
  }

  /**
   * Refund escrow back to client (if project cancelled)
   */
  async refundEscrow(
    clientId: string,
    amount: number,
    projectId: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId: clientId },
      });

      if (!wallet || Number(wallet.escrowBalance) < amount) {
        throw new BadRequestException('Insufficient escrow balance');
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId: clientId },
        data: {
          escrowBalance: { decrement: amount },
          wthBalance: { increment: amount },
        },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount,
          type: TransactionType.ESCROW_RELEASE,
          appSource: AppSource.MY_SPACE,
          description: `Refund for cancelled project ${projectId}`,
          relatedId: projectId,
          status: 'SUCCESS',
        },
      });

      return updatedWallet;
    });
  }

  /**
   * Get escrow balance for a user
   */
  async getEscrowBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      select: { escrowBalance: true },
    });

    return wallet ? Number(wallet.escrowBalance) : 0;
  }
}
