/**
 * Tests for retry utility
 */

import { withRetry, isRetryableError } from '../src/utils/retry';

describe('retry utility', () => {
  describe('isRetryableError', () => {
    it('should identify rate limit errors', () => {
      const error = new Error('Rate limit exceeded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify 429 errors', () => {
      const error = new Error('Error 429: Too many requests');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify 500 errors', () => {
      const error = new Error('500 Internal Server Error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify 503 errors', () => {
      const error = new Error('503 Service Unavailable');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify timeout errors', () => {
      const error = new Error('Request timeout');
      error.name = 'TimeoutError';
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify network errors', () => {
      const error = new Error('ECONNRESET: network error');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should identify overloaded errors', () => {
      const error = new Error('The server is overloaded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should not identify auth errors as retryable', () => {
      const error = new Error('Invalid API key');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should not identify validation errors as retryable', () => {
      const error = new Error('Invalid request: missing required field');
      expect(isRetryableError(error)).toBe(false);
    });

    it('should handle errors with status property', () => {
      const error = { message: 'Error', status: 429 } as Error & { status: number };
      expect(isRetryableError(error)).toBe(true);
    });

    it('should handle errors with statusCode property', () => {
      const error = { message: 'Error', statusCode: 503 } as Error & { statusCode: number };
      expect(isRetryableError(error)).toBe(true);
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, { maxRetries: 3, initialDelayMs: 10 });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should respect maxRetries limit', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Rate limit'));

      await expect(
        withRetry(fn, { maxRetries: 2, initialDelayMs: 10 })
      ).rejects.toThrow('Rate limit');

      expect(fn).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('Invalid API key'));

      await expect(
        withRetry(fn, { maxRetries: 3, initialDelayMs: 10 })
      ).rejects.toThrow('Invalid API key');

      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff', async () => {
      const startTime = Date.now();
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      await withRetry(fn, { maxRetries: 3, initialDelayMs: 50 });

      const elapsed = Date.now() - startTime;
      // First retry: 50ms, second retry: 100ms = 150ms minimum
      expect(elapsed).toBeGreaterThanOrEqual(100);
    });

    it('should respect maxDelayMs', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValue('success');

      const startTime = Date.now();
      await withRetry(fn, {
        maxRetries: 4,
        initialDelayMs: 20,
        maxDelayMs: 30, // Cap at 30ms
        backoffMultiplier: 10, // Would normally grow fast
      });

      const elapsed = Date.now() - startTime;
      // Without maxDelayMs cap: 20 + 200 + 2000 = 2220ms
      // With maxDelayMs cap of 30ms: 20 + 30 + 30 = 80ms (approx)
      expect(elapsed).toBeLessThan(200);
    });

    it('should use default options when none provided', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle async functions correctly', async () => {
      const fn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return 'async result';
      });

      const result = await withRetry(fn, { maxRetries: 2, initialDelayMs: 10 });

      expect(result).toBe('async result');
    });

    it('should preserve error type on final failure', async () => {
      class CustomError extends Error {
        code = 'CUSTOM_ERROR';
      }
      const customError = new CustomError('Custom rate limit error');
      customError.message = 'Custom rate limit error';

      const fn = jest.fn().mockRejectedValue(customError);

      try {
        await withRetry(fn, { maxRetries: 1, initialDelayMs: 10 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(CustomError);
        expect((error as CustomError).code).toBe('CUSTOM_ERROR');
      }
    });
  });
});
