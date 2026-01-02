import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

@Injectable()
export class AiCoreService {
  private openaiClient: OpenAI | null = null;
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }

    // Initialize Gemini
    if (process.env.GEMINI_API_KEY) {
      this.geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    }
  }

  /**
   * Query OpenAI
   */
  async queryOpenAI(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<AIResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI API key not configured');
    }

    const model = options.model || 'gpt-4-turbo-preview';
    const response = await this.openaiClient.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
    });

    return {
      text: response.choices[0]?.message?.content || '',
      usage: {
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
      },
    };
  }

  /**
   * Query Gemini
   */
  async queryGemini(
    systemPrompt: string,
    userPrompt: string,
    options: {
      model?: string;
      temperature?: number;
    } = {},
  ): Promise<AIResponse> {
    if (!this.geminiClient) {
      throw new Error('Gemini API key not configured');
    }

    const model = this.geminiClient.getGenerativeModel({
      model: options.model || 'gemini-pro',
    });

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;

    return {
      text: response.text(),
    };
  }

  /**
   * Universal query method (tries OpenAI first, falls back to Gemini)
   */
  async query(
    systemPrompt: string,
    userPrompt: string,
    options: {
      provider?: 'openai' | 'gemini' | 'auto';
      model?: string;
      temperature?: number;
      maxTokens?: number;
    } = {},
  ): Promise<AIResponse> {
    const provider = options.provider || 'auto';

    if (provider === 'openai' || (provider === 'auto' && this.openaiClient)) {
      try {
        return await this.queryOpenAI(systemPrompt, userPrompt, options);
      } catch (error) {
        if (provider === 'openai') throw error;
        // Fall through to Gemini
      }
    }

    if (provider === 'gemini' || (provider === 'auto' && this.geminiClient)) {
      return await this.queryGemini(systemPrompt, userPrompt, options);
    }

    throw new Error('No AI provider configured');
  }
}
