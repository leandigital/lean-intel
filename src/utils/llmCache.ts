/**
 * LLM Response Cache - Caches LLM API responses to avoid redundant calls
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import simpleGit from 'simple-git';
import { logger } from './logger';
import { CompletionResult } from '../providers/types';

export interface CacheOptions {
  ttlSeconds?: number; // Cache TTL in seconds (default: 24 hours)
  skipCache?: boolean; // Bypass cache entirely
}

interface CacheEntry {
  result: CompletionResult;
  timestamp: number;
  promptHash: string;
  model: string;
  gitCommit?: string;
}

const DEFAULT_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export class LLMCache {
  private cacheDir: string;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.cacheDir = path.join(projectPath, '.lean-intel', 'llm-cache');
  }

  /**
   * Generate a cache key from prompt and options
   */
  private generateCacheKey(prompt: string, model: string, maxTokens: number, temperature: number): string {
    const content = JSON.stringify({ prompt, model, maxTokens, temperature });
    return crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);
  }

  /**
   * Get current git commit hash (for cache invalidation)
   */
  private async getGitCommit(): Promise<string | undefined> {
    try {
      const git = simpleGit(this.projectPath);
      const log = await git.log({ maxCount: 1 });
      return log.latest?.hash?.substring(0, 8);
    } catch {
      return undefined;
    }
  }

  /**
   * Get cached response if available and valid
   */
  async get(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
    options: CacheOptions = {}
  ): Promise<CompletionResult | null> {
    if (options.skipCache) {
      return null;
    }

    const cacheKey = this.generateCacheKey(prompt, model, maxTokens, temperature);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    try {
      const exists = await fs.pathExists(cacheFile);
      if (!exists) {
        return null;
      }

      const cacheData = await fs.readFile(cacheFile, 'utf-8');
      const entry: CacheEntry = JSON.parse(cacheData);

      // Check TTL
      const ttl = options.ttlSeconds ?? DEFAULT_TTL_SECONDS;
      const ageSeconds = (Date.now() - entry.timestamp) / 1000;
      if (ageSeconds > ttl) {
        logger.debug(`Cache expired for ${cacheKey} (${Math.round(ageSeconds / 3600)}h old)`);
        await fs.remove(cacheFile);
        return null;
      }

      // Check if git commit changed (invalidate cache if code changed)
      const currentCommit = await this.getGitCommit();
      if (entry.gitCommit && currentCommit && entry.gitCommit !== currentCommit) {
        logger.debug(`Cache invalidated for ${cacheKey} (git commit changed)`);
        await fs.remove(cacheFile);
        return null;
      }

      logger.debug(`Cache hit for ${cacheKey}`);
      return entry.result;
    } catch (error) {
      logger.debug(`Cache read failed: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Store response in cache
   */
  async set(
    prompt: string,
    model: string,
    maxTokens: number,
    temperature: number,
    result: CompletionResult
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(prompt, model, maxTokens, temperature);
    const cacheFile = path.join(this.cacheDir, `${cacheKey}.json`);

    try {
      await fs.ensureDir(this.cacheDir);

      const gitCommit = await this.getGitCommit();
      const entry: CacheEntry = {
        result,
        timestamp: Date.now(),
        promptHash: cacheKey,
        model,
        gitCommit,
      };

      await fs.writeFile(cacheFile, JSON.stringify(entry, null, 2), 'utf-8');
      logger.debug(`Cached response for ${cacheKey}`);
    } catch (error) {
      logger.debug(`Cache write failed: ${(error as Error).message}`);
    }
  }

  /**
   * Clear all cached responses
   */
  async clear(): Promise<void> {
    try {
      const exists = await fs.pathExists(this.cacheDir);
      if (exists) {
        await fs.remove(this.cacheDir);
        logger.debug('LLM cache cleared');
      }
    } catch (error) {
      logger.debug(`Cache clear failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{ entries: number; sizeBytes: number }> {
    try {
      const exists = await fs.pathExists(this.cacheDir);
      if (!exists) {
        return { entries: 0, sizeBytes: 0 };
      }

      const files = await fs.readdir(this.cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      let totalSize = 0;
      for (const file of jsonFiles) {
        const stats = await fs.stat(path.join(this.cacheDir, file));
        totalSize += stats.size;
      }

      return { entries: jsonFiles.length, sizeBytes: totalSize };
    } catch {
      return { entries: 0, sizeBytes: 0 };
    }
  }
}
