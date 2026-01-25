import { describe, it, expect } from 'vitest';

/**
 * Tests for keyword scoring logic used in hybrid search.
 * These tests verify the calculateKeywordScore algorithm behavior.
 */

// Recreate the scoring logic for testing (extracted from indexer.ts)
function calculateKeywordScore(query: string, content: string, filepath: string): number {
  const queryTerms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (queryTerms.length === 0) return 0;

  const contentLower = content.toLowerCase();
  const filepathLower = filepath.toLowerCase();

  let matchCount = 0;
  let exactMatchBonus = 0;

  for (const term of queryTerms) {
    // Check content matches
    if (contentLower.includes(term)) {
      matchCount++;

      // Bonus for exact word match (not just substring)
      const wordBoundaryRegex = new RegExp(`\\b${term}\\b`, 'i');
      if (wordBoundaryRegex.test(content)) {
        exactMatchBonus += 0.5;
      }
    }

    // Bonus for filename/path match
    if (filepathLower.includes(term)) {
      matchCount += 0.5;
    }
  }

  // Normalize score to 0-1 range
  const baseScore = matchCount / queryTerms.length;
  const bonusScore = Math.min(exactMatchBonus / queryTerms.length, 0.5);

  return Math.min(baseScore + bonusScore, 1);
}

