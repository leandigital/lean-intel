/**
 * Google Gemini provider implementation
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { LLMProvider, CompletionOptions, CompletionResult } from './types';
import { withRetry } from '../utils/retry';
import { MODEL_DEFAULTS, calculateModelCost } from './model-defaults';

export class GoogleProvider implements LLMProvider {
  private client: GoogleGenerativeAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new GoogleGenerativeAI(apiKey);
    this.model = model || MODEL_DEFAULTS.google;
  }

  async generateCompletion(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult> {
    const generativeModel = this.client.getGenerativeModel({
      model: this.model,
      generationConfig: {
        maxOutputTokens: options.maxTokens,
        temperature: options.temperature,
      },
    });

    const result = await withRetry(
      () => generativeModel.generateContent(prompt),
      { maxRetries: 3, initialDelayMs: 2000 }
    );
    const response = result.response;
    const content = response.text();

    // Gemini API doesn't provide detailed token usage in the same way
    // We'll need to estimate or use response.usageMetadata if available
    const inputTokens = response.usageMetadata?.promptTokenCount || 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount || 0;
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      inputTokens,
      outputTokens,
      cost,
    };
  }

  getName(): string {
    return 'Google';
  }

  getModel(): string {
    return this.model;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost('google', this.model, inputTokens, outputTokens);
  }
}
