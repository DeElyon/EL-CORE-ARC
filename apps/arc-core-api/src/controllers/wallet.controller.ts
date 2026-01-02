import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FundingService } from '@el-verse/wallet-engine';
import { WithdrawalService } from '@el-verse/wallet-engine';
import { NotificationService } from '@el-verse/shared-utils';
import { JwtAuthGuard } from '@el-verse/auth-bridge';
import { CurrentUser } from '@el-verse/auth-bridge';
import { FundingMethod, AppSource } from '@prisma/client';

@ApiTags('Wallet')
@Controller('wallet')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(
    private readonly fundingService: FundingService,
    private readonly withdrawalService: WithdrawalService,
    private readonly notificationService: NotificationService,
  ) {}

  // ============================================
  // FUNDING OPERATIONS
  // ============================================

  @Post('funding/request')
  @ApiOperation({ summary: 'Create funding request' })
  async createFundingRequest(
    @CurrentUser() user: any,
    @Body() body: {
      amount: number;
      method: FundingMethod;
      appSource: AppSource;
      receiptUrl?: string;
      accountDetails?: any;
    },
  ) {
    return this.fundingService.createFundingRequest({
      userId: user.sub,
      amount: body.amount,
      method: body.method,
      appSource: body.appSource,
      receiptUrl: body.receiptUrl,
      accountDetails: body.accountDetails,
    });
  }

  @Post('funding/verify-fingerprint')
  @ApiOperation({ summary: 'Verify funding with fingerprint' })
  async verifyFundingFingerprint(
    @CurrentUser() user: any,
    @Body() body: { requestId: string; fingerprintData: string },
  ) {
    return this.fundingService.verifyFundingFingerprint(
      body.requestId,
      body.fingerprintData,
      user.sub,
    );
  }

  @Post('funding/approve')
  @ApiOperation({ summary: 'Approve funding request (admin)' })
  async approveFunding(
    @CurrentUser() user: any,
    @Body() body: { requestId: string; adminNotes?: string },
  ) {
    const result = await this.fundingService.approveFunding(
      body.requestId,
      user.sub,
      body.adminNotes,
    );

    // Notify user
    await this.notificationService.notifyFundingApproved(result.userId, Number(result.amount));

    return result;
  }

  @Get('funding/requests')
  @ApiOperation({ summary: 'Get user funding requests' })
  async getUserFundingRequests(@CurrentUser() user: any) {
    return this.fundingService.getUserFundingRequests(user.sub);
  }

  @Get('funding/requests/all')
  @ApiOperation({ summary: 'Get all funding requests (admin)' })
  async getAllFundingRequests(@Query('status') status?: string) {
    return this.fundingService.getAllFundingRequests(status);
  }

  // ============================================
  // WITHDRAWAL OPERATIONS
  // ============================================

  @Post('withdrawal/request')
  @ApiOperation({ summary: 'Request withdrawal' })
  async requestWithdrawal(
    @CurrentUser() user: any,
    @Body() body: {
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
    },
  ) {
    const result = await this.withdrawalService.requestWithdrawal({
      userId: user.sub,
      amount: body.amount,
      method: body.method,
      appSource: body.appSource,
      accountDetails: body.accountDetails,
      fingerprintData: body.fingerprintData,
      password: body.password,
    });

    // Notify admin
    const userData = await this.fundingService['prisma'].user.findUnique({
      where: { id: user.sub },
      select: { username: true },
    });

    await this.notificationService.notifyAdminWithdrawalRequest(
      result.withdrawalId,
      userData?.username || 'Unknown User',
      result.amount,
    );

    return result;
  }

  @Post('withdrawal/approve')
  @ApiOperation({ summary: 'Approve withdrawal (admin)' })
  async approveWithdrawal(
    @CurrentUser() user: any,
    @Body() body: { requestId: string },
  ) {
    const result = await this.withdrawalService.approveWithdrawal(body.requestId, user.sub);

    // Notify user
    await this.notificationService.notifyWithdrawalProcessed(
      result.userId,
      Number(result.amount),
      result.method,
    );

    return result;
  }

  @Get('withdrawal/requests')
  @ApiOperation({ summary: 'Get user withdrawal requests' })
  async getUserWithdrawalRequests(@CurrentUser() user: any) {
    return this.withdrawalService.getUserWithdrawalRequests(user.sub);
  }

  @Get('withdrawal/requests/all')
  @ApiOperation({ summary: 'Get all withdrawal requests (admin)' })
  async getAllWithdrawalRequests(@Query('status') status?: string) {
    return this.withdrawalService.getAllWithdrawalRequests(status);
  }

  // ============================================
  // NOTIFICATIONS
  // ============================================

  @Get('notifications')
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('unreadOnly') unreadOnly?: boolean,
  ) {
    return this.notificationService.getUserNotifications(user.sub, unreadOnly);
  }

  @Post('notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markNotificationRead(
    @CurrentUser() user: any,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(notificationId, user.sub);
  }
}