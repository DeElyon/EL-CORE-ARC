import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';

// Database
import { PrismaService } from '@el-verse/database';

// Auth
import { AuthBridgeService } from '@el-verse/auth-bridge';
import { JwtAuthGuard } from '@el-verse/auth-bridge';
import { RolesGuard } from '@el-verse/auth-bridge';

// Shared Utils
import { ChatService } from '@el-verse/shared-utils';
import { NotificationService } from '@el-verse/shared-utils';

// Wallet Engine
import {
  WalletEngineService,
  LedgerService,
  EscrowService,
  WithdrawalService,
  FundingService,
} from '@el-verse/wallet-engine';

// AI Hub
import {
  AiHubService,
  AiCoreService,
  BuddyAI,
  NellyAI,
  LinaAI,
  UnoAI,
  LibrarianAI,
} from '@el-verse/ai-hub';

// Services
import { NexelService } from '@el-verse/nexel-service';
import { NexelController } from '@el-verse/nexel-service';
import { CodersService } from '@el-verse/coders-service';
import { CodersController } from '@el-verse/coders-service';
import { AccessService } from '@el-verse/access-service';
import { AccessController } from '@el-verse/access-service';
import { MySpaceService } from '@el-verse/myspace-service';
import { MySpaceController } from '@el-verse/myspace-service';
import { ElitesService } from '@el-verse/elites-service';
import { ElitesController } from '@el-verse/elites-service';
import { ProcessingService, MediaService } from '@el-verse/shared-utils';
import { MediaController } from './controllers/media.controller';
import { CallController } from './controllers/call.controller';
import { CallService } from './services/call.service';

// Gateways
import { ChatGateway } from './gateways/chat.gateway';
import { StreamGateway } from './gateways/stream.gateway';
import { IdeGateway } from './gateways/ide.gateway';
import { NotificationGateway } from './gateways/notification.gateway';
import { CallGateway } from './gateways/call.gateway';
import { RecordingsController } from './controllers/recordings.controller';
import { RecordingService } from '@el-verse/shared-utils';

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
    MediaController,
    CallController,
    RecordingsController,
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
    MediaService,

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
    CallGateway,
    // Media processing
    ProcessingService,
    RecordingService,
    // Call services
    CallService,
  ],
})
export class AppModule {}
