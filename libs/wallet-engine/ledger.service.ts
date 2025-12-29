import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class WalletEngine {
  constructor(private prisma: PrismaService) {}

  // Move money from Client to Escrow (MY SPACE -> ELCODERS)
  async lockEscrow(clientId: string, amount: number, projectId: string) {
    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.update({
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
          type: 'ESCROW_LOCK',
          appSource: 'MY_SPACE',
        },
      });
      return wallet;
    });
  }

  // Release money to Dev upon completion
  async releasePayment(devId: string, amount: number, clientId: string) {
    return await this.prisma.$transaction(async (tx) => {
      // decrement client escrow
      const clientWallet = await tx.wallet.update({
        where: { userId: clientId },
        data: { escrowBalance: { decrement: amount } },
      });

      // credit dev balance (create wallet if missing)
      const devWallet = await tx.wallet.upsert({
        where: { userId: devId },
        update: { wthBalance: { increment: amount } },
        create: { userId: devId, wthBalance: amount, escrowBalance: 0 },
      });

      await tx.transaction.create({
        data: {
          walletId: clientWallet.id,
          amount,
          type: 'ESCROW_RELEASE',
          appSource: 'ELCODERS',
        },
      });

      await tx.transaction.create({
        data: {
          walletId: devWallet.id,
          amount,
          type: 'CREDIT',
          appSource: 'ELCODERS',
        },
      });

      return { clientWallet, devWallet };
    });
  }
}
