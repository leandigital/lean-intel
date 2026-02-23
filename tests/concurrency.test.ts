/**
 * Tests for concurrency utilities
 */

import { parallelLimit, parallelLimitStrict, parallelLimitWithProgress, ParallelResult } from '../src/utils/concurrency';

describe('concurrency utilities', () => {
  describe('parallelLimit', () => {
    it('should execute all tasks and return results in order', async () => {
      const tasks = [
        async () => 'a',
        async () => 'b',
        async () => 'c',
      ];

      const results = await parallelLimit(tasks, 2);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toBe('a');
      expect(results[1].status).toBe('fulfilled');
      expect(results[1].value).toBe('b');
      expect(results[2].status).toBe('fulfilled');
      expect(results[2].value).toBe('c');
    });

    it('should handle empty task array', async () => {
      const results = await parallelLimit([], 3);
      expect(results).toEqual([]);
    });

    it('should handle single task', async () => {
      const tasks = [async () => 42];
      const results = await parallelLimit(tasks, 1);

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toBe(42);
    });

    it('should respect concurrency limit', async () => {
      const concurrentCalls: number[] = [];
      let currentConcurrent = 0;
      let maxConcurrent = 0;

      const tasks = Array(10).fill(null).map((_, i) => async () => {
        currentConcurrent++;
        maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
        concurrentCalls.push(currentConcurrent);
        await new Promise(resolve => setTimeout(resolve, 10));
        currentConcurrent--;
        return i;
      });

      await parallelLimit(tasks, 3);

      expect(maxConcurrent).toBeLessThanOrEqual(3);
    });

    it('should handle task failures gracefully', async () => {
      const tasks = [
        async () => 'success1',
        async () => { throw new Error('failure'); },
        async () => 'success2',
      ];

      const results = await parallelLimit(tasks, 2);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[0].value).toBe('success1');
      expect(results[1].status).toBe('rejected');
      expect(results[1].reason).toBeInstanceOf(Error);
      expect(results[1].reason?.message).toBe('failure');
      expect(results[2].status).toBe('fulfilled');
      expect(results[2].value).toBe('success2');
    });

    it('should include correct index in results', async () => {
      const tasks = [
        async () => 'a',
        async () => 'b',
        async () => 'c',
      ];

      const results = await parallelLimit(tasks, 2);

      expect(results[0].index).toBe(0);
      expect(results[1].index).toBe(1);
      expect(results[2].index).toBe(2);
    });

    it('should handle limit greater than task count', async () => {
      const tasks = [
        async () => 1,
        async () => 2,
      ];

      const results = await parallelLimit(tasks, 10);

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe(1);
      expect(results[1].value).toBe(2);
    });

    it('should handle limit of 1 (sequential execution)', async () => {
      const order: number[] = [];
      const tasks = [
        async () => { order.push(1); return 1; },
        async () => { order.push(2); return 2; },
        async () => { order.push(3); return 3; },
      ];

      await parallelLimit(tasks, 1);

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('parallelLimitStrict', () => {
    it('should return values directly on success', async () => {
      const tasks = [
        async () => 'a',
        async () => 'b',
        async () => 'c',
      ];

      const results = await parallelLimitStrict(tasks, 2);

      expect(results).toEqual(['a', 'b', 'c']);
    });

    it('should throw on first error', async () => {
      const tasks = [
        async () => 'success',
        async () => { throw new Error('first error'); },
        async () => { throw new Error('second error'); },
      ];

      await expect(parallelLimitStrict(tasks, 3)).rejects.toThrow('first error');
    });

    it('should handle empty array', async () => {
      const results = await parallelLimitStrict([], 3);
      expect(results).toEqual([]);
    });
  });

  describe('parallelLimitWithProgress', () => {
    it('should call progress callback for each completed task', async () => {
      const progressCalls: Array<{ completed: number; total: number }> = [];
      const tasks = [
        async () => 'a',
        async () => 'b',
        async () => 'c',
      ];

      await parallelLimitWithProgress(tasks, 2, (completed, total) => {
        progressCalls.push({ completed, total });
      });

      expect(progressCalls).toHaveLength(3);
      expect(progressCalls.map(p => p.total)).toEqual([3, 3, 3]);
      // Completed count should be 1, 2, 3 (in some order due to parallelism)
      expect(progressCalls.map(p => p.completed).sort()).toEqual([1, 2, 3]);
    });

    it('should pass result to progress callback', async () => {
      const progressResults: ParallelResult<string>[] = [];
      const tasks = [
        async () => 'a',
        async () => { throw new Error('fail'); },
      ];

      await parallelLimitWithProgress(tasks, 2, (_completed, _total, result) => {
        progressResults.push(result);
      });

      expect(progressResults).toHaveLength(2);
      const fulfilled = progressResults.find(r => r.status === 'fulfilled');
      const rejected = progressResults.find(r => r.status === 'rejected');
      expect(fulfilled?.value).toBe('a');
      expect(rejected?.reason?.message).toBe('fail');
    });

    it('should work without progress callback', async () => {
      const tasks = [async () => 'a', async () => 'b'];
      const results = await parallelLimitWithProgress(tasks, 2);

      expect(results).toHaveLength(2);
      expect(results[0].value).toBe('a');
      expect(results[1].value).toBe('b');
    });
  });
});
