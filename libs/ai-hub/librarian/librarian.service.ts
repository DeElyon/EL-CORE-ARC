import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LibrarianAI {
  private readonly SYSTEM_PROMPT = `You are The Librarian, ELITES' Educational AI.
You are a patient, knowledgeable teacher who simplifies complex concepts.
Your personality is scholarly, encouraging, and adaptive.
You explain concepts using analogies tailored to the learner's background.
You help students understand, not just memorize.`;

  constructor(
    private aiCore: AiCoreService,
    private prisma: PrismaService,
  ) {}

  /**
   * Explain a concept
   */
  async explainConcept(
    concept: string,
    lessonId: string,
    studentBackground?: string,
  ) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    const prompt = `A student is learning about: "${concept}"

Course Context: ${lesson?.course.title || 'General'}
Lesson: ${lesson?.title || 'N/A'}

${studentBackground ? `Student Background: ${studentBackground}` : ''}

Explain this concept:
1. In simple terms
2. Using an analogy relevant to their background
3. With a practical example
4. Connecting it to what they've learned before

Keep it concise (2-3 minutes reading time).`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.6 },
    );

    return response.text;
  }

  /**
   * Generate quiz questions
   */
  async generateQuiz(lessonId: string, difficulty: 'EASY' | 'MEDIUM' | 'HARD', count: number = 5) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    const prompt = `Generate ${count} ${difficulty} quiz questions for this lesson:

Lesson: ${lesson?.title || 'N/A'}
Content: ${lesson?.content?.substring(0, 500) || 'N/A'}

Each question should:
- Test understanding, not memorization
- Have 4 multiple choice options
- Include an explanation for the correct answer
- Be appropriate for ${difficulty} level

Return JSON: {"questions": [{"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0, "explanation": "..."}]}`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.5 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return { questions: [] };
    }
  }

  /**
   * Adapt learning path
   */
  async adaptLearningPath(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
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
      throw new Error('Enrollment not found');
    }

    const prompt = `Adapt the learning path for a student:

Current Progress: ${enrollment.progress}%
Current Lesson: ${enrollment.currentLesson || 'Not started'}
Course: ${enrollment.course.title}

Based on their progress, suggest:
1. Should they speed up or slow down?
2. Which concepts need reinforcement?
3. Recommended practice exercises
4. Next steps

Return JSON with recommendations.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.4 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return {
        pace: 'NORMAL',
        recommendations: [],
        nextSteps: [],
      };
    }
  }

  /**
   * Answer student question
   */
  async answerQuestion(question: string, lessonContext: string) {
    const prompt = `A student asks: "${question}"

Lesson Context: ${lessonContext}

Provide a clear, educational answer that:
- Directly addresses the question
- Uses simple language
- Includes examples if helpful
- Encourages further learning

Keep it concise (1-2 minutes reading time).`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.6 },
    );

    return response.text;
  }

  /**
   * Generate course summary
   */
  async generateCourseSummary(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        lessons: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!course) {
      throw new Error('Course not found');
    }

    const prompt = `Generate a comprehensive course summary for:

Course: ${course.title}
Description: ${course.description}
Lessons: ${course.lessons.length}

Include:
- Key learning objectives
- Main topics covered
- Skills students will gain
- Prerequisites
- What comes next

Format as a structured summary in markdown.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.5 },
    );

    return response.text;
  }
}


