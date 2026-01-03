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
import { JwtAuthGuard } from '@el-verse/auth-bridge';
import { RolesGuard } from '@el-verse/auth-bridge';
import { Roles } from '@el-verse/auth-bridge';
import { CurrentUser } from '@el-verse/auth-bridge';

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

  @Post('tutor/become')
  @ApiOperation({ summary: 'Become a tutor' })
  async becomeTutor(
    @CurrentUser() user: any,
    @Body() body: {
      bio: string;
      experience: number;
      hourlyRate: number;
      techStacks: string[];
      courses: string[];
    },
  ) {
    return this.elitesService.becomeTutor(
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

  @Post('classes/schedule')
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
  async getTutorClasses(@CurrentUser() user: any) {
    return this.elitesService.getTutorClasses(user.sub);
  }

  @Get('learner/classes')
  @ApiOperation({ summary: 'Get learner classes' })
  async getLearnerClasses(@CurrentUser() user: any) {
    return this.elitesService.getLearnerClasses(user.sub);
  }

  @Put('classes/:classId/status')
  @ApiOperation({ summary: 'Update class status' })
  async updateClassStatus(
    @CurrentUser() user: any,
    @Param('classId') classId: string,
    @Body() body: { status: string; meetingLink?: string },
  ) {
    return this.elitesService.updateClassStatus(classId, body.status, body.meetingLink);
  }

  @Post('tutor/request/:learnerId')
  @ApiOperation({ summary: 'Request tutor-learner relationship' })
  async requestTutorLearner(
    @CurrentUser() user: any,
    @Param('learnerId') learnerId: string,
  ) {
    return this.elitesService.requestTutorLearner(user.sub, learnerId);
  }

  @Post('tutor/accept/:learnerId')
  @ApiOperation({ summary: 'Accept tutor-learner request' })
  async acceptTutorLearner(
    @CurrentUser() user: any,
    @Param('learnerId') learnerId: string,
  ) {
    return this.elitesService.acceptTutorLearner(user.sub, learnerId);
  }

  @Get('tutor/dashboard')
  @ApiOperation({ summary: 'Get tutor dashboard' })
  async getTutorDashboard(@CurrentUser() user: any) {
    return this.elitesService.getTutorDashboard(user.sub);
  }

  @Get('learner/dashboard')
  @ApiOperation({ summary: 'Get learner dashboard' })
  async getLearnerDashboard(@CurrentUser() user: any) {
    return this.elitesService.getLearnerDashboard(user.sub);
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

  @Get('tutor/learners')
  @ApiOperation({ summary: 'Get available learners for tutor' })
  async getAvailableLearners(@CurrentUser() user: any) {
    return this.elitesService.getAvailableLearners(user.sub);
  }

  // ============================================
  // VIDEO CLASS ENDPOINTS
  // ============================================

  @Post('video-classes')
  @ApiOperation({ summary: 'Create a video class' })
  async createVideoClass(
    @CurrentUser() user: any,
    @Body() body: {
      title: string;
      description?: string;
      scheduledAt?: string;
      duration?: number;
      courseId?: string;
      lessonId?: string;
    },
  ) {
    return this.elitesService.createVideoClass(
      user.sub,
      body.title,
      body.description,
      body.scheduledAt ? new Date(body.scheduledAt) : undefined,
      body.duration,
      body.courseId,
      body.lessonId,
    );
  }

  @Get('video-classes')
  @ApiOperation({ summary: 'List video classes for instructor' })
  async listVideoClasses(@CurrentUser() user: any) {
    return this.elitesService.listVideoClasses(user.sub);
  }

  @Get('video-classes/:id')
  @ApiOperation({ summary: 'Get a video class by id' })
  async getVideoClass(@Param('id') id: string) {
    return this.elitesService.getVideoClass(id);
  }

  @Get('video-classes/:id/download')
  @ApiOperation({ summary: 'Get download url for class media' })
  async downloadVideoClass(@Param('id') id: string) {
    return this.elitesService.getVideoClassDownload(id);
  }

  @Post('video-classes/:id/upload')
  @ApiOperation({ summary: 'Create an upload record for a class' })
  async uploadForClass(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() body: { filename: string; mimeType: string; size: number; type: 'VIDEO' | 'AUDIO' | 'IMAGE' | 'FILE' },
  ) {
    return this.elitesService.uploadMediaForClass(
      id,
      user.sub,
      body.filename,
      body.mimeType,
      body.size,
      body.type,
    );
  }
}
