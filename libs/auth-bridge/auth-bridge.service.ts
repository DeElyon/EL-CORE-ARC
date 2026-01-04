import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../libs/database/prisma.service';
import { NotificationService } from '../../libs/shared-utils/notification.service';

export interface VerseTokenPayload {
  sub: string; // userId
  username: string;
  role: string;
  verseScore: number;
}

@Injectable()
export class AuthBridgeService {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Register a new user with biometric verification and OTP
   */
  async register(
    email: string,
    username: string,
    password: string,
    role?: string,
    fullName?: string,
    app?: string,
    facialData?: string,
    fingerprintData?: string,
  ) {
    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = await this.notificationService.sendOTP(email, username);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Generate Verse ID
    const { VerseIdGenerator } = await import('../../libs/shared-utils/verse-id.util');
    const generator = new VerseIdGenerator(this.prisma);
    const verseId = await generator.generate(app || 'NEXEL');

    // Create user with biometric data and OTP
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: (role as any) || 'LEARNER',
        fullName,
        displayName: fullName || username,
        verseId,
        verseIdGeneratedAt: new Date(),
        facialData,
        fingerprintData,
        isBiometricVerified: !!(facialData || fingerprintData),
        otpCode: otp,
        otpExpiresAt,
        isEmailVerified: false,
      },
    });

    // Create wallet
    await this.prisma.wallet.create({
      data: {
        userId: user.id,
        wthBalance: 0,
        escrowBalance: 0,
      },
    });

    return {
      message: 'Registration initiated. Please check your email for verification code.',
      userId: user.id,
      verseId: verseId,
      requiresVerification: true,
    };
  }

  /**
   * Verify OTP and complete registration
   */
  async verifyOTP(userId: string, otpCode: string) {
    const isValid = await this.notificationService.verifyOTP(userId, otpCode);

    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Get the verified user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateVerseToken(user);
  }

  /**
   * Login user
   */
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update last active
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    return this.generateVerseToken(user);
  }

  /**
   * Login using biometric data (fingerprint or facial data).
   * `identifier` can be email, username or verseId.
   */
  async loginWithBiometric(identifier: string, facialData?: string, fingerprintData?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }, { verseId: identifier }],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    // Simple equality check; production should use proper biometric matching
    const facialMatch = !facialData || user.facialData === facialData;
    const fingerprintMatch = !fingerprintData || user.fingerprintData === fingerprintData;

    if (!facialMatch && !fingerprintMatch) {
      throw new UnauthorizedException('Biometric verification failed');
    }

    await this.prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });

    return this.generateVerseToken(user);
  }

  /**
   * Generate Verse Token (JWT)
   */
  async generateVerseToken(user: any) {
    const payload: VerseTokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role,
      verseScore: user.verseScore,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        verseScore: user.verseScore,
      },
    };
  }

  /**
   * Verify token
   */
  async verifyToken(token: string): Promise<VerseTokenPayload> {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }

  /**
   * Get user from token
   */
  async getUserFromToken(token: string) {
    const payload = await this.verifyToken(token);
    return await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { wallet: true },
    });
  }

  async getUserByVerseId(verseId: string) {
    return await this.prisma.user.findUnique({
      where: { verseId },
      select: { id: true, email: true, username: true, fullName: true, verseId: true, avatarUrl: true },
    });
  }

  /**
   * Verify biometric data
   */
  async verifyBiometric(userId: string, facialData?: string, fingerprintData?: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { facialData: true, fingerprintData: true },
    });

    if (!user) return false;

    // Simple comparison - in production, use proper biometric matching algorithms
    const facialMatch = !facialData || user.facialData === facialData;
    const fingerprintMatch = !fingerprintData || user.fingerprintData === fingerprintData;

    return facialMatch && fingerprintMatch;
  }

  /**
   * Update biometric data
   */
  async updateBiometric(userId: string, facialData?: string, fingerprintData?: string) {
    const updateData: any = {};
    if (facialData) updateData.facialData = facialData;
    if (fingerprintData) updateData.fingerprintData = fingerprintData;
    if (facialData || fingerprintData) updateData.isBiometricVerified = true;

    return await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  }

  /**
   * Update dev streak
   */
  async updateDevStreak(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) return;

    const lastActive = user.lastActiveAt;
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);

    let newStreak = user.devStreak || 0;

    if (!lastActive) {
      // First time
      newStreak = 1;
    } else {
      const lastActiveDate = new Date(lastActive);
      const isSameDay =
        lastActiveDate.toDateString() === now.toDateString();
      const isConsecutive =
        lastActiveDate.toDateString() === yesterday.toDateString();

      if (isSameDay) {
        // Already signed in today
        return;
      } else if (isConsecutive) {
        // Consecutive day
        newStreak += 1;
      } else {
        // Streak broken
        newStreak = 1;
      }
    }

    // Update streak and verseScore
    const verseScoreIncrease = Math.min(newStreak * 10, 100); // Max 100 points per day

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        devStreak: newStreak,
        lastActiveAt: now,
        verseScore: { increment: verseScoreIncrease },
      },
    });

    return { streak: newStreak, verseScoreIncrease };
  }
}


