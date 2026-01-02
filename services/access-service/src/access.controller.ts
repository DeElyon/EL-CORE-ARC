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
}


