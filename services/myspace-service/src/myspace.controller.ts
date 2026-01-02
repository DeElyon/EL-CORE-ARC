import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MySpaceService } from './myspace.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { RolesGuard } from '../../../libs/auth-bridge/guards/roles.guard';
import { Roles } from '../../../libs/auth-bridge/decorators/roles.decorator';
import { CurrentUser } from '../../../libs/auth-bridge/decorators/current-user.decorator';

@ApiTags('MY SPACE')
@Controller('myspace')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MySpaceController {
  constructor(private readonly mySpaceService: MySpaceService) {}

  @Post('verify-entry')
  @ApiOperation({ summary: 'Verify gated entry payment' })
  async verifyEntry(
    @CurrentUser() user: any,
    @Body() body: { tier: 'FREELANCER' | 'CLIENT' | 'STARTUP' },
  ) {
    return this.mySpaceService.verifyGatedEntry(user.sub, body.tier);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Create job posting' })
  @Roles('CLIENT', 'COMPANY')
  @UseGuards(RolesGuard)
  async createJob(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description: string;
      budget: number;
      techStack: string[];
    },
  ) {
    return this.mySpaceService.createJob(
      user.sub,
      body.title,
      body.description,
      body.budget,
      body.techStack,
    );
  }

  @Post('jobs/:jobId/bids')
  @ApiOperation({ summary: 'Place a bid' })
  @Roles('DEVELOPER')
  @UseGuards(RolesGuard)
  async placeBid(
    @CurrentUser() user: any,
    @Param('jobId') jobId: string,
    @Body() body: { amount: number; proposal: string },
  ) {
    return this.mySpaceService.placeBid(
      jobId,
      user.sub,
      body.amount,
      body.proposal,
    );
  }

  @Post('bids/:bidId/accept')
  @ApiOperation({ summary: 'Accept a bid' })
  async acceptBid(
    @CurrentUser() user: any,
    @Param('bidId') bidId: string,
  ) {
    return this.mySpaceService.acceptBid(bidId, user.sub);
  }

  @Post('squads')
  @ApiOperation({ summary: 'Create a squad' })
  @Roles('COMPANY')
  @UseGuards(RolesGuard)
  async createSquad(
    @CurrentUser() user: any,
    @Body() body: {
      name: string;
      seniorDevId: string;
      juniorDevId?: string;
      internId?: string;
    },
  ) {
    return this.mySpaceService.createSquad(
      user.sub,
      body.name,
      body.seniorDevId,
      body.juniorDevId,
      body.internId,
    );
  }

  @Get('recommendations')
  @ApiOperation({ summary: 'Get job recommendations (Buddy)' })
  @Roles('COMPANY')
  @UseGuards(RolesGuard)
  async getRecommendations(@CurrentUser() user: any) {
    return this.mySpaceService.getJobRecommendations(user.sub);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get freelancer dashboard' })
  @Roles('DEVELOPER')
  @UseGuards(RolesGuard)
  async getDashboard(@CurrentUser() user: any) {
    return this.mySpaceService.getFreelancerDashboard(user.sub);
  }
}


