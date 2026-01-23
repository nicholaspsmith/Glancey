import { describe, it, expect } from 'vitest';
import { chunkArray } from '../../embeddings/types.js';

describe('chunkArray', () => {
  it('should return empty array for empty input', () => {
    expect(chunkArray([], 10)).toEqual([]);
  });

  it('should return single chunk when array is smaller than chunk size', () => {
    expect(chunkArray([1, 2, 3], 10)).toEqual([[1, 2, 3]]);
  });

  it('should split array into even chunks', () => {
    expect(chunkArray([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('should handle uneven splits with remainder in last chunk', () => {
    expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('should create individual chunks when chunk size is 1', () => {
    expect(chunkArray([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
  });

  it('should work with strings', () => {
    expect(chunkArray(['a', 'b', 'c', 'd'], 3)).toEqual([['a', 'b', 'c'], ['d']]);
  });

  it('should work with objects', () => {
    const arr = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const result = chunkArray(arr, 2);
    expect(result).toEqual([[{ id: 1 }, { id: 2 }], [{ id: 3 }]]);
  });
});
