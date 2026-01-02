import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CodersService } from './coders.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { RolesGuard } from '../../../libs/auth-bridge/guards/roles.guard';
import { Roles } from '../../../libs/auth-bridge/decorators/roles.decorator';
import { CurrentUser } from '../../../libs/auth-bridge/decorators/current-user.decorator';

@ApiTags('ELCODERS')
@Controller('coders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CodersController {
  constructor(private readonly codersService: CodersService) {}

  @Post('projects')
  @ApiOperation({ summary: 'Create a project' })
  @Roles('CLIENT', 'COMPANY')
  @UseGuards(RolesGuard)
  async createProject(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description: string;
      budget: number;
      techStack: string[];
    },
  ) {
    return this.codersService.createProject(
      user.sub,
      body.title,
      body.description,
      body.budget,
      body.techStack,
    );
  }

  @Post('projects/:projectId/milestones')
  @ApiOperation({ summary: 'Create milestone' })
  async createMilestone(
    @Param('projectId') projectId: string,
    @Body() body: {
      title: string;
      description: string;
      amount: number;
      dueDate?: string;
    },
  ) {
    return this.codersService.createMilestone(
      projectId,
      body.title,
      body.description,
      body.amount,
      body.dueDate ? new Date(body.dueDate) : undefined,
    );
  }

  @Post('projects/:projectId/submit')
  @ApiOperation({ summary: 'Submit code' })
  @Roles('DEVELOPER')
  @UseGuards(RolesGuard)
  async submitCode(
    @CurrentUser() user: any,
    @Param('projectId') projectId: string,
    @Body() body: {
      title: string;
      description: string;
      codeUrl?: string;
    },
  ) {
    return this.codersService.submitCode(
      projectId,
      user.sub,
      body.title,
      body.description,
      body.codeUrl,
    );
  }

  @Post('milestones/:milestoneId/approve')
  @ApiOperation({ summary: 'Approve milestone and release payment' })
  async approveMilestone(
    @CurrentUser() user: any,
    @Param('milestoneId') milestoneId: string,
    @Body() body: { projectId: string; developerId: string },
  ) {
    return this.codersService.approveMilestone(
      milestoneId,
      body.projectId,
      user.sub,
      body.developerId,
    );
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get developer dashboard' })
  @Roles('DEVELOPER')
  @UseGuards(RolesGuard)
  async getDashboard(@CurrentUser() user: any) {
    return this.codersService.getDashboard(user.sub);
  }

  @Post('sessions')
  @ApiOperation({ summary: 'Start code session' })
  async startSession(
    @CurrentUser() user: any,
    @Body() body: { projectId: string },
  ) {
    return this.codersService.startCodeSession(body.projectId, user.sub);
  }

  @Post('sessions/:sessionId/shadow')
  @ApiOperation({ summary: 'Join shadow mode' })
  @Roles('INTERN')
  @UseGuards(RolesGuard)
  async joinShadow(
    @CurrentUser() user: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.codersService.joinShadowMode(sessionId, user.sub);
  }
}


