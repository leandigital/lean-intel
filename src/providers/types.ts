/**
 * Common types for LLM provider abstraction
 */

import { ZodSchema } from 'zod';

export type ProviderType = 'anthropic' | 'openai' | 'google' | 'xai';

export interface CompletionOptions {
  maxTokens: number;
  temperature: number;
}

export interface StructuredCompletionOptions extends CompletionOptions {
  schema: ZodSchema;
  schemaName?: string; // Name for the tool/function (default: 'output')
}

export interface CompletionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

export interface StructuredCompletionResult<T> extends CompletionResult {
  data: T;
}

export interface LLMProvider {
  /**
   * Generate a completion from the LLM
   */
  generateCompletion(prompt: string, options: CompletionOptions): Promise<CompletionResult>;

  /**
   * Generate a structured completion with schema validation
   * Uses provider-native features (tool use, JSON mode) when available
   * Falls back to prompt-based JSON + Zod validation
   */
  generateStructuredCompletion?<T>(
    prompt: string,
    options: StructuredCompletionOptions
  ): Promise<StructuredCompletionResult<T>>;

  /**
   * Get provider name (e.g., "Anthropic", "OpenAI")
   */
  getName(): string;

  /**
   * Get current model being used
   */
  getModel(): string;

  /**
   * Calculate cost based on token usage
   */
  calculateCost(inputTokens: number, outputTokens: number): number;
}

export interface ProviderConfig {
  type: ProviderType;
  apiKey: string;
  model?: string; // Optional: allow users to override default model
}
