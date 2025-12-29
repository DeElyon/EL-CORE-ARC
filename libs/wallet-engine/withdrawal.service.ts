export class WithdrawalService {
  requestPayout(account: string, amount: number, currency: string) {
    // Stub payout logic
    return { account, amount, currency, status: 'pending' };
  }
}
