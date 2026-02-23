/**
 * xAI (Grok) provider implementation
 * Note: xAI uses OpenAI-compatible API
 */

import OpenAI from 'openai';
import { LLMProvider, CompletionOptions, CompletionResult } from './types';
import { withRetry } from '../utils/retry';
import { MODEL_DEFAULTS, calculateModelCost } from './model-defaults';

export class XAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    this.model = model || MODEL_DEFAULTS.xai;
  }

  async generateCompletion(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await withRetry(
      () => this.client.chat.completions.create({
        model: this.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      { maxRetries: 3, initialDelayMs: 2000 }
    );

    const content = response.choices[0]?.message?.content || '';
    const inputTokens = response.usage?.prompt_tokens || 0;
    const outputTokens = response.usage?.completion_tokens || 0;
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      inputTokens,
      outputTokens,
      cost,
    };
  }

  getName(): string {
    return 'xAI';
  }

  getModel(): string {
    return this.model;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost('xai', this.model, inputTokens, outputTokens);
  }
}