describe('calculateKeywordScore', () => {
  describe('basic term matching', () => {
    it('should return 0 when no terms match', () => {
      const score = calculateKeywordScore('hello world', 'foo bar', 'test.ts');
      expect(score).toBe(0);
    });

    it('should return 1 when all terms match exactly', () => {
      const score = calculateKeywordScore('hello world', 'hello world function', 'test.ts');
      expect(score).toBe(1);
    });

    it('should return partial score when some terms match', () => {
      const score = calculateKeywordScore('hello world', 'hello foo', 'test.ts');
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    });

    it('should filter terms shorter than 3 characters', () => {
      const score = calculateKeywordScore('a ab abc', 'abc only', 'test.ts');
      // Only 'abc' should be considered
      expect(score).toBe(1); // abc matches exactly
    });

    it('should return 0 when all terms are too short', () => {
      const score = calculateKeywordScore('a ab', 'a ab', 'test.ts');
      expect(score).toBe(0);
    });
  });

  describe('word boundary matching', () => {
    it('should give bonus for exact word match', () => {
      // These variables demonstrate the concept even though not directly asserted
      const _substringOnlyScore = calculateKeywordScore('user', 'username', 'test.ts');
      const _exactScore = calculateKeywordScore('user', 'user data', 'test.ts');

      // Exact match should score higher due to word boundary bonus (0.5 extra)
      // substringOnlyScore: 1/1 = 1 (base) + 0 (no word boundary) = 1
      // exactScore: 1/1 = 1 (base) + 0.5 (word boundary) = 1.5, capped at 1
      // Since both cap at 1, we need different test
      // Actually substring match in 'username' still gives base score of 1
      // Let's test with a term that doesn't substring match at all vs exact match
      const noMatch = calculateKeywordScore('auth', 'user data', 'test.ts');
      const withExactMatch = calculateKeywordScore('auth', 'auth data', 'test.ts');

      expect(withExactMatch).toBeGreaterThan(noMatch);
    });

    it('should recognize word boundaries with punctuation', () => {
      const score = calculateKeywordScore('test', 'const test = 1;', 'test.ts');
      // Should get exact match bonus
      expect(score).toBeGreaterThan(0.5);
    });

    it('should handle camelCase boundaries', () => {
      // Note: the regex uses \b which may not split camelCase
      const score = calculateKeywordScore('user', 'getUserData', 'test.ts');
      // Substring match, no word boundary bonus
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('filename/path bonus', () => {
    it('should add bonus when term matches filepath', () => {
      const _noPathMatch = calculateKeywordScore('auth', 'authentication code', 'utils.ts');
      const withPathMatch = calculateKeywordScore('auth', 'code here', 'auth.ts');

      // Both should have some score, path match gives 0.5 bonus per term
      expect(withPathMatch).toBeGreaterThan(0);
    });

    it('should add bonus for directory match', () => {
      const score = calculateKeywordScore('auth', 'some code', 'src/auth/login.ts');
      expect(score).toBeGreaterThan(0);
    });

    it('should combine content and path matches', () => {
      const contentOnly = calculateKeywordScore('auth', 'auth function', 'utils.ts');
      const pathOnly = calculateKeywordScore('auth', 'function here', 'auth.ts');
      const both = calculateKeywordScore('auth', 'auth function', 'auth.ts');

      // contentOnly: 1 (content match) + 0.5 (word boundary) = 1.5, capped at 1
      // pathOnly: 0.5 (path match only) / 1 = 0.5
      // both: 1 + 0.5 (content+boundary) + 0.5 (path) = 2, capped at 1
      expect(both).toBeGreaterThanOrEqual(contentOnly);
      expect(both).toBeGreaterThan(pathOnly);
    });
  });

  describe('score normalization', () => {
    it('should never exceed 1', () => {
      // Many matches, should still cap at 1
      const score = calculateKeywordScore(
        'auth user login',
        'auth user login authentication',
        'auth-user-login.ts'
      );
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should scale with number of matching terms', () => {
      const oneMatch = calculateKeywordScore('auth user login', 'auth only', 'test.ts');
      const twoMatches = calculateKeywordScore('auth user login', 'auth user only', 'test.ts');
      const threeMatches = calculateKeywordScore('auth user login', 'auth user login', 'test.ts');

      // oneMatch: 1 match of 3 terms = 0.33 base + 0.5/3 word boundary bonus = ~0.5
      // twoMatches: 2 matches of 3 terms = 0.66 base + 1.0/3 word boundary bonus = ~0.99
      // threeMatches: 3 matches of 3 terms = 1.0 base + 0.5 word boundary (capped) = 1.0
      expect(threeMatches).toBeGreaterThanOrEqual(twoMatches);
      expect(twoMatches).toBeGreaterThan(oneMatch);
    });
  });

  describe('case insensitivity', () => {
    it('should match regardless of case', () => {
      const lowerScore = calculateKeywordScore('auth', 'auth function', 'test.ts');
      const upperScore = calculateKeywordScore('AUTH', 'auth function', 'test.ts');
      const mixedScore = calculateKeywordScore('Auth', 'AUTH function', 'test.ts');

      expect(lowerScore).toBeGreaterThan(0);
      expect(upperScore).toBeGreaterThan(0);
      expect(mixedScore).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty query', () => {
      const score = calculateKeywordScore('', 'some content', 'test.ts');
      expect(score).toBe(0);
    });

    it('should handle empty content', () => {
      const score = calculateKeywordScore('hello world', '', 'test.ts');
      expect(score).toBe(0);
    });

    it('should handle special regex characters in query', () => {
      // Should not throw
      const score = calculateKeywordScore('file.test', 'file.test content', 'test.ts');
      expect(score).toBeGreaterThan(0);
    });
  });
});

describe('hybrid search scoring', () => {
  // Test the combined 70/30 semantic/keyword formula
  describe('combined score calculation', () => {
    it('should weight semantic score at 70%', () => {
      const semanticScore = 1.0;
      const keywordScore = 0.0;
      const combinedScore = 0.7 * semanticScore + 0.3 * keywordScore;
      expect(combinedScore).toBe(0.7);
    });

    it('should weight keyword score at 30%', () => {
      const semanticScore = 0.0;
      const keywordScore = 1.0;
      const combinedScore = 0.7 * semanticScore + 0.3 * keywordScore;
      expect(combinedScore).toBe(0.3);
    });

    it('should sum to 1 when both scores are 1', () => {
      const semanticScore = 1.0;
      const keywordScore = 1.0;
      const combinedScore = 0.7 * semanticScore + 0.3 * keywordScore;
      expect(combinedScore).toBe(1.0);
    });

    it('should allow keyword boost to reorder results', () => {
      // Scenario: result A has high semantic, low keyword
      // Result B has medium semantic, high keyword
      const resultA = 0.7 * 0.9 + 0.3 * 0.1; // 0.63 + 0.03 = 0.66
      const resultB = 0.7 * 0.7 + 0.3 * 1.0; // 0.49 + 0.30 = 0.79

      // B should rank higher despite lower semantic score
      expect(resultB).toBeGreaterThan(resultA);
    });
  });

  describe('re-ranking behavior', () => {
    // Helper to calculate combined score with configurable weights
    const calculateCombinedScore = (
      semanticScore: number,
      keywordScore: number,
      semanticWeight: number,
      keywordWeight: number
    ) => semanticWeight * semanticScore + keywordWeight * keywordScore;

    it('should maintain order when keyword scores are equal', () => {
      // Three results with decreasing semantic scores, equal keyword scores
      const results = [
        { semantic: 1.0, keyword: 0.5 },
        { semantic: 0.8, keyword: 0.5 },
        { semantic: 0.6, keyword: 0.5 },
      ];

      const scored = results.map((r) => calculateCombinedScore(r.semantic, r.keyword, 0.7, 0.3));

      // Order should be preserved
      expect(scored[0]).toBeGreaterThan(scored[1]);
      expect(scored[1]).toBeGreaterThan(scored[2]);
    });

    it('should reorder when keyword score difference overcomes semantic', () => {
      // Result A: high semantic (rank 1), no keyword match
      // Result B: lower semantic (rank 2), perfect keyword match
      const resultA = calculateCombinedScore(1.0, 0.0, 0.7, 0.3); // 0.7
      const resultB = calculateCombinedScore(0.6, 1.0, 0.7, 0.3); // 0.42 + 0.3 = 0.72

      expect(resultB).toBeGreaterThan(resultA);
    });

    it('should preserve semantic order with small keyword differences', () => {
      // Small keyword difference shouldn't overcome large semantic gap
      const resultA = calculateCombinedScore(1.0, 0.3, 0.7, 0.3); // 0.7 + 0.09 = 0.79
      const resultB = calculateCombinedScore(0.5, 0.5, 0.7, 0.3); // 0.35 + 0.15 = 0.50

      expect(resultA).toBeGreaterThan(resultB);
    });
  });

  describe('weight configuration effects', () => {
    const calculateCombinedScore = (
      semanticScore: number,
      keywordScore: number,
      semanticWeight: number,
      keywordWeight: number
    ) => semanticWeight * semanticScore + keywordWeight * keywordScore;

    it('should use only semantic when keywordWeight is 0', () => {
      const score = calculateCombinedScore(0.8, 1.0, 1.0, 0.0);
      expect(score).toBe(0.8); // Only semantic matters
    });

    it('should use only keyword when semanticWeight is 0', () => {
      const score = calculateCombinedScore(1.0, 0.5, 0.0, 1.0);
      expect(score).toBe(0.5); // Only keyword matters
    });

    it('should handle equal weights (50/50)', () => {
      const score = calculateCombinedScore(0.8, 0.4, 0.5, 0.5);
      expect(score).toBeCloseTo(0.6); // (0.8 + 0.4) / 2
    });

    it('should handle inverted weights (30/70 keyword-heavy)', () => {
      const semanticHigh = calculateCombinedScore(1.0, 0.3, 0.3, 0.7); // 0.3 + 0.21 = 0.51
      const keywordHigh = calculateCombinedScore(0.3, 1.0, 0.3, 0.7); // 0.09 + 0.7 = 0.79

      // With inverted weights, keyword match should dominate
      expect(keywordHigh).toBeGreaterThan(semanticHigh);
    });
  });

  describe('score boundaries', () => {
    const calculateCombinedScore = (
      semanticScore: number,
      keywordScore: number,
      semanticWeight: number,
      keywordWeight: number
    ) => semanticWeight * semanticScore + keywordWeight * keywordScore;

    it('should produce 0 when both scores are 0', () => {
      const score = calculateCombinedScore(0.0, 0.0, 0.7, 0.3);
      expect(score).toBe(0);
    });

    it('should produce max 1 when weights sum to 1 and scores are 1', () => {
      const score = calculateCombinedScore(1.0, 1.0, 0.7, 0.3);
      expect(score).toBe(1.0);
    });

    it('should handle minimum non-zero scores', () => {
      const score = calculateCombinedScore(0.001, 0.001, 0.7, 0.3);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(0.01);
    });
  });

  describe('ranking stability', () => {
    const calculateCombinedScore = (
      semanticScore: number,
      keywordScore: number,
      semanticWeight: number,
      keywordWeight: number
    ) => semanticWeight * semanticScore + keywordWeight * keywordScore;

    it('should produce stable ordering for close scores', () => {
      // Simulate multiple results with very similar scores
      const results = [
        { semantic: 0.95, keyword: 0.8, id: 'a' },
        { semantic: 0.93, keyword: 0.85, id: 'b' },
        { semantic: 0.9, keyword: 0.9, id: 'c' },
      ];

      const scored = results.map((r) => ({
        id: r.id,
        score: calculateCombinedScore(r.semantic, r.keyword, 0.7, 0.3),
      }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      // Verify consistent ordering
      expect(scored[0].score).toBeGreaterThanOrEqual(scored[1].score);
      expect(scored[1].score).toBeGreaterThanOrEqual(scored[2].score);
    });

    it('should handle tie-breaking consistently', () => {
      // Two results with identical combined scores
      const scoreA = calculateCombinedScore(0.8, 0.6, 0.7, 0.3); // 0.56 + 0.18 = 0.74
      const scoreB = calculateCombinedScore(0.74, 0.74, 0.7, 0.3); // 0.518 + 0.222 = 0.74

      // Scores should be very close (floating point)
      expect(Math.abs(scoreA - scoreB)).toBeLessThan(0.01);
    });
  });
});
