/**
 * Centralized model defaults and pricing for all LLM providers
 *
 * UPDATE THIS FILE when provider pricing or models change.
 * All provider implementations and cost estimation reference this single source.
 * Last updated: 2026-02-15
 */

import { ProviderType } from './types';

/**
 * Model pricing per million tokens
 * Key format: exact model name or pattern match key
 */
export interface ModelPricing {
  input: number;  // $ per million input tokens
  output: number; // $ per million output tokens
}

/**
 * Complete pricing table for all supported models
 * Organized by provider, then by model pattern
 *
 * IMPORTANT: Order matters for pattern matching - more specific patterns first
 */
export const MODEL_PRICING_TABLE: Record<ProviderType, Record<string, ModelPricing>> = {
  anthropic: {
    // Claude 4.5/4.6 family (current)
    'opus': { input: 5.0, output: 25.0 },
    'haiku': { input: 1.0, output: 5.0 },
    'sonnet': { input: 3.0, output: 15.0 }, // default
    // Fallback
    '_default': { input: 3.0, output: 15.0 },
  },
  openai: {
    // GPT-4.1 family (current)
    'gpt-4.1-nano': { input: 0.10, output: 0.40 },
    'gpt-4.1-mini': { input: 0.40, output: 1.60 },
    'gpt-4.1': { input: 2.0, output: 8.0 }, // default
    // o-series reasoning models (current)
    'o4-mini': { input: 1.10, output: 4.40 },
    'o3': { input: 2.0, output: 8.0 },
    // GPT-4o family (legacy)
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4o': { input: 2.50, output: 10.0 },
    // Fallback
    '_default': { input: 2.0, output: 8.0 },
  },
  google: {
    // Gemini 2.5 family (current)
    '2.5-flash-lite': { input: 0.10, output: 0.40 },
    '2.5-pro': { input: 1.25, output: 10.0 },
    '2.5-flash': { input: 0.30, output: 2.50 }, // default
    // Gemini 2.0 family
    '2.0-flash': { input: 0.075, output: 0.30 },
    // Gemini 1.5 family (legacy)
    '1.5-pro': { input: 1.25, output: 5.0 },
    '1.5-flash': { input: 0.075, output: 0.30 },
    // Fallback
    '_default': { input: 0.30, output: 2.50 },
  },
  xai: {
    // Grok 3 family (current)
    'grok-3-mini': { input: 0.30, output: 0.50 },
    'grok-3': { input: 3.0, output: 15.0 }, // default
    // Fallback
    '_default': { input: 3.0, output: 15.0 },
  },
};

/**
 * Default models for each provider
 * Used when no model is explicitly specified
 */
export const MODEL_DEFAULTS: Record<ProviderType, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai: 'gpt-4.1',
  google: 'gemini-2.5-flash',
  xai: 'grok-3',
};

/**
 * Get pricing for a specific model
 * Uses pattern matching to find the best match
 */
export function getModelPricing(provider: ProviderType, model?: string): ModelPricing {
  const providerPricing = MODEL_PRICING_TABLE[provider];

  if (!model) {
    return providerPricing['_default'];
  }

  const modelLower = model.toLowerCase();

  // Try to find a matching pattern
  for (const [pattern, pricing] of Object.entries(providerPricing)) {
    if (pattern === '_default') continue;
    if (modelLower.includes(pattern)) {
      return pricing;
    }
  }

  // Return default for provider
  return providerPricing['_default'];
}

/**
 * Calculate cost for token usage
 * Centralized cost calculation used by all providers and estimation
 */
export function calculateModelCost(
  provider: ProviderType,
  model: string | undefined,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = getModelPricing(provider, model);
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(4));
}

/**
 * Get the default model for a provider
 */
export function getDefaultModel(provider: ProviderType): string {
  return MODEL_DEFAULTS[provider];
}

/**
 * Format pricing for display
 */
export function formatPricing(pricing: ModelPricing): string {
  return `$${pricing.input}/$${pricing.output} per M`;
}

/**
 * Get pricing display string for a provider/model combo
 */
export function getPricingDisplay(provider: ProviderType, model?: string): string {
  const pricing = getModelPricing(provider, model);
  return formatPricing(pricing);
}
