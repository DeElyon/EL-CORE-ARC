import {
  Controller,
  Get,
  Post,
  Put,
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

  // ============================================
  // TUTOR ENDPOINTS
  // ============================================

  @Post('tutor/register')
  @ApiOperation({ summary: 'Register as tutor' })
  async registerAsTutor(
    @CurrentUser() user: any,
    @Body() body: {
      bio: string;
      experience: number;
      hourlyRate: number;
      techStacks: string[];
      courses: string[];
    },
  ) {
    return this.elitesService.registerAsTutor(
      user.sub,
      body.bio,
      body.experience,
      body.hourlyRate,
      body.techStacks,
      body.courses,
    );
  }

  @Put('tutor/profile')
  @ApiOperation({ summary: 'Update tutor profile' })
  async updateTutorProfile(
    @CurrentUser() user: any,
    @Body() body: {
      bio?: string;
      experience?: number;
      hourlyRate?: number;
      techStacks?: string[];
      courses?: string[];
      isActive?: boolean;
    },
  ) {
    return this.elitesService.updateTutorProfile(user.sub, body);
  }

  @Post('tutor/availability')
  @ApiOperation({ summary: 'Set tutor availability' })
  async setTutorAvailability(
    @CurrentUser() user: any,
    @Body() body: {
      availability: Array<{
        dayOfWeek: number;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }>;
    },
  ) {
    return this.elitesService.setTutorAvailability(user.sub, body.availability);
  }

  @Get('tutor/availability')
  @ApiOperation({ summary: 'Get tutor availability' })
  async getTutorAvailability(@CurrentUser() user: any) {
    return this.elitesService.getTutorAvailability(user.sub);
  }

  @Post('classes')
  @ApiOperation({ summary: 'Schedule a class' })
  async scheduleClass(
    @CurrentUser() user: any,
    @Body() body: {
      learnerId: string;
      title: string;
      description: string;
      scheduledAt: string;
      duration: number;
      courseId?: string;
      techStack?: string;
    },
  ) {
    return this.elitesService.scheduleClass(
      user.sub,
      body.learnerId,
      body.title,
      body.description,
      new Date(body.scheduledAt),
      body.duration,
      body.courseId,
      body.techStack,
    );
  }

  @Get('tutor/classes')
  @ApiOperation({ summary: 'Get tutor classes' })
  async getTutorClasses(
    @CurrentUser() user: any,
    @Param('status') status?: string,
  ) {
    return this.elitesService.getTutorClasses(user.sub, status);
  }

  @Get('learner/classes')
  @ApiOperation({ summary: 'Get learner classes' })
  async getLearnerClasses(
    @CurrentUser() user: any,
    @Param('status') status?: string,
  ) {
    return this.elitesService.getLearnerClasses(user.sub, status);
  }

  @Put('classes/:classId/status')
  @ApiOperation({ summary: 'Update class status' })
  async updateClassStatus(
    @Param('classId') classId: string,
    @Body() body: { status: string; notes?: string },
  ) {
    return this.elitesService.updateClassStatus(classId, body.status, body.notes);
  }

  @Post('tutor/request/:learnerId')
  @ApiOperation({ summary: 'Request tutor-learner relationship' })
  async requestTutorLearner(
    @CurrentUser() user: any,
    @Param('learnerId') learnerId: string,
  ) {
    return this.elitesService.requestTutorLearner(user.sub, learnerId);
  }

  @Post('tutor/respond/:requestId')
  @ApiOperation({ summary: 'Respond to tutor request' })
  async respondToTutorRequest(
    @Param('requestId') requestId: string,
    @Body() body: { accept: boolean },
  ) {
    return this.elitesService.respondToTutorRequest(requestId, body.accept);
  }

  @Get('tutor/learners')
  @ApiOperation({ summary: 'Get available learners for tutor' })
  async getAvailableLearners(@CurrentUser() user: any) {
    return this.elitesService.getAvailableLearners(user.sub);
  }

  @Get('tutor/dashboard')
  @ApiOperation({ summary: 'Get tutor dashboard' })
  async getTutorDashboard(@CurrentUser() user: any) {
    return this.elitesService.getTutorDashboard(user.sub);
  }

  @Get('tutors')
  @ApiOperation({ summary: 'Get available tutors' })
  async getAvailableTutors(
    @CurrentUser() user: any,
    @Param('techStack') techStack?: string,
    @Param('courseId') courseId?: string,
  ) {
    return this.elitesService.getAvailableTutors(user.sub, techStack, courseId);
  }
}
