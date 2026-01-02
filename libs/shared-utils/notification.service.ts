import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationType, AppSource } from '@prisma/client';
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
      NotificationType.JOB_POSTED,
      'Job Posted Successfully',
      `Your job "${jobTitle}" has been posted and is now visible to developers.`,
      AppSource.MY_SPACE,
    );
  }

  /**
   * Notify project assigned
   */
  async notifyProjectAssigned(developerId: string, projectTitle: string) {
    return this.createNotification(
      developerId,
      NotificationType.PROJECT_ASSIGNED,
      'Project Assigned',
      `You have been assigned to project: "${projectTitle}"`,
      AppSource.ELCODERS,
    );
  }

  /**
   * Notify contract accepted
   */
  async notifyContractAccepted(clientId: string, developerName: string, projectTitle: string) {
    return this.createNotification(
      clientId,
      NotificationType.CONTRACT_ACCEPTED,
      'Contract Accepted',
      `Developer ${developerName} has accepted the contract for "${projectTitle}"`,
      AppSource.MY_SPACE,
    );
  }

  /**
   * Notify class starting
   */
  async notifyClassStarting(studentId: string, courseTitle: string, startTime: Date) {
    return this.createNotification(
      studentId,
      NotificationType.CLASS_STARTING,
      'Class Starting Soon',
      `Your enrolled course "${courseTitle}" is starting at ${startTime.toLocaleString()}`,
      AppSource.ELITES,
    );
  }

  /**
   * Notify funding approved
   */
  async notifyFundingApproved(userId: string, amount: number) {
    return this.createNotification(
      userId,
      NotificationType.FUNDING_APPROVED,
      'Funding Approved',
      `Your funding request of ${amount} WTH has been approved and credited to your wallet.`,
      AppSource.NEXEL, // Can be any app source
    );
  }

  /**
   * Notify withdrawal processed
   */
  async notifyWithdrawalProcessed(userId: string, amount: number, method: string) {
    return this.createNotification(
      userId,
      NotificationType.WITHDRAWAL_PROCESSED,
      'Withdrawal Processed',
      `Your withdrawal of ${amount} WTH via ${method} has been processed.`,
      AppSource.NEXEL, // Can be any app source
    );
  }

  /**
   * Notify marketplace purchase
   */
  async notifyMarketplacePurchase(sellerId: string, buyerName: string, itemTitle: string) {
    return this.createNotification(
      sellerId,
      NotificationType.MARKETPLACE_SALE,
      'New Purchase',
      `${buyerName} has purchased your item "${itemTitle}". Please confirm the transaction to release funds.`,
      AppSource.NEXEL,
    );
  }

  /**
   * Notify marketplace sale confirmed
   */
  async notifyMarketplaceSaleConfirmed(buyerId: string, sellerName: string, itemTitle: string) {
    return this.createNotification(
      buyerId,
      NotificationType.MARKETPLACE_PURCHASE,
      'Purchase Confirmed',
      `Seller ${sellerName} has confirmed your purchase of "${itemTitle}". Funds have been released.`,
      AppSource.NEXEL,
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
}