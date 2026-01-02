import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthBridgeService } from '../../libs/auth-bridge/auth-bridge.service';
import { JwtAuthGuard } from '../../libs/auth-bridge/guards/jwt-auth.guard';
import { CurrentUser } from '../../libs/auth-bridge/decorators/current-user.decorator';

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
    },
  ) {
    return this.authBridge.register(
      body.email,
      body.username,
      body.password,
      body.role,
    );
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

  @Post('dev-streak')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update dev streak (daily sign-in)' })
  async updateDevStreak(@CurrentUser() user: any) {
    return this.authBridge.updateDevStreak(user.sub);
  }
}


