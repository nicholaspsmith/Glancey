/**
 * Tool handlers for search operations.
 */

import type { CodeChunk } from '../search/indexer.js';
import type { ToolContext, ToolResponse } from './types.js';
import { createToolResponse } from './types.js';
import { isString, isNumber, isStringArray } from '../utils/type-guards.js';
import { LanceContextError } from '../utils/errors.js';

/**
 * Arguments for search_code tool.
 */
export interface SearchCodeArgs {
  query: string;
  limit?: number;
  pathPattern?: string;
  languages?: string[];
}

/**
 * Parse and validate search_code arguments.
 */
export function parseSearchCodeArgs(args: Record<string, unknown> | undefined): SearchCodeArgs {
  const query = isString(args?.query) ? args.query : '';
  if (!query) {
    throw new LanceContextError('query is required', 'validation', { tool: 'search_code' });
  }

  return {
    query,
    limit: isNumber(args?.limit) ? args.limit : 10,
    pathPattern: isString(args?.pathPattern) ? args.pathPattern : undefined,
    languages: isStringArray(args?.languages) ? args.languages : undefined,
  };
}

/**
 * Format search results for display.
 */
export function formatSearchResults(results: CodeChunk[]): string {
  if (results.length === 0) {
    return 'No results found.';
  }

  return results
    .map((r, i) => {
      let header = `## Result ${i + 1}: ${r.filepath}:${r.startLine}-${r.endLine}`;
      if (r.symbolName) {
        const typeLabel = r.symbolType ? ` (${r.symbolType})` : '';
        header += `\n**Symbol:** \`${r.symbolName}\`${typeLabel}`;
      }
      return `${header}\n\`\`\`${r.language}\n${r.content}\n\`\`\``;
    })
    .join('\n\n');
}

/**
 * Handle search_code tool.
 */
export async function handleSearchCode(
  args: SearchCodeArgs,
  context: ToolContext
): Promise<ToolResponse> {
  const results = await context.indexer.search({
    query: args.query,
    limit: args.limit,
    pathPattern: args.pathPattern,
    languages: args.languages,
  });

  const formatted = formatSearchResults(results);
  return createToolResponse(formatted, context.toolGuidance);
}

/**
 * Arguments for search_similar tool.
 */
export interface SearchSimilarArgs {
  code?: string;
  filepath?: string;
  startLine?: number;
  endLine?: number;
  limit?: number;
  threshold?: number;
  excludeSelf?: boolean;
}

/**
 * Parse and validate search_similar arguments.
 */
export function parseSearchSimilarArgs(
  args: Record<string, unknown> | undefined
): SearchSimilarArgs {
  const code = isString(args?.code) ? args.code : undefined;
  const filepath = isString(args?.filepath) ? args.filepath : undefined;

  if (!code && !filepath) {
    throw new LanceContextError('Either code or filepath must be provided', 'validation', {
      tool: 'search_similar',
    });
  }

  return {
    code,
    filepath,
    startLine: isNumber(args?.startLine) ? args.startLine : undefined,
    endLine: isNumber(args?.endLine) ? args.endLine : undefined,
    limit: isNumber(args?.limit) ? args.limit : 10,
    threshold: isNumber(args?.threshold) ? args.threshold : undefined,
    excludeSelf: args?.excludeSelf !== false, // Default to true
  };
}

/**
 * Handle search_similar tool.
 */
export async function handleSearchSimilar(
  args: SearchSimilarArgs,
  context: ToolContext
): Promise<ToolResponse> {
  const results = await context.indexer.searchSimilar({
    code: args.code,
    filepath: args.filepath,
    startLine: args.startLine,
    endLine: args.endLine,
    limit: args.limit,
    threshold: args.threshold,
    excludeSelf: args.excludeSelf,
  });

  const formatted = formatSearchResults(results);
  return createToolResponse(formatted, context.toolGuidance);
}
