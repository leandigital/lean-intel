/**
 * OpenAI (ChatGPT) provider implementation
 */

import OpenAI from 'openai';
import { LLMProvider, CompletionOptions, CompletionResult } from './types';
import { withRetry } from '../utils/retry';
import { MODEL_DEFAULTS, calculateModelCost } from './model-defaults';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new OpenAI({ apiKey });
    this.model = model || MODEL_DEFAULTS.openai;
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
    return 'OpenAI';
  }

  getModel(): string {
    return this.model;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost('openai', this.model, inputTokens, outputTokens);
  }
}
