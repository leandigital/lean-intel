/**
 * Concurrency utilities for parallel execution with limits
 */

export interface ParallelResult<T> {
  status: 'fulfilled' | 'rejected';
  value?: T;
  reason?: Error;
  index: number;
}

/**
 * Execute tasks in parallel with a concurrency limit
 *
 * @param tasks - Array of async task functions to execute
 * @param limit - Maximum number of concurrent tasks (default: 3)
 * @returns Array of results in the same order as input tasks
 *
 * @example
 * const tasks = files.map(file => async () => processFile(file));
 * const results = await parallelLimit(tasks, 3);
 */
export async function parallelLimit<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<ParallelResult<T>[]> {
  const results: ParallelResult<T>[] = new Array(tasks.length);
  let currentIndex = 0;
  let completedCount = 0;

  // Ensure limit is at least 1
  const effectiveLimit = Math.max(1, Math.min(limit, tasks.length));

  return new Promise((resolve) => {
    // If no tasks, resolve immediately
    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const executeNext = async (): Promise<void> => {
      while (currentIndex < tasks.length) {
        const taskIndex = currentIndex++;
        const task = tasks[taskIndex];

        try {
          const value = await task();
          results[taskIndex] = {
            status: 'fulfilled',
            value,
            index: taskIndex,
          };
        } catch (error) {
          results[taskIndex] = {
            status: 'rejected',
            reason: error instanceof Error ? error : new Error(String(error)),
            index: taskIndex,
          };
        }

        completedCount++;

        // Check if all tasks are done
        if (completedCount === tasks.length) {
          resolve(results);
          return;
        }
      }
    };

    // Start workers up to the limit
    const workers: Promise<void>[] = [];
    for (let i = 0; i < effectiveLimit; i++) {
      workers.push(executeNext());
    }
  });
}

/**
 * Execute tasks in parallel with a concurrency limit, throwing on first error
 *
 * @param tasks - Array of async task functions to execute
 * @param limit - Maximum number of concurrent tasks (default: 3)
 * @returns Array of successful results in the same order as input tasks
 * @throws First error encountered during execution
 */
export async function parallelLimitStrict<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3
): Promise<T[]> {
  const results = await parallelLimit(tasks, limit);

  // Check for any failures and throw the first one
  for (const result of results) {
    if (result.status === 'rejected') {
      throw result.reason;
    }
  }

  return results.map((r) => r.value as T);
}

/**
 * Execute tasks in parallel with a concurrency limit and progress callback
 *
 * @param tasks - Array of async task functions to execute
 * @param limit - Maximum number of concurrent tasks (default: 3)
 * @param onProgress - Callback fired when each task completes
 * @returns Array of results in the same order as input tasks
 */
export async function parallelLimitWithProgress<T>(
  tasks: (() => Promise<T>)[],
  limit: number = 3,
  onProgress?: (completed: number, total: number, result: ParallelResult<T>) => void
): Promise<ParallelResult<T>[]> {
  const results: ParallelResult<T>[] = new Array(tasks.length);
  let currentIndex = 0;
  let completedCount = 0;

  const effectiveLimit = Math.max(1, Math.min(limit, tasks.length));

  return new Promise((resolve) => {
    if (tasks.length === 0) {
      resolve([]);
      return;
    }

    const executeNext = async (): Promise<void> => {
      while (currentIndex < tasks.length) {
        const taskIndex = currentIndex++;
        const task = tasks[taskIndex];

        let result: ParallelResult<T>;

        try {
          const value = await task();
          result = {
            status: 'fulfilled',
            value,
            index: taskIndex,
          };
        } catch (error) {
          result = {
            status: 'rejected',
            reason: error instanceof Error ? error : new Error(String(error)),
            index: taskIndex,
          };
        }

        results[taskIndex] = result;
        completedCount++;

        // Fire progress callback
        if (onProgress) {
          onProgress(completedCount, tasks.length, result);
        }

        if (completedCount === tasks.length) {
          resolve(results);
          return;
        }
      }
    };

    const workers: Promise<void>[] = [];
    for (let i = 0; i < effectiveLimit; i++) {
      workers.push(executeNext());
    }
  });
}
