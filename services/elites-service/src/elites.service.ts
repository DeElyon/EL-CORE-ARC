import { Injectable } from '@nestjs/common';
import { PrismaService } from '@el-verse/database';
import { LibrarianAI } from '../../../libs/ai-hub/index';
import { WalletEngineService } from '../../../libs/wallet-engine/index';
import { MediaService } from '../../../libs/shared-utils/media.service';
import { NotificationService } from '../../../libs/shared-utils/notification.service';
import { Prisma, UserRole, ClassStatus, TutorLearnerStatus, AppSource, NotificationType } from '@prisma/client';

@Injectable()
export class ElitesService {
  constructor(
    private prisma: PrismaService,
    private librarian: LibrarianAI,
    private walletEngine: WalletEngineService,
    private notificationService: NotificationService,
  ) {}

  /**
   * Create a course
   */
  async createCourse(
    instructorId: string,
    title: string,
    description: string,
    price: number,
    difficulty: string,
    category: string,
  ) {
    return await this.prisma.course.create({
      data: {
        title,
        description,
        instructorId,
        price,
        difficulty,
        category,
      },
    });
  }

  /**
   * Create a lesson
   */
  async createLesson(
    courseId: string,
    title: string,
    content: string,
    order: number,
    videoUrl?: string,
  ) {
    return await this.prisma.lesson.create({
      data: {
        courseId,
        title,
        content,
        order,
        videoUrl,
      },
    });
  }

  /**
   * Enroll in course
   */
  async enrollInCourse(userId: string, courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    // Check if already enrolled
    const existing = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      return existing;
    }

    // Process payment if course has price
    if (Number(course.price) > 0) {
      await this.walletEngine.getLedger().debit(
        userId,
        Number(course.price),
        AppSource.ELITES,
        `Enrollment in: ${course.title}`,
        courseId,
      );
    }

