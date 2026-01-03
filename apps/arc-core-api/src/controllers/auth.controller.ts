import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthBridgeService } from '@el-verse/auth-bridge';
import { JwtAuthGuard } from '@el-verse/auth-bridge';
import { CurrentUser } from '@el-verse/auth-bridge';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authBridge: AuthBridgeService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(
    @Body() body: {
      email: string;
      username: string;
      password: string;
      role?: string;
      fullName?: string;
      app?: string; // ELCODERS, NEXEL, EL_ACCESS, MY_SPACE, ELITES
      facialData?: string;
      fingerprintData?: string;
    },
  ) {
    return this.authBridge.register(
      body.email,
      body.username,
      body.password,
      body.role,
      body.fullName,
      body.app,
      body.facialData,
      body.fingerprintData,
    );
  }

  @Get('lookup/:verseId')
  @ApiOperation({ summary: 'Lookup user by Verse ID' })
  async lookupByVerseId(@Param('verseId') verseId: string) {
    return this.authBridge.getUserByVerseId(verseId);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and complete registration' })
  async verifyOTP(@Body() body: { userId: string; otpCode: string }) {
    return this.authBridge.verifyOTP(body.userId, body.otpCode);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  async login(@Body() body: { email: string; password: string }) {
    return this.authBridge.login(body.email, body.password);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@CurrentUser() user: any) {
    const userData = await this.authBridge['prisma'].user.findUnique({
      where: { id: user.sub },
      include: { wallet: true },
    });
    return userData;
  }

  @Post('verify-biometric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify biometric data' })
  async verifyBiometric(
    @CurrentUser() user: any,
    @Body() body: { facialData?: string; fingerprintData?: string },
  ) {
    return this.authBridge.verifyBiometric(user.sub, body.facialData, body.fingerprintData);
  }

  @Post('update-biometric')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update biometric data' })
  async updateBiometric(
    @CurrentUser() user: any,
    @Body() body: { facialData?: string; fingerprintData?: string },
  ) {
    return this.authBridge.updateBiometric(user.sub, body.facialData, body.fingerprintData);
  }

  @Post('dev-streak')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update dev streak (daily sign-in)' })
  async updateDevStreak(@CurrentUser() user: any) {
    return this.authBridge.updateDevStreak(user.sub);
  }
}


