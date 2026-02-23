/**
 * Cost estimation for LLM API usage
 * Uses centralized pricing from model-defaults.ts
 * Last updated: 2026-02-03
 */

import { CostEstimate, ProjectContext, AnalysisOptions } from '../types';
import { ProviderType } from '../providers/types';
import { getModelPricing, getPricingDisplay, ModelPricing } from '../providers/model-defaults';

/**
 * Provider configuration for cost estimation
 */
export interface ProviderConfig {
  type: ProviderType;
  model?: string;
}

// Token estimates based on COST_ESTIMATES.md
const TOKEN_ESTIMATES = {
  documentation: {
    small: { input: 50000, output: 20000 },
    medium: { input: 97000, output: 45000 },
    large: { input: 180000, output: 80000 },
  },
  security: {
    small: { input: 40000, output: 2000 },
    medium: { input: 62000, output: 3500 },
    large: { input: 100000, output: 5000 },
  },
  license: {
    small: { input: 50000, output: 2500 },
    medium: { input: 75000, output: 4000 },
    large: { input: 120000, output: 6000 },
  },
  quality: {
    small: { input: 50000, output: 3000 },
    medium: { input: 78000, output: 5000 },
    large: { input: 130000, output: 8000 },
  },
  cost: {
    small: { input: 55000, output: 3000 },
    medium: { input: 87000, output: 5000 },
    large: { input: 140000, output: 8000 },
  },
  hipaa: {
    small: { input: 45000, output: 3000 },
    medium: { input: 71000, output: 5000 },
    large: { input: 110000, output: 8000 },
  },
};

// Execution time estimates (in minutes)
const TIME_ESTIMATES = {
  documentation: { small: 30, medium: 60, large: 120 },
  security: { small: 15, medium: 25, large: 45 },
  license: { small: 15, medium: 30, large: 60 },
  quality: { small: 20, medium: 35, large: 60 },
  cost: { small: 20, medium: 40, large: 70 },
  hipaa: { small: 20, medium: 35, large: 60 },
};

type ProjectSize = 'small' | 'medium' | 'large';

function determineProjectSize(context: ProjectContext): ProjectSize {
  const { fileCount, lineCount } = context;

  if (fileCount < 100 && lineCount < 10000) {
    return 'small';
  } else if (fileCount < 400 && lineCount < 50000) {
    return 'medium';
  } else {
    return 'large';
  }
}

/**
 * Calculate cost from tokens using provider-specific pricing
 */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing
): number {
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(2));
}

/**
 * Estimate cost for an analysis run
 * Uses actual provider/model pricing instead of hardcoded values
 */
export function estimateCost(
  context: ProjectContext,
  options: AnalysisOptions,
  providerConfig?: ProviderConfig
): CostEstimate {
  const size = determineProjectSize(context);
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedDuration = 0;

  // Calculate tokens and duration for each enabled analyzer
  if (options.docs) {
    inputTokens += TOKEN_ESTIMATES.documentation[size].input;
    outputTokens += TOKEN_ESTIMATES.documentation[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.documentation[size]);
  }

  if (options.security) {
    inputTokens += TOKEN_ESTIMATES.security[size].input;
    outputTokens += TOKEN_ESTIMATES.security[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.security[size]);
  }

  if (options.license) {
    inputTokens += TOKEN_ESTIMATES.license[size].input;
    outputTokens += TOKEN_ESTIMATES.license[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.license[size]);
  }

  if (options.quality) {
    inputTokens += TOKEN_ESTIMATES.quality[size].input;
    outputTokens += TOKEN_ESTIMATES.quality[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.quality[size]);
  }

  if (options.cost) {
    inputTokens += TOKEN_ESTIMATES.cost[size].input;
    outputTokens += TOKEN_ESTIMATES.cost[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.cost[size]);
  }

  if (options.hipaa) {
    inputTokens += TOKEN_ESTIMATES.hipaa[size].input;
    outputTokens += TOKEN_ESTIMATES.hipaa[size].output;
    estimatedDuration = Math.max(estimatedDuration, TIME_ESTIMATES.hipaa[size]);
  }

  // Get pricing for the configured provider/model (or default to anthropic/sonnet)
  const provider = providerConfig?.type ?? 'anthropic';
  const model = providerConfig?.model;
  const pricing = getModelPricing(provider, model);

  // Calculate cost using provider-specific pricing
  const estimatedCost = calculateCost(inputTokens, outputTokens, pricing);

  return {
    inputTokens,
    outputTokens,
    estimatedCost,
    estimatedDuration,
    // Include pricing info for display
    pricingInfo: getPricingDisplay(provider, model),
  };
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
