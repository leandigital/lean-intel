/**
 * Curated model catalog for all LLM providers.
 * Single source of truth for the model selector in `lean-intel init`.
 *
 * UPDATE THIS FILE when providers release new models.
 * Last updated: 2026-02-15
 */

import { ProviderType } from './types';

export interface CatalogModel {
  id: string;
  name: string;
  description: string;
  isDefault?: boolean;
}

export const MODEL_CATALOG: Record<ProviderType, CatalogModel[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', description: 'Best balance of speed and intelligence', isDefault: true },
    { id: 'claude-opus-4-6', name: 'Claude Opus 4.6', description: 'Most intelligent, best for complex tasks' },
    { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5', description: 'Fastest, most cost-efficient' },
  ],
  openai: [
    { id: 'gpt-4.1', name: 'GPT-4.1', description: 'Latest flagship, 1M context', isDefault: true },
    { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', description: 'Fast, cost-efficient' },
    { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', description: 'Ultra-fast, lowest cost' },
    { id: 'o3', name: 'o3', description: 'Advanced reasoning for complex tasks' },
    { id: 'o4-mini', name: 'o4-mini', description: 'Fast, cost-efficient reasoning' },
  ],
  google: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Fast, best price-performance', isDefault: true },
    { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'Highest quality reasoning' },
    { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'Fastest, most cost-efficient' },
  ],
  xai: [
    { id: 'grok-3', name: 'Grok 3', description: 'Flagship reasoning and generation', isDefault: true },
    { id: 'grok-3-mini', name: 'Grok 3 Mini', description: 'Fast, cost-efficient' },
  ],
};

/**
 * Build inquirer choices from the catalog for a given provider.
 * Appends a "Custom model ID..." option at the end.
 */
export function getModelChoices(provider: ProviderType): Array<{ name: string; value: string }> {
  const models = MODEL_CATALOG[provider] || [];
  const choices = models.map((m) => ({
    name: `${m.name}${m.isDefault ? ' (recommended)' : ''} — ${m.description}`,
    value: m.id,
  }));
  choices.push({ name: 'Custom model ID...', value: '__custom__' });
  return choices;
}
