/**
 * Pattern search for finding text patterns in the codebase.
 * Supports regex patterns with context lines.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { PatternSearchResult, PatternMatch, SearchPatternOptions } from './types.js';

/**
 * Default extensions for code files
 */
const CODE_FILE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mts',
  '.cts',
  '.mjs',
  '.cjs',
  '.py',
  '.pyi',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.rb',
  '.php',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.swift',
  '.scala',
  '.lua',
  '.r',
  '.R',
  '.sh',
  '.bash',
  '.zsh',
  '.sql',
];

/**
 * Default directories to exclude
 */
const DEFAULT_EXCLUDE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'coverage/**',
  '__pycache__/**',
  '.next/**',
  '.cache/**',
  'vendor/**',
];

/**
 * Maximum default response size in characters
 */
const DEFAULT_MAX_ANSWER_CHARS = 50000;

/**
 * Search for a pattern in the codebase.
 */
export async function searchForPattern(
  projectPath: string,
  options: SearchPatternOptions
): Promise<PatternSearchResult> {
  const {
    substringPattern,
    relativePath = '',
    restrictSearchToCodeFiles = false,
    pathsIncludeGlob,
    pathsExcludeGlob,
    contextLinesBefore = 0,
    contextLinesAfter = 0,
    maxAnswerChars = DEFAULT_MAX_ANSWER_CHARS,
  } = options;

  // Compile the pattern
  let regex: RegExp;
  try {
    regex = new RegExp(substringPattern, 'gm');
  } catch (e) {
    throw new Error(
      `Invalid regex pattern: ${substringPattern}. ${e instanceof Error ? e.message : ''}`
    );
  }

  // Determine the search path
  const searchPath = relativePath ? path.join(projectPath, relativePath) : projectPath;

  // Check if searchPath is a file or directory
  let files: string[];
  try {
    const stat = await fs.stat(searchPath);
    if (stat.isFile()) {
      files = [searchPath];
    } else {
      files = await findFiles(searchPath, {
        codeFilesOnly: restrictSearchToCodeFiles,
        includeGlob: pathsIncludeGlob,
        excludeGlob: pathsExcludeGlob,
      });
    }
  } catch {
    throw new Error(`Path not found: ${relativePath || '.'}`);
  }

  const matches: Record<string, PatternMatch[]> = {};
  let totalMatches = 0;
  let totalChars = 0;

  for (const file of files) {
    if (totalChars >= maxAnswerChars) {
      break;
    }

    try {
      const content = await fs.readFile(file, 'utf-8');
      const lines = content.split('\n');
      const fileMatches: PatternMatch[] = [];

      // Find all matches in the file
      let match: RegExpExecArray | null;
      regex.lastIndex = 0; // Reset regex state

      while ((match = regex.exec(content)) !== null) {
        // Find the line number of the match
        const beforeMatch = content.slice(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;

        // Get context lines
        const startLine = Math.max(0, lineNumber - 1 - contextLinesBefore);
        const endLine = Math.min(lines.length, lineNumber + contextLinesAfter);
        const contextContent = lines.slice(startLine, endLine).join('\n');

        // Calculate match position within line
        const lineStart = beforeMatch.lastIndexOf('\n') + 1;
        const matchStart = match.index - lineStart;

        fileMatches.push({
          line: lineNumber,
          content: contextContent,
          matchStart,
          matchLength: match[0].length,
        });

        totalMatches++;
        totalChars += contextContent.length + 50; // Approximate overhead

        if (totalChars >= maxAnswerChars) {
          break;
        }

        // Prevent infinite loops on zero-length matches
        if (match[0].length === 0) {
          regex.lastIndex++;
        }
      }

      if (fileMatches.length > 0) {
        const relPath = path.relative(projectPath, file);
        matches[relPath] = fileMatches;
      }
    } catch {
      // Skip files that can't be read (binary, etc.)
      continue;
    }
  }

  return {
    matches,
    totalMatches,
  };
}

interface FindFilesOptions {
  codeFilesOnly?: boolean;
  includeGlob?: string;
  excludeGlob?: string;
}

async function findFiles(searchPath: string, options: FindFilesOptions): Promise<string[]> {
  const { codeFilesOnly, includeGlob, excludeGlob } = options;

  // Build glob patterns
  let patterns: string[];
  if (codeFilesOnly) {
    patterns = CODE_FILE_EXTENSIONS.map((ext) => `**/*${ext}`);
  } else if (includeGlob) {
    patterns = [includeGlob];
  } else {
    patterns = ['**/*'];
  }

  // Build exclude patterns
  const excludePatterns = [...DEFAULT_EXCLUDE_PATTERNS];
  if (excludeGlob) {
    excludePatterns.push(excludeGlob);
  }

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await glob(pattern, {
      cwd: searchPath,
      ignore: excludePatterns,
      absolute: true,
      nodir: true,
    });
    files.push(...matches);
  }

  // Apply additional filtering if both includeGlob and excludeGlob are specified
  let filtered = files;
  if (includeGlob && !codeFilesOnly) {
    filtered = filtered.filter((f) => {
      const rel = path.relative(searchPath, f);
      return minimatch(rel, includeGlob);
    });
  }
  if (excludeGlob) {
    filtered = filtered.filter((f) => {
      const rel = path.relative(searchPath, f);
      return !minimatch(rel, excludeGlob);
    });
  }

  // Remove duplicates
  return [...new Set(filtered)];
}

/**
 * Format pattern search results for display.
 */
export function formatPatternSearchResults(result: PatternSearchResult): string {
  if (result.totalMatches === 0) {
    return 'No matches found.';
  }

  const parts: string[] = [];
  parts.push(`Found ${result.totalMatches} match${result.totalMatches === 1 ? '' : 'es'}:\n`);

  for (const [filepath, fileMatches] of Object.entries(result.matches)) {
    parts.push(`\n## ${filepath}\n`);

    for (const match of fileMatches) {
      // Format with line numbers
      const lines = match.content.split('\n');
      const startLine = match.line - Math.floor((lines.length - 1) / 2);

      const formatted = lines
        .map((line, idx) => {
          const lineNum = startLine + idx;
          const isMatchLine = lineNum === match.line;
          const prefix = isMatchLine ? '>' : ' ';
          return `${prefix} ${lineNum.toString().padStart(4)}: ${line}`;
        })
        .join('\n');

      parts.push('```\n' + formatted + '\n```\n');
    }
  }

  return parts.join('');
}