    const enrollment = await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        progress: 0,
      },
    });

    // Send enrollment notification
    await this.notifyEnrollment(userId, course.title);

    return enrollment;
  }

  /**
   * Notify enrollment
   */
  async notifyEnrollment(userId: string, courseTitle: string) {
    return this.notificationService.createNotification(
      userId,
      NotificationType.COURSE_ENROLLMENT,
      'Course Enrollment',
      `You have successfully enrolled in "${courseTitle}". Start learning today!`,
      AppSource.ELITES,
    );
  }

  /**
   * Get lesson help from Librarian
   */
  async getLessonHelp(lessonId: string, question: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: {
          lessons: {
            some: { id: lessonId },
          },
        },
      },
      include: {
        course: true,
      },
    });

    const studentBackground = enrollment
      ? `Currently enrolled in ${enrollment.course.title}, progress: ${enrollment.progress}%`
      : undefined;

    return await this.librarian.explainConcept(question, lessonId, studentBackground);
  }

  /**
   * Complete lesson
   */
  async completeLesson(lessonId: string, userId: string) {
    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        userId,
        course: {
          lessons: {
            some: { id: lessonId },
          },
        },
      },
      include: {
        course: {
          include: {
            lessons: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new Error('Not enrolled in this course');
    }

    const totalLessons = enrollment.course.lessons.length;
    const currentIndex = enrollment.course.lessons.findIndex((l) => l.id === lessonId);
    const newProgress = Math.round(((currentIndex + 1) / totalLessons) * 100);

    const nextLesson = enrollment.course.lessons[currentIndex + 1];

    await this.prisma.enrollment.update({
      where: {
        userId_courseId: {
          userId,
          courseId: enrollment.courseId,
        },
      },
      data: {
        progress: newProgress,
        currentLesson: nextLesson?.id || null,
      },
    });

    // If course completed, issue certification
    if (newProgress >= 100) {
      await this.issueCertification(userId, enrollment.courseId);
      await this.notifyCourseCompletion(userId, enrollment.course.title);
    } else {
      // Get the current lesson title
      const currentLesson = enrollment.course.lessons.find(l => l.id === lessonId);
      if (currentLesson) {
        await this.notifyLessonCompletion(userId, currentLesson.title, enrollment.course.title, newProgress);
      }
    }

    return { progress: newProgress, nextLesson: nextLesson?.id };
  }

  /**
   * Notify lesson completion
   */
  async notifyLessonCompletion(userId: string, lessonTitle: string, courseTitle: string, progress: number) {
    return this.notificationService.createNotification(
      userId,
      NotificationType.LESSON_COMPLETED,
      'Lesson Completed',
      `Great job! You completed "${lessonTitle}" in "${courseTitle}". Progress: ${progress}%`,
      AppSource.ELITES,
    );
  }

  /**
   * Notify course completion
   */
  async notifyCourseCompletion(userId: string, courseTitle: string) {
    return this.notificationService.createNotification(
      userId,
      NotificationType.COURSE_COMPLETED,
      'Course Completed!',
      `Congratulations! You have successfully completed the course "${courseTitle}". Your certification is now available.`,
      AppSource.ELITES,
    );
  }

  /**
   * Issue certification (NFT)
   */
  async issueCertification(userId: string, courseId: string) {
    const existing = await this.prisma.certification.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (existing) {
      return existing;
    }

    // Generate NFT hash (in production, this would mint on blockchain)
    const nftHash = `VERSE-CERT-${userId}-${courseId}-${Date.now()}`;

    const certification = await this.prisma.certification.create({
      data: {
        userId,
        courseId,
        nftHash,
      },
    });

    // Award WTH coins for completion
    await this.walletEngine.getLedger().credit(
      userId,
      100, // Base reward
      AppSource.ELITES,
      `Course completion reward`,
      courseId,
    );

    // Boost verseScore
    await this.prisma.user.update({
      where: { id: userId },
      data: { verseScore: { increment: 50 } },
    });

    return certification;
  }

  /**
   * Generate quiz
   */
  async generateQuiz(lessonId: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD') {
    const quizData = await this.librarian.generateQuiz(lessonId, difficulty);

    // Create quiz in database
    const quiz = await this.prisma.quiz.create({
      data: {
        lessonId,
        passingScore: 70,
        questions: {
          create: quizData.questions.map((q: any) => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctIndex,
            explanation: q.explanation,
          })),
        },
      },
    });

    return quiz;
  }

  /**
   * Submit quiz answers
   */
  async submitQuiz(quizId: string, userId: string, answers: number[]) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { 
        questions: true,
        lesson: {
          include: {
            course: true
          }
        }
      },
    });

    if (!quiz) {
      throw new Error('Quiz not found');
    }

    let correct = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });

    const score = Math.round((correct / quiz.questions.length) * 100);
    const passed = score >= quiz.passingScore;

    if (passed) {
      // Award WTH coins
      await this.walletEngine.getLedger().credit(
        userId,
        10,
        AppSource.ELITES,
        `Quiz passed: ${score}%`,
        quizId,
      );
    }

    // Send quiz result notification
    await this.notifyQuizResult(userId, score, passed, quiz.lesson.course.title);

    return { score, passed, correct, total: quiz.questions.length };
  }

  /**
   * Notify tutor request
   */
  async notifyTutorRequest(tutorId: string, learnerId: string) {
    const learner = await this.prisma.user.findUnique({
      where: { id: learnerId },
      select: { username: true }
    });

    return this.notificationService.createNotification(
      tutorId,
      NotificationType.TUTOR_REQUEST,
      'New Learner Request',
      `${learner?.username || 'A learner'} has requested to be your student. Review and accept their request.`,
      AppSource.ELITES,
    );
  }

  /**
   * Notify tutor accepted
   */
  async notifyTutorAccepted(learnerId: string, tutorId: string) {
    const tutor = await this.prisma.user.findUnique({
      where: { id: tutorId },
      select: { username: true }
    });

    return this.notificationService.createNotification(
      learnerId,
      NotificationType.TUTOR_ACCEPTED,
      'Tutor Request Accepted',
      `Congratulations! ${tutor?.username || 'Your tutor'} has accepted your request. You can now schedule classes together.`,
      AppSource.ELITES,
    );
  }

  /**
   * Notify quiz result
   */
  async notifyQuizResult(userId: string, score: number, passed: boolean, courseTitle: string) {
    const status = passed ? 'passed' : 'failed';
    const message = passed 
      ? `Congratulations! You ${status} the quiz for "${courseTitle}" with a score of ${score}%. You earned 10 WTH coins!`
      : `You ${status} the quiz for "${courseTitle}" with a score of ${score}%. Keep practicing!`;

    return this.notificationService.createNotification(
      userId,
      passed ? NotificationType.QUIZ_PASSED : NotificationType.QUIZ_FAILED,
      `Quiz ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message,
      AppSource.ELITES,
    );
  }

  /**
   * Get student dashboard
   */
  async getStudentDashboard(userId: string) {
    const [enrollments, certifications, wallet] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { userId },
        include: {
          course: {
            include: {
              _count: { select: { lessons: true } },
            },
          },
        },
      }),
      this.prisma.certification.findMany({
        where: { userId },
        include: { course: true },
      }),
      this.walletEngine.getLedger().getBalance(userId),
    ]);

    return {
      enrolledCourses: enrollments.length,
      completedCourses: enrollments.filter((e) => e.progress >= 100).length,
      certifications: certifications.length,
      walletBalance: Number(wallet.wthBalance || 0),
      courses: enrollments,
    };
  }

  // (Deduplicated TUTOR SYSTEM: preserved the later, more comprehensive implementation)
  // getTutorDashboard moved to single consolidated implementation lower in this file

  /**
   * Get available tutors for learner
   */
  async getAvailableTutors(learnerId: string, techStack?: string, courseId?: string) {
    const where: any = {
      isActive: true,
    };

    if (techStack) {
      where.techStacks = {
        has: techStack,
      };
    }

    if (courseId) {
      where.courses = {
        has: courseId,
      };
    }

    return await this.prisma.tutor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            verseScore: true,
          },
        },
        availability: true,
      },
    });
  }

  // ============================================
  // TUTOR SYSTEM
  // ============================================

  /**
   * Become a tutor
   */
  async becomeTutor(
    userId: string,
    bio: string,
    experience: number,
    hourlyRate: number,
    techStacks: string[],
    courses: string[],
  ) {
    // Check if user already has a tutor profile
    const existingTutor = await this.prisma.tutor.findUnique({
      where: { userId },
    });

    if (existingTutor) {
      throw new Error('User is already a tutor');
    }

    // Update user role to TUTOR
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: 'TUTOR' },
    });

    return await this.prisma.tutor.create({
      data: {
        userId,
        bio,
        experience,
        hourlyRate,
        techStacks,
        courses,
      },
    });
  }

  /**
   * Update tutor profile
   */
  async updateTutorProfile(
    userId: string,
    updates: {
      bio?: string;
      experience?: number;
      hourlyRate?: number;
      techStacks?: string[];
      courses?: string[];
      isActive?: boolean;
    },
  ) {
    return await this.prisma.tutor.update({
      where: { userId },
      data: updates,
    });
  }

  /**
   * Set tutor availability
   */
  async setTutorAvailability(
    userId: string,
    availability: Array<{
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }>,
  ) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Delete existing availability
    await this.prisma.tutorAvailability.deleteMany({
      where: { tutorId: tutor.id },
    });

    // Create new availability
    const availabilityData = availability.map((slot) => ({
      tutorId: tutor.id,
      ...slot,
    }));

    return await this.prisma.tutorAvailability.createMany({
      data: availabilityData,
    });
  }

  /**
   * Get tutor availability
   */
  async getTutorAvailability(userId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    return await this.prisma.tutorAvailability.findMany({
      where: { tutorId: tutor.id },
    });
  }

  /**
   * Schedule a class
   */
  async scheduleClass(
    tutorId: string,
    learnerId: string,
    title: string,
    description: string,
    scheduledAt: Date,
    duration: number,
    courseId?: string,
    techStack?: string,
  ) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Check if learner exists
    const learner = await this.prisma.user.findUnique({
      where: { id: learnerId },
    });

    if (!learner) {
      throw new Error('Learner not found');
    }

    // Check tutor-learner relationship
    const relationship = await this.prisma.tutorLearner.findUnique({
      where: {
        tutorId_learnerId: {
          tutorId: tutor.id,
          learnerId,
        },
      },
    });

    if (!relationship || relationship.status !== 'ACCEPTED') {
      throw new Error('Tutor-learner relationship not established');
    }

    const newClass = await this.prisma.class.create({
      data: {
        tutorId: tutor.id,
        learnerId,
        title,
        description,
        scheduledAt,
        duration,
        courseId,
        techStack,
      },
    });

    // Send notifications
    await this.notifyClassScheduled(tutorId, title, scheduledAt);
    await this.notifyClassScheduled(learnerId, title, scheduledAt);

    return newClass;
  }

  /**
   * Get tutor's scheduled classes
   */
  async getTutorClasses(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    return await this.prisma.class.findMany({
      where: { tutorId: tutor.id },
      include: {
        learner: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Get learner's scheduled classes
   */
  async getLearnerClasses(learnerId: string) {
    return await this.prisma.class.findMany({
      where: { learnerId },
      include: {
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }

  /**
   * Update class status
   */
  async updateClassStatus(classId: string, status: string, meetingLink?: string) {
    return await this.prisma.class.update({
      where: { id: classId },
      data: {
        status: status as any,
        meetingLink,
      },
    });
  }

  /**
   * Request tutor-learner relationship
   */
  async requestTutorLearner(tutorId: string, learnerId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Check if relationship already exists
    const existing = await this.prisma.tutorLearner.findUnique({
      where: {
        tutorId_learnerId: {
          tutorId: tutor.id,
          learnerId,
        },
      },
    });

    if (existing) {
      return existing;
    }

    const relationship = await this.prisma.tutorLearner.create({
      data: {
        tutorId: tutor.id,
        learnerId,
      },
    });

    // Send notification to tutor
    await this.notifyTutorRequest(tutorId, learnerId);

    return relationship;
  }

  /**
   * Accept tutor-learner request
   */
  async acceptTutorLearner(tutorId: string, learnerId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    const updated = await this.prisma.tutorLearner.update({
      where: {
        tutorId_learnerId: {
          tutorId: tutor.id,
          learnerId,
        },
      },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    // Send notification to learner
    await this.notifyTutorAccepted(learnerId, tutorId);

    return updated;
  }

  /**
   * Find available tutors for learner
   */
  async findAvailableTutors(
    learnerId: string,
    techStack?: string,
    courseId?: string,
  ) {
    const where: any = {
      isActive: true,
    };

    if (techStack) {
      where.techStacks = {
        has: techStack,
      };
    }

    if (courseId) {
      where.courses = {
        has: courseId,
      };
    }

    return await this.prisma.tutor.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            verseScore: true,
          },
        },
        availability: true,
      },
    });
  }

  /**
   * Get available learners for a tutor
   */
  async getAvailableLearners(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({ where: { userId: tutorId }, select: { courses: true } });
    if (!tutor) throw new Error('Tutor not found');

    const learners = await this.prisma.user.findMany({
      where: {
        role: 'LEARNER',
        OR: [
          {
            enrollments: {
              some: { courseId: { in: tutor.courses } },
            },
          },
        ],
      },
      select: { id: true, username: true, avatarUrl: true, verseScore: true, enrollments: { include: { course: true } } },
    });

    return learners;
  }

  /**
   * Get tutor dashboard data
   */
  async getTutorDashboard(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
      include: {
        classes: {
          include: {
            learner: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: { scheduledAt: 'asc' },
        },
        tutorLearners: {
          where: { status: 'ACCEPTED' },
          include: {
            learner: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
        },
        availability: true,
      },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Calculate stats
    const totalClasses = tutor.classes.length;
    const upcomingClasses = tutor.classes.filter(
      (c) => c.status === 'SCHEDULED' && c.scheduledAt > new Date(),
    ).length;
    const completedClasses = tutor.classes.filter(
      (c) => c.status === 'COMPLETED',
    ).length;
    const totalLearners = tutor.tutorLearners.length;

    return {
      tutor,
      stats: {
        totalClasses,
        upcomingClasses,
        completedClasses,
        totalLearners,
        rating: tutor.rating,
        totalSessions: tutor.totalSessions,
      },
    };
  }

  /**
   * Get learner dashboard data
   */
  async getLearnerDashboard(learnerId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { userId: learnerId },
      include: {
        course: {
          include: {
            _count: {
              select: { enrollments: true },
            },
          },
        },
      },
    });

    const classes = await this.getLearnerClasses(learnerId);

    const availableTutors = await this.findAvailableTutors(learnerId);

    return {
      enrollments,
      classes,
      availableTutors,
    };
  }

  /**
   * Video classes
   */
  async createVideoClass(
    instructorId: string,
    title: string,
    description?: string,
    scheduledAt?: Date,
    duration?: number,
    courseId?: string,
    lessonId?: string,
  ) {
    return this.prisma.videoClass.create({
      data: {
        instructorId,
        title,
        description,
        scheduledAt,
        duration,
        courseId,
        lessonId,
      },
    });
  }

  async listVideoClasses(instructorId?: string) {
    const where: any = {};
    if (instructorId) where.instructorId = instructorId;
    return this.prisma.videoClass.findMany({ where, include: { media: true } });
  }

  async getVideoClass(classId: string) {
    return this.prisma.videoClass.findUnique({ where: { id: classId }, include: { media: true } });
  }

  async getVideoClassDownload(classId: string) {
    const vc = await this.getVideoClass(classId);
    if (!vc || !vc.mediaId) throw new Error('No media attached');
    const mediaSvc = new MediaService(this.prisma as any);
    return mediaSvc.getDownloadUrl(vc.mediaId);
  }

  async uploadMediaForClass(
    classId: string,
    uploaderId: string,
    filename: string,
    mimeType: string,
    size: number,
    type: 'VIDEO' | 'AUDIO' | 'IMAGE' | 'FILE',
    metadata?: any,
  ) {
    const mediaSvc = new MediaService(this.prisma as any);
    const { media, signedUploadUrl } = await mediaSvc.createUploadRecord(
      uploaderId,
      AppSource.ELITES,
      filename,
      mimeType,
      size,
      type,
      metadata,
    );

    // attach media to class (optional)
    try {
      await this.prisma.videoClass.update({ where: { id: classId }, data: { mediaId: media.id } });
    } catch (e) {
      // ignore - class may not exist yet, caller will attach later
    }

    return { media, signedUploadUrl };
  }

}

