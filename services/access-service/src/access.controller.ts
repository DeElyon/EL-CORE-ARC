import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccessService } from './access.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { RolesGuard } from '../../../libs/auth-bridge/guards/roles.guard';
import { Roles } from '../../../libs/auth-bridge/decorators/roles.decorator';
import { CurrentUser } from '../../../libs/auth-bridge/decorators/current-user.decorator';

@ApiTags('EL ACCESS')
@Controller('access')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccessController {
  constructor(private readonly accessService: AccessService) {}

  @Post('internships')
  @ApiOperation({ summary: 'Create internship' })
  @Roles('INTERN')
  @UseGuards(RolesGuard)
  async createInternship(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description: string;
      stipend: number;
    },
  ) {
    return this.accessService.createInternship(
      user.sub,
      body.title,
      body.description,
      body.stipend,
    );
  }

  @Post('tasks/:taskId/submit')
  @ApiOperation({ summary: 'Submit task' })
  async submitTask(
    @Param('taskId') taskId: string,
    @Body() body: { submissionUrl?: string },
  ) {
    return this.accessService.submitTask(taskId, body.submissionUrl);
  }

  @Get('tasks/:taskId/hint')
  @ApiOperation({ summary: 'Get hint for stuck task' })
  async getHint(@CurrentUser() user: any, @Param('taskId') taskId: string) {
    return this.accessService.getHint(taskId, user.sub);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get intern dashboard' })
  @Roles('INTERN')
  @UseGuards(RolesGuard)
  async getDashboard(@CurrentUser() user: any) {
    return this.accessService.getDashboard(user.sub);
  }

  @Post('mock-interview')
  @ApiOperation({ summary: 'Request mock interview' })
  async requestMockInterview(
    @CurrentUser() user: any,
    @Body() body: { position: string },
  ) {
    return this.accessService.requestMockInterview(user.sub, body.position);
  }

  @Get('cv')
  @ApiOperation({ summary: 'Generate CV' })
  async generateCV(@CurrentUser() user: any) {
    return this.accessService.generateCV(user.sub);
  }

  @Post('internships/:id/tutorials')
  @ApiOperation({ summary: 'Embed tutorial video for internship' })
  async embedTutorial(
    @Param('id') id: string,
    @Body() body: { title: string; videoUrl: string },
  ) {
    return this.accessService.embedTutorial(id, body.title, body.videoUrl);
  }

  @Post('tasks/:taskId/peer-help')
  @ApiOperation({ summary: 'Request peer help for a task (moderated)' })
  async requestPeerHelp(@Param('taskId') taskId: string, @CurrentUser() user: any, @Body() body: { message: string }) {
    return this.accessService.requestPeerHelp(taskId, user.sub, body.message);
  }

  @Post('badges')
  @ApiOperation({ summary: 'Award badge to a user' })
  async awardBadge(@Body() body: { userId: string; badgeKey: string; reason?: string }) {
    return this.accessService.awardBadge(body.userId, body.badgeKey, body.reason);
  }

  @Get('leaderboard')
  @ApiOperation({ summary: 'Get leaderboard' })
  async getLeaderboard() {
    return this.accessService.getLeaderboard(20);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get progress analytics for current user' })
  async getAnalytics(@CurrentUser() user: any) {
    return this.accessService.getProgressAnalytics(user.sub);
  }

  @Get('calendar')
  @ApiOperation({ summary: 'Get calendar view (Gantt chart) for tasks' })
  async getCalendar(@CurrentUser() user: any) {
    return this.accessService.getCalendarView(user.sub);
  }

  @Post('tasks/:taskId/reminder')
  @ApiOperation({ summary: 'Send deadline reminder notification' })
  async sendReminder(@Param('taskId') taskId: string) {
    return this.accessService.sendDeadlineReminder(taskId);
  }

  @Post('internships/:id/integrations/github')
  @ApiOperation({ summary: 'Connect GitHub repository' })
  async connectGitHub(
    @Param('id') id: string,
    @Body() body: { repoUrl: string; accessToken?: string },
  ) {
    return this.accessService.connectGitHubRepo(id, body.repoUrl, body.accessToken);
  }

  @Post('internships/:id/integrations/replit')
  @ApiOperation({ summary: 'Connect Replit project' })
  async connectReplit(
    @Param('id') id: string,
    @Body() body: { projectUrl: string },
  ) {
    return this.accessService.connectReplitProject(id, body.projectUrl);
  }

  @Post('internships/:id/integrations/drive')
  @ApiOperation({ summary: 'Connect Google Drive folder' })
  async connectDrive(
    @Param('id') id: string,
    @Body() body: { folderId: string; accessToken?: string },
  ) {
    return this.accessService.connectGoogleDrive(id, body.folderId, body.accessToken);
  }

  @Post('tasks/:taskId/collaborate')
  @ApiOperation({ summary: 'Start collaboration session for group task' })
  async startCollaboration(
    @Param('taskId') taskId: string,
    @Body() body: { participants: string[] },
  ) {
    return this.accessService.startCollaborationSession(taskId, body.participants);
  }
}


