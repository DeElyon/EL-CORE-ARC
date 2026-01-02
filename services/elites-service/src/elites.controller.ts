import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ElitesService } from './elites.service';
import { JwtAuthGuard } from '../../../libs/auth-bridge/guards/jwt-auth.guard';
import { RolesGuard } from '../../../libs/auth-bridge/guards/roles.guard';
import { Roles } from '../../../libs/auth-bridge/decorators/roles.decorator';
import { CurrentUser } from '../../../libs/auth-bridge/decorators/current-user.decorator';

@ApiTags('ELITES')
@Controller('elites')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ElitesController {
  constructor(private readonly elitesService: ElitesService) {}

  @Post('courses')
  @ApiOperation({ summary: 'Create a course' })
  async createCourse(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description: string;
      price: number;
      difficulty: string;
      category: string;
    },
  ) {
    return this.elitesService.createCourse(
      user.sub,
      body.title,
      body.description,
      body.price,
      body.difficulty,
      body.category,
    );
  }

  @Post('courses/:courseId/enroll')
  @ApiOperation({ summary: 'Enroll in course' })
  async enrollInCourse(
    @CurrentUser() user: any,
    @Param('courseId') courseId: string,
  ) {
    return this.elitesService.enrollInCourse(user.sub, courseId);
  }

  @Post('lessons/:lessonId/help')
  @ApiOperation({ summary: 'Get help from Librarian' })
  async getHelp(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
    @Body() body: { question: string },
  ) {
    return this.elitesService.getLessonHelp(lessonId, body.question, user.sub);
  }

  @Post('lessons/:lessonId/complete')
  @ApiOperation({ summary: 'Complete a lesson' })
  async completeLesson(
    @CurrentUser() user: any,
    @Param('lessonId') lessonId: string,
  ) {
    return this.elitesService.completeLesson(lessonId, user.sub);
  }

  @Post('quizzes')
  @ApiOperation({ summary: 'Generate quiz' })
  async generateQuiz(
    @Body() body: { lessonId: string; difficulty: 'EASY' | 'MEDIUM' | 'HARD' },
  ) {
    return this.elitesService.generateQuiz(body.lessonId, body.difficulty);
  }

  @Post('quizzes/:quizId/submit')
  @ApiOperation({ summary: 'Submit quiz answers' })
  async submitQuiz(
    @CurrentUser() user: any,
    @Param('quizId') quizId: string,
    @Body() body: { answers: number[] },
  ) {
    return this.elitesService.submitQuiz(quizId, user.sub, body.answers);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get student dashboard' })
  async getDashboard(@CurrentUser() user: any) {
    return this.elitesService.getStudentDashboard(user.sub);
  }
}
