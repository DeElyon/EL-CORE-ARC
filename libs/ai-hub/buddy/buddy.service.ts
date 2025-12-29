import { Injectable } from '@nestjs/common';
import { AiCoreService } from '../ai-core.service';

@Injectable()
export class BuddyAI {
  constructor(private aiCore: AiCoreService = new AiCoreService('openai')) {}

  async matchTalent(projectDescription: string, availableDevs: any[]) {
    const prompt = `You are Buddy, the MY SPACE Talent Scout.\nAnalyze this project: "${projectDescription}".\nFrom this list of ELCODERS: ${JSON.stringify(
      availableDevs,
    )},\npick the top 3 and explain why based on their ELITES certifications.`;

    const response = await this.aiCore.query(prompt, { model: 'gpt-4o-mini' });
    return response.text;
  }
}
