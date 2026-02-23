/**
 * Anthropic (Claude) provider implementation
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  CompletionOptions,
  CompletionResult,
  StructuredCompletionOptions,
  StructuredCompletionResult,
} from './types';
import { withRetry } from '../utils/retry';
import { MODEL_DEFAULTS, calculateModelCost } from './model-defaults';
import { zodToJsonSchema, parseResponse } from '../utils/responseParser';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model || MODEL_DEFAULTS.anthropic;
  }

  async generateCompletion(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await withRetry(
      () => this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: [{ role: 'user', content: prompt }],
      }),
      { maxRetries: 3, initialDelayMs: 2000 }
    );

    // Extract text content from response
    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = this.calculateCost(inputTokens, outputTokens);

    return {
      content,
      inputTokens,
      outputTokens,
      cost,
    };
  }

  async generateStructuredCompletion<T>(
    prompt: string,
    options: StructuredCompletionOptions
  ): Promise<StructuredCompletionResult<T>> {
    const toolName = options.schemaName || 'output';
    const jsonSchema = zodToJsonSchema(options.schema);

    // Use Anthropic tool use for structured output
    const response = await withRetry(
      () => this.client.messages.create({
        model: this.model,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        messages: [{ role: 'user', content: prompt }],
        tools: [
          {
            name: toolName,
            description: 'Output the structured response',
            input_schema: jsonSchema as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: toolName },
      }),
      { maxRetries: 3, initialDelayMs: 2000 }
    );

    const inputTokens = response.usage.input_tokens;
    const outputTokens = response.usage.output_tokens;
    const cost = this.calculateCost(inputTokens, outputTokens);

    // Extract tool use content
    const toolUseBlock = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
    );

    if (!toolUseBlock) {
      // Fallback: try to extract from text content
      const textContent = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map(block => block.text)
        .join('\n');

      const parsed = parseResponse<T>(textContent, options.schema);
      if (!parsed.success || !parsed.data) {
        throw new Error(`Structured output failed: ${parsed.error}`);
      }

      return {
        content: textContent,
        data: parsed.data,
        inputTokens,
        outputTokens,
        cost,
      };
    }

    // Validate against schema
    const parsed = parseResponse<T>(JSON.stringify(toolUseBlock.input), options.schema);
    if (!parsed.success || !parsed.data) {
      throw new Error(`Schema validation failed: ${parsed.error}`);
    }

    return {
      content: JSON.stringify(toolUseBlock.input, null, 2),
      data: parsed.data,
      inputTokens,
      outputTokens,
      cost,
    };
  }

  getName(): string {
    return 'Anthropic';
  }

  getModel(): string {
    return this.model;
  }

  calculateCost(inputTokens: number, outputTokens: number): number {
    return calculateModelCost('anthropic', this.model, inputTokens, outputTokens);
  }
}
