import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LinaAI {
  private readonly SYSTEM_PROMPT = `You are Lina, ELCODERS' Technical Co-pilot AI.
You are an expert software engineer specializing in code review, refactoring, and security.
Your personality is precise, helpful, and technically rigorous.
You help developers write better code, catch bugs, and improve performance.
You understand multiple programming languages and best practices.`;

  constructor(
    private aiCore: AiCoreService,
    private prisma: PrismaService,
  ) {}

  /**
   * Review code submission
   */
  async reviewCode(code: string, language: string, projectContext?: string) {
    const prompt = `Review this ${language} code submission:

\`\`\`${language}
${code}
\`\`\`

${projectContext ? `Project Context: ${projectContext}` : ''}

Provide:
1. Security vulnerabilities (if any)
2. Code quality issues
3. Performance improvements
4. Best practices suggestions
5. Overall assessment (APPROVE, REQUEST_CHANGES, REJECT)

Return JSON: {"status": "APPROVE|REQUEST_CHANGES|REJECT", "feedback": "detailed feedback", "issues": [...]}`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.2 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return {
        status: 'REQUEST_CHANGES',
        feedback: response.text,
        issues: [],
      };
    }
  }

  /**
   * Generate unit tests
   */
  async generateTests(code: string, language: string, framework?: string) {
    const prompt = `Generate comprehensive unit tests for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${framework ? `Use ${framework} testing framework.` : ''}

Include:
- Edge cases
- Error handling
- Happy paths
- Mock dependencies

Return the test code in a code block.`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.3 },
    );

    return response.text;
  }

  /**
   * Refactor code
   */
  async refactorCode(code: string, language: string, improvements?: string[]) {
    const prompt = `Refactor this ${language} code:

\`\`\`${language}
${code}
\`\`\`

${improvements ? `Focus on: ${improvements.join(', ')}` : 'Focus on: readability, performance, maintainability'}

Provide:
1. Refactored code
2. Explanation of changes
3. Performance impact (if any)`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.3 },
    );

    return response.text;
  }

  /**
   * Generate documentation
   */
  async generateDocs(code: string, language: string) {
    const prompt = `Generate comprehensive documentation for this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Include:
- README.md with setup instructions
- API documentation
- Code comments
- Usage examples`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.4 },
    );

    return response.text;
  }

  /**
   * Detect security vulnerabilities
   */
  async detectVulnerabilities(code: string, language: string) {
    const prompt = `Perform a security audit on this ${language} code:

\`\`\`${language}
${code}
\`\`\`

Check for:
- SQL injection
- XSS vulnerabilities
- Authentication issues
- Authorization flaws
- Input validation problems
- Dependency vulnerabilities

Return JSON: {"vulnerabilities": [{"severity": "HIGH|MEDIUM|LOW", "type": "...", "description": "...", "fix": "..."}]}`;

    const response = await this.aiCore.query(
      this.SYSTEM_PROMPT,
      prompt,
      { temperature: 0.1 },
    );

    try {
      return JSON.parse(response.text);
    } catch {
      return { vulnerabilities: [] };
    }
  }
}


