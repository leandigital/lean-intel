/**
 * Provider factory - creates appropriate LLM provider based on config
 */

import { LLMProvider, ProviderConfig, ProviderType } from './types';
import { AnthropicProvider } from './anthropic';
import { OpenAIProvider } from './openai';
import { GoogleProvider } from './google';
import { XAIProvider } from './xai';
import { MODEL_DEFAULTS } from './model-defaults';

export class ProviderFactory {
  static createProvider(config: ProviderConfig): LLMProvider {
    switch (config.type) {
      case 'anthropic':
        return new AnthropicProvider(config.apiKey, config.model);

      case 'openai':
        return new OpenAIProvider(config.apiKey, config.model);

      case 'google':
        return new GoogleProvider(config.apiKey, config.model);

      case 'xai':
        return new XAIProvider(config.apiKey, config.model);

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }
  }

  static getSupportedProviders(): Array<{ name: string; value: ProviderType }> {
    return [
      { name: 'Anthropic (Claude)', value: 'anthropic' },
      { name: 'OpenAI (ChatGPT)', value: 'openai' },
      { name: 'Google (Gemini)', value: 'google' },
      { name: 'xAI (Grok)', value: 'xai' },
    ];
  }

  static getDefaultModel(providerType: ProviderType): string {
    return MODEL_DEFAULTS[providerType];
  }

  static validateApiKey(providerType: ProviderType, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) {
      return false;
    }

    // Provider-specific validation
    switch (providerType) {
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 20;

      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;

      case 'google':
        // Google API keys typically start with 'AI' and are 39 characters
        return apiKey.length >= 20;

      case 'xai':
        return apiKey.startsWith('xai-') && apiKey.length > 20;

      default:
        return apiKey.length >= 20;
    }
  }

  static getApiKeyPlaceholder(providerType: ProviderType): string {
    const placeholders: Record<ProviderType, string> = {
      anthropic: 'sk-ant-...',
      openai: 'sk-...',
      google: 'AIza...',
      xai: 'xai-...',
    };
    return placeholders[providerType];
  }
}
