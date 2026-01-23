import { describe, it, expect } from 'vitest';
import {
  kMeansClustering,
  cosineSimilarity,
  euclideanDistance,
  assignToCluster,
  calculateSilhouetteScore,
  type ChunkForClustering,
  type ConceptCluster,
} from '../../search/clustering.js';

describe('clustering', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const v = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [0, 1, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const v1 = [1, 0, 0];
      const v2 = [-1, 0, 0];
      expect(cosineSimilarity(v1, v2)).toBeCloseTo(-1, 5);
    });

    it('should throw for vectors of different lengths', () => {
      expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow('Vectors must have same length');
    });

    it('should handle zero vectors', () => {
      const v1 = [0, 0, 0];
      const v2 = [1, 2, 3];
      expect(cosineSimilarity(v1, v2)).toBe(0);
    });
  });

  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const v = [1, 2, 3, 4, 5];
      expect(euclideanDistance(v, v)).toBe(0);
    });

    it('should calculate correct distance', () => {
      const v1 = [0, 0];
      const v2 = [3, 4];
      expect(euclideanDistance(v1, v2)).toBe(5); // 3-4-5 triangle
    });

    it('should throw for vectors of different lengths', () => {
      expect(() => euclideanDistance([1, 2], [1, 2, 3])).toThrow('Vectors must have same length');
    });
  });

  describe('kMeansClustering', () => {
    it('should return empty result for empty input', () => {
      const result = kMeansClustering([]);
      expect(result.clusterCount).toBe(0);
      expect(result.clusters).toHaveLength(0);
      expect(result.assignments.size).toBe(0);
    });

    it('should create single cluster for single chunk', () => {
      const chunks: ChunkForClustering[] = [
        {
          id: 'test.ts:1-10',
          content: 'function test() {}',
          filepath: 'test.ts',
          embedding: [1, 0, 0],
        },
      ];

      const result = kMeansClustering(chunks);
      expect(result.clusterCount).toBe(1);
      expect(result.assignments.get('test.ts:1-10')).toBe(0);
    });

    it('should cluster similar vectors together', () => {
      // Create two groups of clearly separated vectors
      const chunks: ChunkForClustering[] = [
        // Group 1: vectors near [1, 0, 0]
        { id: 'a1', content: 'a1', filepath: 'a.ts', embedding: [1, 0.1, 0] },
        { id: 'a2', content: 'a2', filepath: 'a.ts', embedding: [0.9, 0.1, 0.1] },
        { id: 'a3', content: 'a3', filepath: 'a.ts', embedding: [1, 0, 0.1] },
        // Group 2: vectors near [0, 1, 0]
        { id: 'b1', content: 'b1', filepath: 'b.ts', embedding: [0, 1, 0.1] },
        { id: 'b2', content: 'b2', filepath: 'b.ts', embedding: [0.1, 0.9, 0] },
        { id: 'b3', content: 'b3', filepath: 'b.ts', embedding: [0.1, 1, 0.1] },
      ];

      const result = kMeansClustering(chunks, { numClusters: 2 });

      expect(result.clusterCount).toBe(2);
      expect(result.clusters.length).toBe(2);

      // Check that each group is in the same cluster
      const clusterA1 = result.assignments.get('a1');
      const clusterA2 = result.assignments.get('a2');
      const clusterA3 = result.assignments.get('a3');
      expect(clusterA1).toBe(clusterA2);
      expect(clusterA2).toBe(clusterA3);

      const clusterB1 = result.assignments.get('b1');
      const clusterB2 = result.assignments.get('b2');
      const clusterB3 = result.assignments.get('b3');
      expect(clusterB1).toBe(clusterB2);
      expect(clusterB2).toBe(clusterB3);

      // Different groups should be in different clusters
      expect(clusterA1).not.toBe(clusterB1);
    });

    it('should respect numClusters option', () => {
      const chunks: ChunkForClustering[] = Array(20)
        .fill(null)
        .map((_, i) => ({
          id: `chunk${i}`,
          content: `content ${i}`,
          filepath: `file${i}.ts`,
          embedding: Array(10)
            .fill(0)
            .map(() => Math.random()),
        }));

      const result = kMeansClustering(chunks, { numClusters: 5 });
      expect(result.clusterCount).toBeLessThanOrEqual(5);
    });

    it('should generate labels from symbol types', () => {
      const chunks: ChunkForClustering[] = [
        {
          id: 'a',
          content: 'fn',
          filepath: 'src/utils/helper.ts',
          embedding: [1, 0],
          symbolType: 'function',
        },
        {
          id: 'b',
          content: 'fn',
          filepath: 'src/utils/util.ts',
          embedding: [0.9, 0.1],
          symbolType: 'function',
        },
        {
          id: 'c',
          content: 'fn',
          filepath: 'src/utils/tools.ts',
          embedding: [1, 0.1],
          symbolType: 'function',
        },
      ];

      const result = kMeansClustering(chunks, { numClusters: 1 });

      expect(result.clusters[0].label).toContain('utils');
    });

    it('should extract keywords from content', () => {
      const chunks: ChunkForClustering[] = [
        {
          id: 'a',
          content: 'function authenticate(user: User) { return validateUser(user); }',
          filepath: 'auth.ts',
          embedding: [1, 0, 0],
          symbolName: 'authenticate',
        },
      ];

      const result = kMeansClustering(chunks, { numClusters: 1 });
      expect(result.clusters[0].keywords.length).toBeGreaterThan(0);
    });

    it('should store representative chunks', () => {
      const chunks: ChunkForClustering[] = Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `chunk${i}`,
          content: `content ${i}`,
          filepath: `file${i}.ts`,
          embedding: [1, i * 0.01, 0],
        }));

      const result = kMeansClustering(chunks, { numClusters: 1, numRepresentatives: 3 });
      expect(result.clusters[0].representativeChunks.length).toBe(3);
    });
  });

  describe('assignToCluster', () => {
    it('should assign embedding to nearest cluster', () => {
      const clusters: ConceptCluster[] = [
        {
          id: 0,
          label: 'Cluster A',
          size: 5,
          representativeChunks: [],
          centroid: [1, 0, 0],
          keywords: [],
        },
        {
          id: 1,
          label: 'Cluster B',
          size: 5,
          representativeChunks: [],
          centroid: [0, 1, 0],
          keywords: [],
        },
      ];

      // Embedding closer to cluster A
      expect(assignToCluster([0.9, 0.1, 0], clusters)).toBe(0);
      // Embedding closer to cluster B
      expect(assignToCluster([0.1, 0.9, 0], clusters)).toBe(1);
    });
  });

  describe('calculateSilhouetteScore', () => {
    it('should return 0 for single cluster', () => {
      const chunks: ChunkForClustering[] = [
        { id: 'a', content: '', filepath: '', embedding: [1, 0, 0] },
        { id: 'b', content: '', filepath: '', embedding: [0.9, 0.1, 0] },
      ];
      const assignments = new Map([
        ['a', 0],
        ['b', 0],
      ]);
      const clusters: ConceptCluster[] = [
        {
          id: 0,
          label: '',
          size: 2,
          representativeChunks: [],
          centroid: [0.95, 0.05, 0],
          keywords: [],
        },
      ];

      const score = calculateSilhouetteScore(chunks, assignments, clusters);
      expect(score).toBe(0);
    });

    it('should return higher score for well-separated clusters', () => {
      // Create two well-separated clusters
      const chunks: ChunkForClustering[] = [
        { id: 'a1', content: '', filepath: '', embedding: [1, 0, 0] },
        { id: 'a2', content: '', filepath: '', embedding: [0.99, 0.01, 0] },
        { id: 'b1', content: '', filepath: '', embedding: [0, 1, 0] },
        { id: 'b2', content: '', filepath: '', embedding: [0.01, 0.99, 0] },
      ];
      const assignments = new Map([
        ['a1', 0],
        ['a2', 0],
        ['b1', 1],
        ['b2', 1],
      ]);
      const clusters: ConceptCluster[] = [
        { id: 0, label: '', size: 2, representativeChunks: [], centroid: [1, 0, 0], keywords: [] },
        { id: 1, label: '', size: 2, representativeChunks: [], centroid: [0, 1, 0], keywords: [] },
      ];

      const score = calculateSilhouetteScore(chunks, assignments, clusters);
      expect(score).toBeGreaterThan(0.5);
    });
  });
});
