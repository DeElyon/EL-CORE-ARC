import { Injectable } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { EscrowService } from './escrow.service';
import { WithdrawalService } from './withdrawal.service';

/**
 * Main Wallet Engine Service
 * Orchestrates all wallet operations
 */
@Injectable()
export class WalletEngineService {
  constructor(
    private ledger: LedgerService,
    private escrow: EscrowService,
    private withdrawal: WithdrawalService,
  ) {}

  getLedger() {
    return this.ledger;
  }

  getEscrow() {
    return this.escrow;
  }

  getWithdrawal() {
    return this.withdrawal;
  }
}
