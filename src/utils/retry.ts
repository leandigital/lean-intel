/**
 * Retry utility with exponential backoff for LLM API calls
 */

import { logger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

/**
 * Check if an error is retryable (transient)
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const errorName = error.name.toLowerCase();

    // Rate limit errors
    if (message.includes('rate limit') || message.includes('rate_limit')) {
      return true;
    }
    if (message.includes('too many requests') || message.includes('429')) {
      return true;
    }

    // Network/connection errors
    if (message.includes('econnreset') || message.includes('econnrefused')) {
      return true;
    }
    if (message.includes('socket hang up') || message.includes('etimedout')) {
      return true;
    }
    if (message.includes('network') || message.includes('connection')) {
      return true;
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
      return true;
    }
    if (message.includes('internal server error') || message.includes('service unavailable')) {
      return true;
    }
    if (message.includes('bad gateway') || message.includes('gateway timeout')) {
      return true;
    }

    // Overloaded errors (common with Claude)
    if (message.includes('overloaded') || message.includes('capacity')) {
      return true;
    }

    // Check error name/type
    if (errorName.includes('timeout') || errorName.includes('network')) {
      return true;
    }
  }

  // Check for HTTP status codes in error objects
  const errorObj = error as { status?: number; statusCode?: number };
  if (errorObj.status === 429 || errorObj.statusCode === 429) {
    return true;
  }
  if (errorObj.status && errorObj.status >= 500 && errorObj.status < 600) {
    return true;
  }
  if (errorObj.statusCode && errorObj.statusCode >= 500 && errorObj.statusCode < 600) {
    return true;
  }

  return false;
}

/**
 * Extract retry-after delay from error if available
 */
export function getRetryAfterMs(error: unknown): number | null {
  const errorObj = error as { headers?: { 'retry-after'?: string }; retryAfter?: number };

  if (errorObj.retryAfter && typeof errorObj.retryAfter === 'number') {
    return errorObj.retryAfter * 1000;
  }

  if (errorObj.headers?.['retry-after']) {
    const retryAfter = errorObj.headers['retry-after'];
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }
  }

  return null;
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let delay = opts.initialDelayMs;

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt > opts.maxRetries || !isRetryableError(error)) {
        throw error;
      }

      // Calculate delay (use retry-after header if available)
      const retryAfterMs = getRetryAfterMs(error);
      const waitMs = retryAfterMs ? Math.min(retryAfterMs, opts.maxDelayMs) : delay;

      logger.warn(
        `API call failed (attempt ${attempt}/${opts.maxRetries + 1}): ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      logger.info(`Retrying in ${(waitMs / 1000).toFixed(1)}s...`);

      await sleep(waitMs);

      // Increase delay for next attempt (exponential backoff)
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError;
}
