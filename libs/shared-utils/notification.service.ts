import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { Prisma, NotificationType, AppSource } from '@prisma/client';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotificationService {
  private transporter: nodemailer.Transporter;

  constructor(private prisma: PrismaService) {
    // Configure nodemailer
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'elcoderssoftwares12@gmail.com',
        pass: process.env.EMAIL_PASS || 'Amunra1233@@',
      },
    });
  }

  /**
   * Create notification
   */
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    appSource: AppSource,
    relatedId?: string,
  ) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        appSource,
        relatedId,
      },
    });

    // Send email notification
    await this.sendEmailNotification(userId, title, message);

    return notification;
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(userId: string, subject: string, message: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, username: true },
      });

      if (!user) return;

      await this.transporter.sendMail({
        from: process.env.EMAIL_USER || 'elcoderssoftwares12@gmail.com',
        to: user.email,
        subject: `EL VERSE - ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">EL VERSE Notification</h2>
            <p>Hello ${user.username},</p>
            <p>${message}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is an automated notification from EL VERSE.
            </p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Email notification failed:', error);
    }
  }

  /**
   * Notify payment made
   */
  async notifyPayment(userId: string, amount: number, description: string, appSource: AppSource) {
    return this.createNotification(
      userId,
      NotificationType.PAYMENT,
      'Payment Processed',
      `Your payment of ${amount} WTH has been processed: ${description}`,
      appSource,
    );
  }

  /**
   * Notify job posted
   */
  async notifyJobPosted(clientId: string, jobTitle: string) {
    return this.createNotification(
      clientId,
      Prisma.NotificationType.JOB_POSTED,
      'Job Posted Successfully',
      `Your job "${jobTitle}" has been posted and is now visible to developers.`,
      Prisma.AppSource.MY_SPACE,
    );
  }

  /**
   * Notify project assigned
   */
  async notifyProjectAssigned(developerId: string, projectTitle: string) {
    return this.createNotification(
      developerId,
      Prisma.NotificationType.PROJECT_ASSIGNED,
      'Project Assigned',
      `You have been assigned to project: "${projectTitle}"`,
      Prisma.AppSource.ELCODERS,
    );
  }

  /**
   * Notify contract accepted
   */
  async notifyContractAccepted(clientId: string, developerName: string, projectTitle: string) {
    return this.createNotification(
      clientId,
      Prisma.NotificationType.CONTRACT_ACCEPTED,
      'Contract Accepted',
      `Developer ${developerName} has accepted the contract for "${projectTitle}"`,
      Prisma.AppSource.MY_SPACE,
    );
  }

  /**
   * Notify class starting
   */
  async notifyClassStarting(studentId: string, courseTitle: string, startTime: Date) {
    return this.createNotification(
      studentId,
      Prisma.NotificationType.CLASS_STARTING,
      'Class Starting Soon',
      `Your enrolled course "${courseTitle}" is starting at ${startTime.toLocaleString()}`,
      Prisma.AppSource.ELITES,
    );
  }

  /**
   * Notify funding approved
   */
  async notifyFundingApproved(userId: string, amount: number) {
    return this.createNotification(
      userId,
      Prisma.NotificationType.FUNDING_APPROVED,
      'Funding Approved',
      `Your funding request of ${amount} WTH has been approved and credited to your wallet.`,
      Prisma.AppSource.NEXEL, // Can be any app source
    );
  }

  /**
   * Notify withdrawal processed
   */
  async notifyWithdrawalProcessed(userId: string, amount: number, method: string) {
    return this.createNotification(
      userId,
      Prisma.NotificationType.WITHDRAWAL_PROCESSED,
      'Withdrawal Processed',
      `Your withdrawal of ${amount} WTH via ${method} has been processed.`,
      Prisma.AppSource.NEXEL, // Can be any app source
    );
  }

  /**
   * Notify marketplace purchase
   */
  async notifyMarketplacePurchase(sellerId: string, buyerName: string, itemTitle: string) {
    return this.createNotification(
      sellerId,
      Prisma.NotificationType.MARKETPLACE_SALE,
      'New Purchase',
      `${buyerName} has purchased your item "${itemTitle}". Please confirm the transaction to release funds.`,
      Prisma.AppSource.NEXEL,
    );
  }

  /**
   * Notify marketplace sale confirmed
   */
  async notifyMarketplaceSaleConfirmed(buyerId: string, sellerName: string, itemTitle: string) {
    return this.createNotification(
      buyerId,
      Prisma.NotificationType.MARKETPLACE_PURCHASE,
      'Purchase Confirmed',
      `Seller ${sellerName} has confirmed your purchase of "${itemTitle}". Funds have been released.`,
      Prisma.AppSource.NEXEL,
    );
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, unreadOnly = false) {
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    return await this.prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    return await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }

  /**
   * Notify admin of withdrawal request
   */
  async notifyAdminWithdrawalRequest(withdrawalId: string, userName: string, amount: number) {
    // In production, send to admin email
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER || 'elcoderssoftwares12@gmail.com',
        to: process.env.ADMIN_EMAIL || 'elcoderssoftwares12@gmail.com',
        subject: 'New Withdrawal Request - EL VERSE',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">New Withdrawal Request</h2>
            <p><strong>User:</strong> ${userName}</p>
            <p><strong>Amount:</strong> ${amount} WTH</p>
            <p><strong>Withdrawal ID:</strong> ${withdrawalId}</p>
            <p>Please review and process this withdrawal request in the admin dashboard.</p>
          </div>
        `,
      });
    } catch (error) {
      console.error('Admin notification failed:', error);
    }
  }

  /**
   * Generate and send OTP for user verification
   */
  async sendOTP(email: string, username: string): Promise<string> {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_USER || 'elcoderssoftwares12@gmail.com',
        to: email,
        subject: 'EL VERSE - Email Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Welcome to EL VERSE!</h2>
            <p>Hello ${username},</p>
            <p>Your verification code is:</p>
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p>This code will expire in 10 minutes. Please use it to complete your registration.</p>
            <p>If you didn't request this code, please ignore this email.</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
              This is an automated message from EL VERSE. Please do not reply to this email.
            </p>
          </div>
        `,
      });

      return otp;
    } catch (error) {
      console.error('OTP email failed:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  /**
   * Verify OTP code
   */
  async verifyOTP(userId: string, otpCode: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { otpCode: true, otpExpiresAt: true },
    });

    if (!user || !user.otpCode || !user.otpExpiresAt) {
      return false;
    }

    const now = new Date();
    const isExpired = now > user.otpExpiresAt;
    const isValid = user.otpCode === otpCode;

    if (isValid && !isExpired) {
      // Clear OTP after successful verification
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          otpCode: null,
          otpExpiresAt: null,
          isEmailVerified: true,
        },
      });
      return true;
    }

    return false;
  }
}