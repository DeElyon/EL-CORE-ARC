import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../libs/database/prisma.service';
import { LibrarianAI } from '../../../libs/ai-hub/librarian/librarian.service';
import { WalletEngineService } from '../../../libs/wallet-engine';
import { AppSource } from '@prisma/client';

@Injectable()
export class ElitesService {
  constructor(
    private prisma: PrismaService,
    private librarian: LibrarianAI,
    private walletEngine: WalletEngineService,
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

    return await this.prisma.enrollment.create({
      data: {
        userId,
        courseId,
        progress: 0,
      },
    });
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
    }

    return { progress: newProgress, nextLesson: nextLesson?.id };
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
      include: { questions: true },
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

    return { score, passed, correct, total: quiz.questions.length };
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

  // ============================================
  // TUTOR SYSTEM
  // ============================================

  /**
   * Register as tutor
   */
  async registerAsTutor(
    userId: string,
    bio: string,
    experience: number,
    hourlyRate: number,
    techStacks: string[],
    courses: string[],
  ) {
    // Update user role
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

    // Check if tutor-learner relationship exists and is accepted
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

    return await this.prisma.class.create({
      data: {
        tutorId: tutor.id,
        learnerId,
        title,
        description,
        courseId,
        techStack,
        scheduledAt,
        duration,
      },
    });
  }

  /**
   * Get tutor's classes
   */
  async getTutorClasses(userId: string, status?: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    const where: any = { tutorId: tutor.id };
    if (status) {
      where.status = status;
    }

    return await this.prisma.class.findMany({
      where,
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
   * Get learner's classes
   */
  async getLearnerClasses(userId: string, status?: string) {
    const where: any = { learnerId: userId };
    if (status) {
      where.status = status;
    }

    return await this.prisma.class.findMany({
      where,
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
  async updateClassStatus(classId: string, status: string, notes?: string) {
    return await this.prisma.class.update({
      where: { id: classId },
      data: {
        status: status as any,
        notes,
        updatedAt: new Date(),
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

    return await this.prisma.tutorLearner.create({
      data: {
        tutorId: tutor.id,
        learnerId,
      },
    });
  }

  /**
   * Accept/Reject tutor-learner request
   */
  async respondToTutorRequest(requestId: string, accept: boolean) {
    const status = accept ? 'ACCEPTED' : 'REJECTED';

    return await this.prisma.tutorLearner.update({
      where: { id: requestId },
      data: {
        status: status as any,
        acceptedAt: accept ? new Date() : undefined,
      },
    });
  }

  /**
   * Get available learners for tutor
   */
  async getAvailableLearners(tutorId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId: tutorId },
      include: { courses: true },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    // Find learners who are enrolled in tutor's courses or have matching tech stacks
    const learners = await this.prisma.user.findMany({
      where: {
        role: 'LEARNER',
        OR: [
          {
            enrollments: {
              some: {
                courseId: {
                  in: tutor.courses,
                },
              },
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        verseScore: true,
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    return learners;
  }

  /**
   * Get tutor dashboard
   */
  async getTutorDashboard(userId: string) {
    const tutor = await this.prisma.tutor.findUnique({
      where: { userId },
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
      },
    });

    if (!tutor) {
      throw new Error('Tutor not found');
    }

    const wallet = await this.walletEngine.getLedger().getBalance(userId);

    const stats = {
      totalClasses: tutor.classes.length,
      upcomingClasses: tutor.classes.filter((c) => c.status === 'SCHEDULED').length,
      completedClasses: tutor.classes.filter((c) => c.status === 'COMPLETED').length,
      totalLearners: tutor.tutorLearners.length,
      walletBalance: Number(wallet.wthBalance || 0),
    };

    return {
      tutor,
      stats,
      classes: tutor.classes,
      learners: tutor.tutorLearners.map((tl) => tl.learner),
    };
  }

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
}


