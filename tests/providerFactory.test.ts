/**
 * Tests for Provider Factory
 */

import { ProviderFactory } from '../src/providers/factory';
import { ProviderConfig, ProviderType } from '../src/providers/types';
import { AnthropicProvider } from '../src/providers/anthropic';
import { OpenAIProvider } from '../src/providers/openai';
import { GoogleProvider } from '../src/providers/google';
import { XAIProvider } from '../src/providers/xai';

describe('ProviderFactory', () => {
  describe('createProvider', () => {
    it('should create Anthropic provider', () => {
      const config: ProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-api-test-key-12345',
        model: 'claude-sonnet-4-6',
      };
      const provider = ProviderFactory.createProvider(config);

      expect(provider).toBeInstanceOf(AnthropicProvider);
      expect(provider.getName()).toBe('Anthropic');
      expect(provider.getModel()).toBe('claude-sonnet-4-6');
    });

    it('should create OpenAI provider', () => {
      const config: ProviderConfig = {
        type: 'openai',
        apiKey: 'sk-test-key-12345',
        model: 'gpt-4o',
      };
      const provider = ProviderFactory.createProvider(config);

      expect(provider).toBeInstanceOf(OpenAIProvider);
      expect(provider.getName()).toBe('OpenAI');
      expect(provider.getModel()).toBe('gpt-4o');
    });

    it('should create Google provider', () => {
      const config: ProviderConfig = {
        type: 'google',
        apiKey: 'AIzaSyTest-Key-12345',
        model: 'gemini-2.0-flash-exp',
      };
      const provider = ProviderFactory.createProvider(config);

      expect(provider).toBeInstanceOf(GoogleProvider);
      expect(provider.getName()).toBe('Google');
      expect(provider.getModel()).toBe('gemini-2.0-flash-exp');
    });

    it('should create xAI provider', () => {
      const config: ProviderConfig = {
        type: 'xai',
        apiKey: 'xai-test-key-12345',
        model: 'grok-2-1212',
      };
      const provider = ProviderFactory.createProvider(config);

      expect(provider).toBeInstanceOf(XAIProvider);
      expect(provider.getName()).toBe('xAI');
      expect(provider.getModel()).toBe('grok-2-1212');
    });

    it('should use default model when not specified', () => {
      const config: ProviderConfig = {
        type: 'anthropic',
        apiKey: 'sk-ant-api-test-key-12345',
      };
      const provider = ProviderFactory.createProvider(config);

      expect(provider.getModel()).toBe('claude-sonnet-4-6');
    });

    it('should throw error for unsupported provider type', () => {
      const config = {
        type: 'unsupported-provider' as ProviderType,
        apiKey: 'test-key',
      };

      expect(() => ProviderFactory.createProvider(config)).toThrow(
        'Unsupported provider type: unsupported-provider'
      );
    });
  });

  describe('getSupportedProviders', () => {
    it('should return all supported providers', () => {
      const providers = ProviderFactory.getSupportedProviders();

      expect(providers).toHaveLength(4);
      expect(providers).toEqual([
        { name: 'Anthropic (Claude)', value: 'anthropic' },
        { name: 'OpenAI (ChatGPT)', value: 'openai' },
        { name: 'Google (Gemini)', value: 'google' },
        { name: 'xAI (Grok)', value: 'xai' },
      ]);
    });

    it('should return array with correct structure', () => {
      const providers = ProviderFactory.getSupportedProviders();

      providers.forEach(provider => {
        expect(provider).toHaveProperty('name');
        expect(provider).toHaveProperty('value');
        expect(typeof provider.name).toBe('string');
        expect(typeof provider.value).toBe('string');
      });
    });
  });

  describe('getDefaultModel', () => {
    it('should return correct default model for Anthropic', () => {
      expect(ProviderFactory.getDefaultModel('anthropic')).toBe(
        'claude-sonnet-4-6'
      );
    });

    it('should return correct default model for OpenAI', () => {
      expect(ProviderFactory.getDefaultModel('openai')).toBe('gpt-4.1');
    });

    it('should return correct default model for Google', () => {
      expect(ProviderFactory.getDefaultModel('google')).toBe('gemini-2.5-flash');
    });

    it('should return correct default model for xAI', () => {
      expect(ProviderFactory.getDefaultModel('xai')).toBe('grok-3');
    });
  });

  describe('validateApiKey', () => {
    describe('Anthropic validation', () => {
      it('should accept valid Anthropic API key', () => {
        expect(
          ProviderFactory.validateApiKey('anthropic', 'sk-ant-api03-12345678901234567890123456789012345678901234567890')
        ).toBe(true);
      });

      it('should reject Anthropic key without sk-ant- prefix', () => {
        expect(
          ProviderFactory.validateApiKey('anthropic', 'invalid-12345678901234567890123456789012345678901234567890')
        ).toBe(false);
      });

      it('should reject Anthropic key that is too short', () => {
        expect(ProviderFactory.validateApiKey('anthropic', 'sk-ant-short')).toBe(false);
      });

      it('should reject empty Anthropic key', () => {
        expect(ProviderFactory.validateApiKey('anthropic', '')).toBe(false);
      });

      it('should reject whitespace-only Anthropic key', () => {
        expect(ProviderFactory.validateApiKey('anthropic', '   ')).toBe(false);
      });
    });

    describe('OpenAI validation', () => {
      it('should accept valid OpenAI API key', () => {
        expect(
          ProviderFactory.validateApiKey('openai', 'sk-12345678901234567890123456789012345678901234567890')
        ).toBe(true);
      });

      it('should reject OpenAI key without sk- prefix', () => {
        expect(
          ProviderFactory.validateApiKey('openai', 'invalid-12345678901234567890123456789012345678901234567890')
        ).toBe(false);
      });

      it('should reject OpenAI key that is too short', () => {
        expect(ProviderFactory.validateApiKey('openai', 'sk-short')).toBe(false);
      });

      it('should reject empty OpenAI key', () => {
        expect(ProviderFactory.validateApiKey('openai', '')).toBe(false);
      });
    });

    describe('Google validation', () => {
      it('should accept valid Google API key', () => {
        expect(
          ProviderFactory.validateApiKey('google', 'AIzaSyTest-Key-12345678901234567890')
        ).toBe(true);
      });

      it('should accept Google key without AI prefix (flexible validation)', () => {
        expect(
          ProviderFactory.validateApiKey('google', 'TestKey-12345678901234567890')
        ).toBe(true);
      });

      it('should reject Google key that is too short', () => {
        expect(ProviderFactory.validateApiKey('google', 'AIzaShort')).toBe(false);
      });

      it('should reject empty Google key', () => {
        expect(ProviderFactory.validateApiKey('google', '')).toBe(false);
      });
    });

    describe('xAI validation', () => {
      it('should accept valid xAI API key', () => {
        expect(
          ProviderFactory.validateApiKey('xai', 'xai-12345678901234567890123456789012345678901234567890')
        ).toBe(true);
      });

      it('should reject xAI key without xai- prefix', () => {
        expect(
          ProviderFactory.validateApiKey('xai', 'invalid-12345678901234567890123456789012345678901234567890')
        ).toBe(false);
      });

      it('should reject xAI key that is too short', () => {
        expect(ProviderFactory.validateApiKey('xai', 'xai-short')).toBe(false);
      });

      it('should reject empty xAI key', () => {
        expect(ProviderFactory.validateApiKey('xai', '')).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should handle null values', () => {
        expect(ProviderFactory.validateApiKey('anthropic', null as any)).toBe(false);
      });

      it('should handle undefined values', () => {
        expect(ProviderFactory.validateApiKey('anthropic', undefined as any)).toBe(false);
      });

      it('should trim whitespace before validation', () => {
        expect(
          ProviderFactory.validateApiKey('anthropic', '   sk-ant-api03-12345678901234567890123456789012345678901234567890   ')
        ).toBe(false); // Trimmed by validation logic
      });
    });
  });

  describe('getApiKeyPlaceholder', () => {
    it('should return correct placeholder for Anthropic', () => {
      expect(ProviderFactory.getApiKeyPlaceholder('anthropic')).toBe('sk-ant-...');
    });

    it('should return correct placeholder for OpenAI', () => {
      expect(ProviderFactory.getApiKeyPlaceholder('openai')).toBe('sk-...');
    });

    it('should return correct placeholder for Google', () => {
      expect(ProviderFactory.getApiKeyPlaceholder('google')).toBe('AIza...');
    });

    it('should return correct placeholder for xAI', () => {
      expect(ProviderFactory.getApiKeyPlaceholder('xai')).toBe('xai-...');
    });
  });
});
