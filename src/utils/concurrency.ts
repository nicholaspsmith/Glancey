/**
 * Process items in parallel with controlled concurrency.
 * Unlike Promise.all which starts all promises at once, this limits
 * how many are running at any time.
 *
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @param concurrency - Maximum number of concurrent operations (default: 10)
 * @returns Promise resolving to results in the same order as items
 *
 * @example
 * ```typescript
 * const results = await mapWithConcurrency(
 *   files,
 *   async (file) => processFile(file),
 *   10 // max 10 concurrent file operations
 * );
 * ```
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  concurrency: number = 10
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function processNext(): Promise<void> {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  }

  // Start 'concurrency' number of workers
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => processNext());

  await Promise.all(workers);
  return results;
}

/**
 * Process items in batches, where each batch is processed in parallel.
 * Useful when you want to process groups at a time with progress reporting.
 *
 * @param items - Items to process
 * @param fn - Async function to apply to each item
 * @param batchSize - Number of items per batch
 * @param onBatchComplete - Optional callback after each batch completes
 * @returns Promise resolving to results in the same order as items
 */
export async function mapInBatches<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  batchSize: number = 10,
  onBatchComplete?: (completedCount: number, totalCount: number) => void
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchStartIndex = i;
    const batchResults = await Promise.all(
      batch.map((item, idx) => fn(item, batchStartIndex + idx))
    );
    results.push(...batchResults);
    onBatchComplete?.(results.length, items.length);
  }

  return results;
}
