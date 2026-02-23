/**
 * Tests for LLM cache utility
 */

import * as fs from 'fs';
import * as path from 'path';
import { LLMCache } from '../src/utils/llmCache';

describe('LLM Cache', () => {
  const testCacheDir = path.join(__dirname, 'fixtures', '.test-cache-project');
  let cache: LLMCache;

  beforeEach(() => {
    // Clean up test cache directory
    const cacheSubdir = path.join(testCacheDir, '.lean-intel', 'llm-cache');
    if (fs.existsSync(cacheSubdir)) {
      fs.rmSync(cacheSubdir, { recursive: true });
    }
    cache = new LLMCache(testCacheDir);
  });

  afterAll(() => {
    // Clean up after all tests
    const leanIntelDir = path.join(testCacheDir, '.lean-intel');
    if (fs.existsSync(leanIntelDir)) {
      fs.rmSync(leanIntelDir, { recursive: true });
    }
  });

  describe('Cache operations', () => {
    it('should return null for cache miss', async () => {
      const result = await cache.get('prompt', 'model', 1000, 0.7);
      expect(result).toBeNull();
    });

    it('should store and retrieve cached result', async () => {
      const testResult = {
        content: 'test response',
        inputTokens: 100,
        outputTokens: 50,
        cost: 0.001,
      };

      await cache.set('prompt', 'model', 1000, 0.7, testResult);
      const result = await cache.get('prompt', 'model', 1000, 0.7);

      expect(result).toEqual(testResult);
    });

    it('should return different results for different prompts', async () => {
      const result1 = { content: 'response1', inputTokens: 100, outputTokens: 50, cost: 0.001 };
      const result2 = { content: 'response2', inputTokens: 100, outputTokens: 50, cost: 0.001 };

      await cache.set('prompt1', 'model', 1000, 0.7, result1);
      await cache.set('prompt2', 'model', 1000, 0.7, result2);

      const cached1 = await cache.get('prompt1', 'model', 1000, 0.7);
      const cached2 = await cache.get('prompt2', 'model', 1000, 0.7);

      expect(cached1?.content).toBe('response1');
      expect(cached2?.content).toBe('response2');
    });

    it('should return different results for different models', async () => {
      const result1 = { content: 'response1', inputTokens: 100, outputTokens: 50, cost: 0.001 };
      const result2 = { content: 'response2', inputTokens: 100, outputTokens: 50, cost: 0.001 };

      await cache.set('prompt', 'model1', 1000, 0.7, result1);
      await cache.set('prompt', 'model2', 1000, 0.7, result2);

      const cached1 = await cache.get('prompt', 'model1', 1000, 0.7);
      const cached2 = await cache.get('prompt', 'model2', 1000, 0.7);

      expect(cached1?.content).toBe('response1');
      expect(cached2?.content).toBe('response2');
    });

    it('should return different results for different temperatures', async () => {
      const result1 = { content: 'response1', inputTokens: 100, outputTokens: 50, cost: 0.001 };
      const result2 = { content: 'response2', inputTokens: 100, outputTokens: 50, cost: 0.001 };

      await cache.set('prompt', 'model', 1000, 0.5, result1);
      await cache.set('prompt', 'model', 1000, 0.9, result2);

      const cached1 = await cache.get('prompt', 'model', 1000, 0.5);
      const cached2 = await cache.get('prompt', 'model', 1000, 0.9);

      expect(cached1?.content).toBe('response1');
      expect(cached2?.content).toBe('response2');
    });

    it('should skip cache when skipCache option is true', async () => {
      const testResult = { content: 'test', inputTokens: 10, outputTokens: 5, cost: 0.0001 };

      await cache.set('prompt', 'model', 100, 0.5, testResult);
      const result = await cache.get('prompt', 'model', 100, 0.5, { skipCache: true });

      expect(result).toBeNull();
    });

    it('should create cache directory if it does not exist', async () => {
      const testResult = { content: 'test', inputTokens: 10, outputTokens: 5, cost: 0.0001 };

      await cache.set('prompt', 'model', 100, 0.5, testResult);

      const cacheDir = path.join(testCacheDir, '.lean-intel', 'llm-cache');
      expect(fs.existsSync(cacheDir)).toBe(true);
    });

    it('should handle concurrent cache access', async () => {
      const testResult = { content: 'test response', inputTokens: 100, outputTokens: 50, cost: 0.001 };

      // Concurrent writes
      await Promise.all([
        cache.set('prompt1', 'model', 1000, 0.7, testResult),
        cache.set('prompt2', 'model', 1000, 0.7, testResult),
        cache.set('prompt3', 'model', 1000, 0.7, testResult),
      ]);

      // Concurrent reads
      const results = await Promise.all([
        cache.get('prompt1', 'model', 1000, 0.7),
        cache.get('prompt2', 'model', 1000, 0.7),
        cache.get('prompt3', 'model', 1000, 0.7),
      ]);

      expect(results.every(r => r !== null)).toBe(true);
    });

    it('should clear cache', async () => {
      const testResult = { content: 'test', inputTokens: 10, outputTokens: 5, cost: 0.0001 };

      await cache.set('prompt1', 'model', 100, 0.5, testResult);
      await cache.set('prompt2', 'model', 100, 0.5, testResult);

      await cache.clear();

      const result1 = await cache.get('prompt1', 'model', 100, 0.5);
      const result2 = await cache.get('prompt2', 'model', 100, 0.5);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });

    it('should return cache statistics', async () => {
      const testResult = { content: 'test', inputTokens: 10, outputTokens: 5, cost: 0.0001 };

      await cache.set('prompt1', 'model', 100, 0.5, testResult);
      await cache.set('prompt2', 'model', 100, 0.5, testResult);

      const stats = await cache.getStats();

      expect(stats.entries).toBe(2);
      expect(stats.sizeBytes).toBeGreaterThan(0);
    });

    it('should return zero stats for empty cache', async () => {
      await cache.clear();
      const stats = await cache.getStats();

      expect(stats.entries).toBe(0);
      expect(stats.sizeBytes).toBe(0);
    });
  });

  describe('TTL handling', () => {
    it('should return null for expired cache with custom TTL', async () => {
      const testResult = { content: 'test response', inputTokens: 100, outputTokens: 50, cost: 0.001 };

      await cache.set('prompt', 'model', 1000, 0.7, testResult);

      // Manually modify cache file to be expired
      const cacheDir = path.join(testCacheDir, '.lean-intel', 'llm-cache');
      const files = fs.readdirSync(cacheDir);
      const cacheFile = files.find(f => f.endsWith('.json'));
      if (cacheFile) {
        const cacheFilePath = path.join(cacheDir, cacheFile);
        const cacheData = JSON.parse(fs.readFileSync(cacheFilePath, 'utf-8'));
        cacheData.timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
        fs.writeFileSync(cacheFilePath, JSON.stringify(cacheData));

        // Request with 1 hour TTL - should be expired
        const result = await cache.get('prompt', 'model', 1000, 0.7, {
          ttlSeconds: 3600,
        });
        expect(result).toBeNull();
      }
    });
  });
});
