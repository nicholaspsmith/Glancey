import { describe, it, expect } from 'vitest';
import { mapWithConcurrency, mapInBatches } from '../../utils/concurrency.js';

describe('mapWithConcurrency', () => {
  it('should process all items and return results in order', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapWithConcurrency(items, async (item) => item * 2, 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('should limit concurrent operations', async () => {
    let runningCount = 0;
    let maxRunning = 0;

    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    await mapWithConcurrency(
      items,
      async (item) => {
        runningCount++;
        maxRunning = Math.max(maxRunning, runningCount);
        await new Promise((resolve) => setTimeout(resolve, 10));
        runningCount--;
        return item;
      },
      3 // concurrency limit
    );

    expect(maxRunning).toBeLessThanOrEqual(3);
  });

  it('should handle empty array', async () => {
    const results = await mapWithConcurrency([], async (x) => x, 5);
    expect(results).toEqual([]);
  });

  it('should handle single item', async () => {
    const results = await mapWithConcurrency([42], async (x) => x * 2, 5);
    expect(results).toEqual([84]);
  });

  it('should pass index to callback', async () => {
    const items = ['a', 'b', 'c'];
    const results = await mapWithConcurrency(items, async (item, index) => `${item}${index}`, 2);
    expect(results).toEqual(['a0', 'b1', 'c2']);
  });
});

describe('mapInBatches', () => {
  it('should process all items in batches', async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await mapInBatches(items, async (item) => item * 2, 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it('should call onBatchComplete after each batch', async () => {
    const items = [1, 2, 3, 4, 5];
    const completedCounts: number[] = [];

    await mapInBatches(
      items,
      async (item) => item,
      2,
      (completed, total) => {
        completedCounts.push(completed);
        expect(total).toBe(5);
      }
    );

    expect(completedCounts).toEqual([2, 4, 5]);
  });

  it('should handle batch size larger than items', async () => {
    const items = [1, 2, 3];
    const results = await mapInBatches(items, async (item) => item * 2, 10);
    expect(results).toEqual([2, 4, 6]);
  });

  it('should handle empty array', async () => {
    const results = await mapInBatches([], async (x) => x, 5);
    expect(results).toEqual([]);
  });

  it('should pass correct index to callback', async () => {
    const items = ['a', 'b', 'c', 'd'];
    const results = await mapInBatches(items, async (item, index) => `${item}${index}`, 2);
    expect(results).toEqual(['a0', 'b1', 'c2', 'd3']);
  });

  it('should process batches sequentially', async () => {
    const processOrder: number[] = [];
    const items = [1, 2, 3, 4];

    await mapInBatches(
      items,
      async (item) => {
        processOrder.push(item);
        await new Promise((resolve) => setTimeout(resolve, 5));
        return item;
      },
      2
    );

    // First batch (1, 2) completes before second batch (3, 4) starts
    // Within each batch, order may vary due to Promise.all
    // But we should see items 1,2 before 3,4
    const firstBatchItems = processOrder.slice(0, 2).sort();
    const secondBatchItems = processOrder.slice(2, 4).sort();
    expect(firstBatchItems).toEqual([1, 2]);
    expect(secondBatchItems).toEqual([3, 4]);
  });
});
