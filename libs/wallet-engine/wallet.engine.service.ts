@Injectable()
export class WalletEngine {
  constructor(private prisma: PrismaService) {}

  // Lock money in Escrow when a project starts on MY SPACE
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
        data: { walletId: wallet.id, amount, type: 'ESCROW_LOCK', appSource: 'MY_SPACE' },
      });
      return wallet;
    });
  }

  // Release Escrow to Developer when ELCODERS milestone is verified by Lina AI
  async releaseEscrow(developerId: string, amount: number, clientId: string) {
    return await this.prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: clientId },
        data: { escrowBalance: { decrement: amount } },
      });

      const devWallet = await tx.wallet.update({
        where: { userId: developerId },
        data: { wthBalance: { increment: amount } },
      });

      await tx.transaction.create({
        data: { walletId: devWallet.id, amount, type: 'ESCROW_RELEASE', appSource: 'ELCODERS' },
      });
      return devWallet;
    });
  }
}
