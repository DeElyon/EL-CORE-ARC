import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

// Database
import { PrismaService } from '../../../libs/database/prisma.service';

// Auth
import { AuthBridgeService } from '../../../libs/auth-bridge/auth-bridge.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { RolesGuard } from '../../../libs/auth-bridge/guards/roles.guard';

// Shared Utils
import { ChatService } from '../../../libs/shared-utils/chat.service';
import { NotificationService } from '../../../libs/shared-utils/notification.service';

// Wallet Engine
import {
  WalletEngineService,
  LedgerService,
  EscrowService,
  WithdrawalService,
  FundingService,
} from '../../../libs/wallet-engine';

// AI Hub
import {
  AiHubService,
  AiCoreService,
  BuddyAI,
  NellyAI,
  LinaAI,
  UnoAI,
  LibrarianAI,
} from '../../../libs/ai-hub';

// Services
import { NexelService } from '../../../services/nexel-service/src/nexel.service';
import { NexelController } from '../../../services/nexel-service/src/nexel.controller';
import { CodersService } from '../../../services/coders-service/src/coders.service';
import { CodersController } from '../../../services/coders-service/src/coders.controller';
import { AccessService } from '../../../services/access-service/src/access.service';
import { AccessController } from '../../../services/access-service/src/access.controller';
import { MySpaceService } from '../../../services/myspace-service/src/myspace.service';
import { MySpaceController } from '../../../services/myspace-service/src/myspace.controller';
import { ElitesService } from '../../../services/elites-service/src/elites.service';
import { ElitesController } from '../../../services/elites-service/src/elites.controller';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';
import { StreamGateway } from './gateways/stream.gateway';
import { IdeGateway } from './gateways/ide.gateway';
import { NotificationGateway } from './gateways/notification.gateway';

// Auth Controller
import { AuthController } from './controllers/auth.controller';
import { ChatController } from './controllers/chat.controller';
import { WalletController } from './controllers/wallet.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'el-verse-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    NexelController,
    CodersController,
    AccessController,
    MySpaceController,
    ElitesController,
    AuthController,
    ChatController,
    WalletController,
  ],
  providers: [
    // Database
    PrismaService,

    // Auth
    AuthBridgeService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    RolesGuard,

    // Wallet Engine
    LedgerService,
    EscrowService,
    WithdrawalService,
    FundingService,
    WalletEngineService,

    // AI Hub
    AiCoreService,
    BuddyAI,
    NellyAI,
    LinaAI,
    UnoAI,
    LibrarianAI,
    AiHubService,

    // Shared Utils
    ChatService,
    NotificationService,

    // Services
    NexelService,
    CodersService,
    AccessService,
    MySpaceService,
    ElitesService,

    // Gateways
    ChatGateway,
    StreamGateway,
    IdeGateway,
    NotificationGateway,
  ],
})
export class AppModule {}
