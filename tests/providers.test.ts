/**
 * Tests for LLM Provider Cost Calculations
 */

import { AnthropicProvider } from '../src/providers/anthropic';
import { OpenAIProvider } from '../src/providers/openai';
import { GoogleProvider } from '../src/providers/google';
import { XAIProvider } from '../src/providers/xai';

describe('LLM Providers', () => {
  describe('AnthropicProvider', () => {
    const provider = new AnthropicProvider('sk-ant-test-key', 'claude-sonnet-4-6');

    it('should have correct name and model', () => {
      expect(provider.getName()).toBe('Anthropic');
      expect(provider.getModel()).toBe('claude-sonnet-4-6');
    });

    describe('calculateCost', () => {
      it('should calculate cost with $3/M input and $15/M output', () => {
        // 100k input, 50k output
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $3) + (50k/1M * $15) = $0.30 + $0.75 = $1.05
        expect(cost).toBe(1.05);
      });

      it('should calculate cost for zero tokens', () => {
        const cost = provider.calculateCost(0, 0);
        expect(cost).toBe(0);
      });

      it('should calculate cost for input only', () => {
        const cost = provider.calculateCost(100000, 0);
        // (100k/1M * $3) = $0.30
        expect(cost).toBe(0.3);
      });

      it('should calculate cost for output only', () => {
        const cost = provider.calculateCost(0, 50000);
        // (50k/1M * $15) = $0.75
        expect(cost).toBe(0.75);
      });

      it('should calculate cost for small token counts', () => {
        const cost = provider.calculateCost(1000, 500);
        // (1k/1M * $3) + (500/1M * $15) = $0.003 + $0.0075 = $0.0105
        expect(cost).toBe(0.0105);
      });

      it('should calculate cost for large token counts', () => {
        const cost = provider.calculateCost(1000000, 500000);
        // (1M/1M * $3) + (500k/1M * $15) = $3 + $7.5 = $10.50
        expect(cost).toBe(10.5);
      });

      it('should round to 4 decimal places', () => {
        const cost = provider.calculateCost(12345, 6789);
        // (12345/1M * $3) + (6789/1M * $15) = $0.037035 + $0.101835 = $0.13887
        // Rounded to 4 decimals: $0.1389
        expect(cost).toBe(0.1389);
      });
    });
  });

  describe('OpenAIProvider', () => {
    describe('GPT-4o model', () => {
      const provider = new OpenAIProvider('sk-test-key', 'gpt-4o');

      it('should have correct name and model', () => {
        expect(provider.getName()).toBe('OpenAI');
        expect(provider.getModel()).toBe('gpt-4o');
      });

      it('should calculate cost with $2.50/M input and $10/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $2.50) + (50k/1M * $10) = $0.25 + $0.50 = $0.75
        expect(cost).toBe(0.75);
      });

      it('should calculate cost for large token counts', () => {
        const cost = provider.calculateCost(1000000, 500000);
        // (1M/1M * $2.50) + (500k/1M * $10) = $2.50 + $5.00 = $7.50
        expect(cost).toBe(7.5);
      });
    });

    describe('GPT-4o-mini model', () => {
      const provider = new OpenAIProvider('sk-test-key', 'gpt-4o-mini');

      it('should have correct model', () => {
        expect(provider.getModel()).toBe('gpt-4o-mini');
      });

      it('should calculate cost with $0.15/M input and $0.60/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $0.15) + (50k/1M * $0.60) = $0.015 + $0.030 = $0.045
        expect(cost).toBe(0.045);
      });

      it('should be much cheaper than GPT-4o', () => {
        const gpt4o = new OpenAIProvider('sk-test-key', 'gpt-4o');
        const gpt4oMini = new OpenAIProvider('sk-test-key', 'gpt-4o-mini');

        const costGPT4o = gpt4o.calculateCost(100000, 50000);
        const costGPT4oMini = gpt4oMini.calculateCost(100000, 50000);

        expect(costGPT4oMini).toBeLessThan(costGPT4o);
        expect(costGPT4o / costGPT4oMini).toBeCloseTo(16.67, 1); // ~16-17x cheaper
      });
    });

    describe('GPT-3.5-turbo model', () => {
      const provider = new OpenAIProvider('sk-test-key', 'gpt-3.5-turbo');

      it('should have correct model', () => {
        expect(provider.getModel()).toBe('gpt-3.5-turbo');
      });

      it('should calculate cost with default fallback pricing ($2/M input, $8/M output)', () => {
        const cost = provider.calculateCost(100000, 50000);
        // gpt-3.5-turbo has no explicit pricing entry, falls back to OpenAI default
        // (100k/1M * $2) + (50k/1M * $8) = $0.20 + $0.40 = $0.60
        expect(cost).toBe(0.6);
      });
    });

    describe('Default model', () => {
      const provider = new OpenAIProvider('sk-test-key');

      it('should default to gpt-4.1', () => {
        expect(provider.getModel()).toBe('gpt-4.1');
      });

      it('should use gpt-4.1 pricing by default', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $2) + (50k/1M * $8) = $0.20 + $0.40 = $0.60
        expect(cost).toBe(0.6); // gpt-4.1 pricing
      });
    });
  });

  describe('GoogleProvider', () => {
    describe('Gemini 2.5 Flash model', () => {
      const provider = new GoogleProvider('AIza-test-key', 'gemini-2.5-flash');

      it('should have correct name and model', () => {
        expect(provider.getName()).toBe('Google');
        expect(provider.getModel()).toBe('gemini-2.5-flash');
      });

      it('should calculate cost with $0.30/M input and $2.50/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $0.30) + (50k/1M * $2.50) = $0.03 + $0.125 = $0.155
        expect(cost).toBe(0.155);
      });

      it('should be cheaper than Claude Sonnet', () => {
        const gemini = new GoogleProvider('test-key', 'gemini-2.5-flash');
        const claude = new AnthropicProvider('test-key', 'claude-sonnet-4-6');

        const costGemini = gemini.calculateCost(100000, 50000);
        const costClaude = claude.calculateCost(100000, 50000);

        expect(costGemini).toBeLessThan(costClaude);
        expect(costClaude / costGemini).toBeCloseTo(6.77, 1); // Claude ~7x more expensive
      });
    });

    describe('Gemini 2.0 Flash model (legacy)', () => {
      const provider = new GoogleProvider('AIza-test-key', 'gemini-2.0-flash');

      it('should have correct model', () => {
        expect(provider.getModel()).toBe('gemini-2.0-flash');
      });

      it('should calculate cost with $0.075/M input and $0.30/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $0.075) + (50k/1M * $0.30) = $0.0075 + $0.015 = $0.0225
        expect(cost).toBe(0.0225);
      });
    });

    describe('Gemini 1.5 Pro model', () => {
      const provider = new GoogleProvider('AIza-test-key', 'gemini-1.5-pro');

      it('should have correct model', () => {
        expect(provider.getModel()).toBe('gemini-1.5-pro');
      });

      it('should calculate cost with $1.25/M input and $5/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $1.25) + (50k/1M * $5) = $0.125 + $0.25 = $0.375
        expect(cost).toBe(0.375);
      });

      it('should be more expensive than 2.5 Flash version', () => {
        const flash = new GoogleProvider('test-key', 'gemini-2.5-flash');
        const pro = new GoogleProvider('test-key', 'gemini-1.5-pro');

        const costFlash = flash.calculateCost(100000, 50000);
        const costPro = pro.calculateCost(100000, 50000);

        expect(costPro).toBeGreaterThan(costFlash);
        expect(costPro / costFlash).toBeCloseTo(2.42, 1);
      });
    });

    describe('Default model', () => {
      const provider = new GoogleProvider('AIza-test-key');

      it('should default to gemini-2.5-flash', () => {
        expect(provider.getModel()).toBe('gemini-2.5-flash');
      });

      it('should use 2.5 flash pricing by default', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $0.30) + (50k/1M * $2.50) = $0.03 + $0.125 = $0.155
        expect(cost).toBe(0.155); // 2.5 flash pricing
      });
    });
  });

  describe('XAIProvider', () => {
    const provider = new XAIProvider('xai-test-key', 'grok-3');

    it('should have correct name and model', () => {
      expect(provider.getName()).toBe('xAI');
      expect(provider.getModel()).toBe('grok-3');
    });

    describe('calculateCost', () => {
      it('should calculate cost with $3/M input and $15/M output', () => {
        const cost = provider.calculateCost(100000, 50000);
        // (100k/1M * $3) + (50k/1M * $15) = $0.30 + $0.75 = $1.05
        expect(cost).toBe(1.05);
      });

      it('should have same pricing as Claude Sonnet', () => {
        const xai = new XAIProvider('test-key', 'grok-3');
        const anthropic = new AnthropicProvider('test-key', 'claude-sonnet-4-6');

        const tokens = { input: 100000, output: 50000 };
        const costXAI = xai.calculateCost(tokens.input, tokens.output);
        const costAnthropic = anthropic.calculateCost(tokens.input, tokens.output);

        expect(costXAI).toBe(costAnthropic); // Same $3/$15 pricing
      });

      it('should calculate cost for large token counts', () => {
        const cost = provider.calculateCost(1000000, 500000);
        // (1M/1M * $3) + (500k/1M * $15) = $3 + $7.5 = $10.50
        expect(cost).toBe(10.5);
      });
    });

    describe('Default model', () => {
      const provider = new XAIProvider('xai-test-key');

      it('should default to grok-3', () => {
        expect(provider.getModel()).toBe('grok-3');
      });
    });
  });

  describe('Provider Cost Comparison', () => {
    const tokens = { input: 100000, output: 50000 };

    it('should rank providers by cost (cheapest to most expensive)', () => {
      const costs = [
        {
          name: 'OpenAI GPT-4o-mini',
          cost: new OpenAIProvider('test', 'gpt-4o-mini').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
        {
          name: 'Google Gemini 2.5 Flash',
          cost: new GoogleProvider('test', 'gemini-2.5-flash').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
        {
          name: 'Google Gemini 1.5 Pro',
          cost: new GoogleProvider('test', 'gemini-1.5-pro').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
        {
          name: 'OpenAI GPT-3.5-turbo',
          cost: new OpenAIProvider('test', 'gpt-3.5-turbo').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
        {
          name: 'OpenAI GPT-4.1',
          cost: new OpenAIProvider('test', 'gpt-4.1').calculateCost(tokens.input, tokens.output),
        },
        {
          name: 'OpenAI GPT-4o',
          cost: new OpenAIProvider('test', 'gpt-4o').calculateCost(tokens.input, tokens.output),
        },
        {
          name: 'Anthropic Claude Sonnet 4.6',
          cost: new AnthropicProvider('test', 'claude-sonnet-4-6').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
        {
          name: 'xAI Grok 3',
          cost: new XAIProvider('test', 'grok-3').calculateCost(
            tokens.input,
            tokens.output
          ),
        },
      ];

      // Verify they're in ascending order
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i].cost).toBeGreaterThanOrEqual(costs[i - 1].cost);
      }

      // Verify specific order
      expect(costs[0].name).toBe('OpenAI GPT-4o-mini'); // Cheapest
    });

    it('should show significant cost differences between providers', () => {
      const cheapest = new OpenAIProvider('test', 'gpt-4o-mini').calculateCost(
        tokens.input,
        tokens.output
      );
      const mostExpensive = new AnthropicProvider('test', 'claude-sonnet-4-6').calculateCost(
        tokens.input,
        tokens.output
      );

      const costRatio = mostExpensive / cheapest;
      expect(costRatio).toBeGreaterThan(20); // Claude Sonnet is >20x more expensive than GPT-4o-mini
    });
  });
});
