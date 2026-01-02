import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UnoAI {
  private readonly SYSTEM_PROMPT = `You are Uno, EL ACCESS' Career Mentor AI.
You are supportive, encouraging, and focused on professional growth.
You help interns build their careers through mock interviews, CV building, and soft-skill coaching.
Your personality is warm, professional, and growth-oriented.
You provide hints and guidance rather than direct answers to help interns learn.`;

  constructor(
    private aiCore: AiCoreService,
    private prisma: PrismaService,
  ) {}

  /**
   * Conduct mock interview
   */
  async conductMockInterview(
    internId: string,
    position: string,
    questionCount: number = 5,
  ) {
    const intern = await this.prisma.user.findUnique({
      where: { id: internId },
      include: {
        enrollments: {
          include: { course: true },
        },
        internships: true,
      },
    });

    const prompt = `Conduct a mock interview for an intern applying for: ${position}

Intern Background:
- Courses: ${intern?.enrollments.map((e) => e.course.title).join(', ') || 'None'}
- Completed Internships: ${intern?.internships.filter((i) => i.status === 'COMPLETED').length || 0}
- Verse Score: ${intern?.verseScore || 0}

Generate ${questionCount} interview questions appropriate for this level.
Include:
- Technical questions
- Behavioral questions
- Questions about their experience

Return JSON: {"questions": [{"type": "TECHNICAL|BEHAVIORAL", "question": "...", "expectedAnswer": "..."}]}`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.6 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return { questions: [] };
    }
  }

  /**
   * Build/improve CV
   */
  async buildCV(internId: string) {
    const intern = await this.prisma.user.findUnique({
      where: { id: internId },
      include: {
        enrollments: {
          include: { course: true },
        },
        internships: {
          include: { tasks: true },
        },
        certifications: {
          include: { course: true },
        },
      },
    });

    const prompt = `Build a professional CV for this intern:

Education & Certifications:
${intern?.certifications.map((c) => `- ${c.course.title}`).join('\n') || 'None'}

Internship Experience:
${intern?.internships.map((i) => `- ${i.title}: ${i.tasks.filter((t) => t.status === 'COMPLETED').length} tasks completed`).join('\n') || 'None'}

Skills from Courses:
${intern?.enrollments.map((e) => e.course.category).join(', ') || 'None'}

Generate a well-structured CV with:
- Professional summary
- Skills section
- Experience section
- Education section
- Format in markdown`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.5 },
    );

    return response.text;
  }

  /**
   * Provide hint for stuck intern
   */
  async provideHint(taskDescription: string, internProgress?: string) {
    const prompt = `An intern is stuck on this task:
"${taskDescription}"

${internProgress ? `Their current progress: ${internProgress}` : ''}

Provide a helpful HINT (not the full solution) that guides them toward the answer.
The hint should:
- Point them in the right direction
- Encourage problem-solving
- Be encouraging and supportive

Keep it concise (2-3 sentences).`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.7 },
    );

    return response.text.trim();
  }

  /**
   * Soft skills coaching
   */
  async coachSoftSkills(internId: string, skillArea: string) {
    const prompt = `Provide soft skills coaching for: ${skillArea}

Focus on:
- Practical tips
- Real-world examples
- Actionable advice
- Growth mindset

Format as a friendly coaching session with examples and exercises.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.7 },
    );

    return response.text;
  }

  /**
   * Assess bridge-to-pro readiness
   */
  async assessReadiness(internId: string) {
    const intern = await this.prisma.user.findUnique({
      where: { id: internId },
      include: {
        enrollments: {
          include: { course: true },
        },
        internships: {
          include: { tasks: true },
        },
        certifications: true,
      },
    });

    const completedTasks = intern?.internships.reduce(
      (acc, i) => acc + i.tasks.filter((t) => t.status === 'COMPLETED').length,
      0,
    ) || 0;

    const prompt = `Assess if this intern is ready to "graduate" to ELCODERS:

Completed Tasks: ${completedTasks}
Certifications: ${intern?.certifications.length || 0}
Verse Score: ${intern?.verseScore || 0}
Courses: ${intern?.enrollments.length || 0}

Provide:
1. Readiness score (0-100)
2. Skills gap analysis
3. Recommendations for improvement
4. Timeline estimate

Return JSON format.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.4 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return {
        readinessScore: 50,
        skillsGaps: [],
        recommendations: [],
        timeline: '3-6 months',
      };
    }
  }
}


