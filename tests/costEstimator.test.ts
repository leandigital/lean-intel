/**
 * Tests for Cost Estimator
 */

import { estimateCost, formatCost, formatDuration, ProviderConfig } from '../src/utils/costEstimator';
import { ProjectContext, AnalysisOptions } from '../src/types';

describe('Cost Estimator', () => {
  // Helper to create a minimal project context
  const createContext = (fileCount: number, lineCount: number): ProjectContext => ({
    projectType: 'frontend',
    rootPath: '/test/path',
    frameworks: ['react'],
    languages: ['typescript'],
    hasDatabase: false,
    hasTests: true,
    hasCICD: false,
    dependencies: {},
    devDependencies: {},
    fileCount,
    lineCount,
  });

  // Helper to create analysis options
  const createOptions = (overrides: Partial<AnalysisOptions> = {}): AnalysisOptions => ({
    docs: false,
    security: false,
    license: false,
    quality: false,
    cost: false,
    hipaa: false,
    createPR: false,
    dryRun: false,
    skipCache: false,
    ...overrides,
  });

  describe('estimateCost', () => {
    describe('Small projects (< 100 files, < 10K LOC)', () => {
      const smallContext = createContext(50, 5000);

      it('should estimate documentation cost for small project', () => {
        const options = createOptions({ docs: true });
        const estimate = estimateCost(smallContext, options);

        expect(estimate.inputTokens).toBe(50000);
        expect(estimate.outputTokens).toBe(20000);
        expect(estimate.estimatedCost).toBe(0.45); // (50k/1M * $3) + (20k/1M * $15)
        expect(estimate.estimatedDuration).toBe(30); // minutes
      });

      it('should estimate security analyzer cost for small project', () => {
        const options = createOptions({ security: true });
        const estimate = estimateCost(smallContext, options);

        expect(estimate.inputTokens).toBe(40000);
        expect(estimate.outputTokens).toBe(2000);
        expect(estimate.estimatedCost).toBe(0.15); // (40k/1M * $3) + (2k/1M * $15)
        expect(estimate.estimatedDuration).toBe(15);
      });

      it('should estimate combined analyzers for small project', () => {
        const options = createOptions({
          docs: true,
          security: true,
          license: true,
        });
        const estimate = estimateCost(smallContext, options);

        // docs: 50k in + 20k out
        // security: 40k in + 2k out
        // license: 50k in + 2.5k out
        // Total: 140k in + 24.5k out
        expect(estimate.inputTokens).toBe(140000);
        expect(estimate.outputTokens).toBe(24500);
        expect(estimate.estimatedCost).toBe(0.79); // (140k/1M * $3) + (24.5k/1M * $15)
        expect(estimate.estimatedDuration).toBe(30); // max of 30, 15, 15
      });

      it('should estimate all analyzers including HIPAA for small project', () => {
        const options = createOptions({
          docs: true,
          security: true,
          license: true,
          quality: true,
          cost: true,
          hipaa: true,
        });
        const estimate = estimateCost(smallContext, options);

        // docs: 50k in + 20k out
        // security: 40k in + 2k out
        // license: 50k in + 2.5k out
        // quality: 50k in + 3k out
        // cost: 55k in + 3k out
        // hipaa: 45k in + 3k out
        // Total: 290k in + 33.5k out
        expect(estimate.inputTokens).toBe(290000);
        expect(estimate.outputTokens).toBe(33500);
        expect(estimate.estimatedCost).toBe(1.37); // (290k/1M * $3) + (33.5k/1M * $15)
        expect(estimate.estimatedDuration).toBe(30); // max duration
      });
    });

    describe('Medium projects (100-400 files, 10K-50K LOC)', () => {
      const mediumContext = createContext(150, 25000);

      it('should estimate documentation cost for medium project', () => {
        const options = createOptions({ docs: true });
        const estimate = estimateCost(mediumContext, options);

        expect(estimate.inputTokens).toBe(97000);
        expect(estimate.outputTokens).toBe(45000);
        expect(estimate.estimatedCost).toBe(0.97); // (97k/1M * $3) + (45k/1M * $15)
        expect(estimate.estimatedDuration).toBe(60);
      });

      it('should estimate all analyzers for medium project', () => {
        const options = createOptions({
          security: true,
          license: true,
          quality: true,
          cost: true,
        });
        const estimate = estimateCost(mediumContext, options);

        // security: 62k in + 3.5k out
        // license: 75k in + 4k out
        // quality: 78k in + 5k out
        // cost: 87k in + 5k out
        // Total: 302k in + 17.5k out
        expect(estimate.inputTokens).toBe(302000);
        expect(estimate.outputTokens).toBe(17500);
        expect(estimate.estimatedCost).toBe(1.17); // (302k/1M * $3) + (17.5k/1M * $15)
        expect(estimate.estimatedDuration).toBe(40); // max of 25, 30, 35, 40
      });
    });

    describe('Large projects (> 400 files, > 50K LOC)', () => {
      const largeContext = createContext(500, 75000);

      it('should estimate documentation cost for large project', () => {
        const options = createOptions({ docs: true });
        const estimate = estimateCost(largeContext, options);

        expect(estimate.inputTokens).toBe(180000);
        expect(estimate.outputTokens).toBe(80000);
        expect(estimate.estimatedCost).toBe(1.74); // (180k/1M * $3) + (80k/1M * $15)
        expect(estimate.estimatedDuration).toBe(120);
      });

      it('should estimate all analyzers for large project', () => {
        const options = createOptions({
          docs: true,
          security: true,
          license: true,
          quality: true,
          cost: true,
          hipaa: true,
        });
        const estimate = estimateCost(largeContext, options);

        // docs: 180k in + 80k out
        // security: 100k in + 5k out
        // license: 120k in + 6k out
        // quality: 130k in + 8k out
        // cost: 140k in + 8k out
        // hipaa: 110k in + 8k out
        // Total: 780k in + 115k out
        expect(estimate.inputTokens).toBe(780000);
        expect(estimate.outputTokens).toBe(115000);
        expect(estimate.estimatedCost).toBe(4.06); // (780k/1M * $3) + (115k/1M * $15) = $2.34 + $1.725 = $4.065 → $4.06
        expect(estimate.estimatedDuration).toBe(120); // max duration
      });
    });

    describe('Edge cases', () => {
      it('should handle zero analyzers selected', () => {
        const context = createContext(100, 10000);
        const options = createOptions(); // all false
        const estimate = estimateCost(context, options);

        expect(estimate.inputTokens).toBe(0);
        expect(estimate.outputTokens).toBe(0);
        expect(estimate.estimatedCost).toBe(0);
        expect(estimate.estimatedDuration).toBe(0);
      });

      it('should handle boundary between small and medium (exactly 100 files)', () => {
        const context = createContext(100, 10000);
        const options = createOptions({ docs: true });
        const estimate = estimateCost(context, options);

        // Should be medium
        expect(estimate.inputTokens).toBe(97000);
        expect(estimate.outputTokens).toBe(45000);
      });

      it('should handle boundary between small and medium (exactly 10K LOC)', () => {
        const context = createContext(50, 10000);
        const options = createOptions({ docs: true });
        const estimate = estimateCost(context, options);

        // Should be medium (10K LOC exactly)
        expect(estimate.inputTokens).toBe(97000);
        expect(estimate.outputTokens).toBe(45000);
      });

      it('should handle boundary between medium and large (exactly 400 files)', () => {
        const context = createContext(400, 25000);
        const options = createOptions({ docs: true });
        const estimate = estimateCost(context, options);

        // Should be large
        expect(estimate.inputTokens).toBe(180000);
        expect(estimate.outputTokens).toBe(80000);
      });

      it('should handle very small projects (1 file, 100 LOC)', () => {
        const context = createContext(1, 100);
        const options = createOptions({ docs: true });
        const estimate = estimateCost(context, options);

        // Should be small
        expect(estimate.inputTokens).toBe(50000);
        expect(estimate.outputTokens).toBe(20000);
        expect(estimate.estimatedCost).toBe(0.45);
      });

      it('should handle very large projects (10K files, 1M LOC)', () => {
        const context = createContext(10000, 1000000);
        const options = createOptions({ docs: true });
        const estimate = estimateCost(context, options);

        // Should be large
        expect(estimate.inputTokens).toBe(180000);
        expect(estimate.outputTokens).toBe(80000);
        expect(estimate.estimatedCost).toBe(1.74);
      });
    });

    describe('Duration calculation', () => {
      it('should use maximum duration when multiple analyzers run in parallel', () => {
        const context = createContext(150, 25000); // medium
        const options = createOptions({
          security: true, // 25 min
          license: true, // 30 min
          quality: true, // 35 min
          cost: true, // 40 min
        });
        const estimate = estimateCost(context, options);

        // Should be max of all durations (parallel execution)
        expect(estimate.estimatedDuration).toBe(40);
      });

      it('should handle docs separately from analyzers', () => {
        const context = createContext(150, 25000); // medium
        const options = createOptions({
          docs: true, // 60 min
          security: true, // 25 min
        });
        const estimate = estimateCost(context, options);

        // Docs takes longer
        expect(estimate.estimatedDuration).toBe(60);
      });
    });
  });

  describe('formatCost', () => {
    it('should format zero cost', () => {
      expect(formatCost(0)).toBe('$0.00');
    });

    it('should format small costs', () => {
      expect(formatCost(0.45)).toBe('$0.45');
      expect(formatCost(0.1)).toBe('$0.10');
      expect(formatCost(0.01)).toBe('$0.01');
    });

    it('should format whole dollar amounts', () => {
      expect(formatCost(1)).toBe('$1.00');
      expect(formatCost(10)).toBe('$10.00');
      expect(formatCost(100)).toBe('$100.00');
    });

    it('should format large costs', () => {
      expect(formatCost(1234.56)).toBe('$1234.56');
      expect(formatCost(999.99)).toBe('$999.99');
    });

    it('should round to 2 decimal places', () => {
      expect(formatCost(1.234)).toBe('$1.23');
      expect(formatCost(1.235)).toBe('$1.24');
      expect(formatCost(1.999)).toBe('$2.00');
    });
  });

  describe('formatDuration', () => {
    it('should format minutes only (< 60 min)', () => {
      expect(formatDuration(0)).toBe('0 min');
      expect(formatDuration(1)).toBe('1 min');
      expect(formatDuration(15)).toBe('15 min');
      expect(formatDuration(30)).toBe('30 min');
      expect(formatDuration(59)).toBe('59 min');
    });

    it('should format exactly 1 hour', () => {
      expect(formatDuration(60)).toBe('1h');
    });

    it('should format hours only (no remaining minutes)', () => {
      expect(formatDuration(120)).toBe('2h');
      expect(formatDuration(180)).toBe('3h');
      expect(formatDuration(240)).toBe('4h');
    });

    it('should format hours and minutes', () => {
      expect(formatDuration(61)).toBe('1h 1m');
      expect(formatDuration(90)).toBe('1h 30m');
      expect(formatDuration(125)).toBe('2h 5m');
      expect(formatDuration(195)).toBe('3h 15m');
    });

    it('should handle large durations', () => {
      expect(formatDuration(300)).toBe('5h');
      expect(formatDuration(360)).toBe('6h');
      expect(formatDuration(425)).toBe('7h 5m');
      expect(formatDuration(1440)).toBe('24h'); // 1 day
    });
  });

  describe('Provider-specific pricing', () => {
    const smallContext: ProjectContext = {
      projectType: 'frontend',
      rootPath: '/test/path',
      frameworks: ['react'],
      languages: ['typescript'],
      hasDatabase: false,
      hasTests: true,
      hasCICD: false,
      dependencies: {},
      devDependencies: {},
      fileCount: 50,
      lineCount: 5000,
    };

    const docsOptions: AnalysisOptions = {
      docs: true,
      security: false,
      license: false,
      quality: false,
      cost: false,
      hipaa: false,
      createPR: false,
      dryRun: false,
      skipCache: false,
    };

    it('should use Anthropic Claude Sonnet pricing by default', () => {
      const estimate = estimateCost(smallContext, docsOptions);
      // 50k input @ $3/M + 20k output @ $15/M = $0.15 + $0.30 = $0.45
      expect(estimate.estimatedCost).toBe(0.45);
      expect(estimate.pricingInfo).toBe('$3/$15 per M');
    });

    it('should use Google Gemini pricing when specified', () => {
      const config: ProviderConfig = { type: 'google' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $0.30/M + 20k output @ $2.50/M = $0.015 + $0.05 = $0.065 → $0.07
      expect(estimate.estimatedCost).toBe(0.07);
      expect(estimate.pricingInfo).toBe('$0.3/$2.5 per M');
    });

    it('should use OpenAI GPT-4.1 pricing when specified', () => {
      const config: ProviderConfig = { type: 'openai' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $2/M + 20k output @ $8/M = $0.10 + $0.16 = $0.26
      expect(estimate.estimatedCost).toBe(0.26);
      expect(estimate.pricingInfo).toBe('$2/$8 per M');
    });

    it('should use xAI Grok pricing when specified', () => {
      const config: ProviderConfig = { type: 'xai' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // Same as Anthropic Sonnet: $3/$15
      expect(estimate.estimatedCost).toBe(0.45);
      expect(estimate.pricingInfo).toBe('$3/$15 per M');
    });

    it('should use Anthropic Opus pricing when model specified', () => {
      const config: ProviderConfig = { type: 'anthropic', model: 'claude-opus-4-5-20251101' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $5/M + 20k output @ $25/M = $0.25 + $0.50 = $0.75
      expect(estimate.estimatedCost).toBe(0.75);
      expect(estimate.pricingInfo).toBe('$5/$25 per M');
    });

    it('should use Anthropic Haiku pricing when model specified', () => {
      const config: ProviderConfig = { type: 'anthropic', model: 'claude-3-5-haiku-20241022' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $1/M + 20k output @ $5/M = $0.05 + $0.10 = $0.15
      expect(estimate.estimatedCost).toBe(0.15);
      expect(estimate.pricingInfo).toBe('$1/$5 per M');
    });

    it('should use OpenAI GPT-4.1-mini pricing when model specified', () => {
      const config: ProviderConfig = { type: 'openai', model: 'gpt-4.1-mini' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $0.40/M + 20k output @ $1.60/M = $0.02 + $0.032 = $0.052 → $0.05
      expect(estimate.estimatedCost).toBe(0.05);
      expect(estimate.pricingInfo).toBe('$0.4/$1.6 per M');
    });

    it('should use Google Gemini 2.5 Pro pricing when model specified', () => {
      const config: ProviderConfig = { type: 'google', model: 'gemini-2.5-pro' };
      const estimate = estimateCost(smallContext, docsOptions, config);
      // 50k input @ $1.25/M + 20k output @ $10/M = $0.0625 + $0.20 = $0.2625 → $0.26
      expect(estimate.estimatedCost).toBe(0.26);
      expect(estimate.pricingInfo).toBe('$1.25/$10 per M');
    });
  });
});
