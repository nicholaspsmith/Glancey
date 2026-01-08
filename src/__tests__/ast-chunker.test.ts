import { describe, it, expect } from 'vitest';
import { ASTChunker } from '../search/ast-chunker.js';

describe('ASTChunker', () => {
  describe('canParse', () => {
    it('should return true for TypeScript files', () => {
      expect(ASTChunker.canParse('file.ts')).toBe(true);
      expect(ASTChunker.canParse('file.tsx')).toBe(true);
      expect(ASTChunker.canParse('file.mts')).toBe(true);
    });

    it('should return true for JavaScript files', () => {
      expect(ASTChunker.canParse('file.js')).toBe(true);
      expect(ASTChunker.canParse('file.jsx')).toBe(true);
      expect(ASTChunker.canParse('file.mjs')).toBe(true);
      expect(ASTChunker.canParse('file.cjs')).toBe(true);
    });

    it('should return false for non-JS/TS files', () => {
      expect(ASTChunker.canParse('file.py')).toBe(false);
      expect(ASTChunker.canParse('file.go')).toBe(false);
      expect(ASTChunker.canParse('file.rs')).toBe(false);
      expect(ASTChunker.canParse('file.md')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(ASTChunker.canParse('file.TS')).toBe(true);
      expect(ASTChunker.canParse('file.JS')).toBe(true);
    });
  });
});
