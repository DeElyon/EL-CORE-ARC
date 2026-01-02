import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../libs/database/prisma.service';
import { TransactionType, AppSource } from '@prisma/client';

export interface WithdrawalRequest {
  userId: string;
  amount: number;
  method: 'BANK' | 'CRYPTO' | 'PAYPAL';
  accountDetails: {
    accountNumber?: string;
    bankName?: string;
    cryptoAddress?: string;
    paypalEmail?: string;
  };
}

@Injectable()
export class WithdrawalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Process withdrawal request
   * In production, this would integrate with payment processors
   */
  async requestWithdrawal(request: WithdrawalRequest) {
    const { userId, amount, method, accountDetails } = request;

    return await this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        throw new BadRequestException('Wallet not found');
      }

      // Calculate withdrawal fee based on verseScore
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { verseScore: true },
      });

      // Higher verseScore = lower fees (0.5% to 2%)
      const feePercentage = user && user.verseScore > 1000 ? 0.005 : 0.02;
      const fee = amount * feePercentage;
      const totalDeduction = amount + fee;

      if (Number(wallet.wthBalance) < totalDeduction) {
        throw new BadRequestException('Insufficient balance');
      }

      // Debit from wallet
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          wthBalance: { decrement: totalDeduction },
        },
      });

      // Create withdrawal transaction
      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          amount: totalDeduction,
          type: TransactionType.WITHDRAWAL,
          appSource: AppSource.ELCODERS,
          description: `Withdrawal via ${method}`,
          status: 'PENDING', // Will be updated by webhook from payment processor
        },
      });

      // TODO: Integrate with payment processor (Paystack, Flutterwave, etc.)
      // This would trigger the actual bank/crypto transfer

      return {
        withdrawalId: wallet.id,
        amount,
        fee,
        totalDeduction,
        method,
        status: 'PENDING',
      };
    });
  }

  /**
   * Convert WTH to NGN (example rate: 1 WTH = 1000 NGN)
   */
  convertWthToNgn(wthAmount: number): number {
    const exchangeRate = parseFloat(process.env.WTH_EXCHANGE_RATE || '1000');
    return wthAmount * exchangeRate;
  }

  /**
   * Convert NGN to WTH
   */
  convertNgnToWth(ngnAmount: number): number {
    const exchangeRate = parseFloat(process.env.WTH_EXCHANGE_RATE || '1000');
    return ngnAmount / exchangeRate;
  }
}
