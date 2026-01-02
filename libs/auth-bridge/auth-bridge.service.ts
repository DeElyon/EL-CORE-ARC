import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../libs/database/prisma.service';

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
  ) {}

  /**
   * Register a new user with biometric verification
   */
  async register(
    email: string,
    username: string,
    password: string,
    role?: string,
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

    // Create user with biometric data
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        role: (role as any) || 'LEARNER',
        facialData,
        fingerprintData,
        isBiometricVerified: !!(facialData || fingerprintData),
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


