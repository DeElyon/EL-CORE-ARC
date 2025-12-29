import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class AiCoreService {
  private client: OpenAI | null = null;

  constructor(private provider: string = 'openai') {
    if (provider === 'openai' && process.env.OPENAI_API_KEY) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  // Connect to LLM provider and run prompt
  async query(prompt: string, opts: any = {}) {
    if (this.provider === 'openai' && this.client) {
      const model = opts.model || 'gpt-4o-mini';
      const res = await this.client.chat.completions.create({
        model,
        messages: [{ role: 'user', content: prompt }],
      });
      return { text: res.choices?.[0]?.message?.content ?? '' };
    }

    // Fallback stub
    return { text: `Stub response for prompt: ${prompt}` };
  }
}
