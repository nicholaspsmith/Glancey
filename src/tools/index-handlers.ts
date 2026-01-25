/**
 * Tool handlers for index operations.
 */

import type { IndexProgress } from '../search/indexer.js';
import type { ToolContext, ToolResponse } from './types.js';
import { createToolResponse } from './types.js';
import { isStringArray, isBoolean } from '../utils/type-guards.js';

/**
 * Arguments for index_codebase tool.
 */
export interface IndexCodebaseArgs {
  patterns?: string[];
  excludePatterns?: string[];
  forceReindex?: boolean;
  autoRepair?: boolean;
}

/**
 * Parse and validate index_codebase arguments.
 */
export function parseIndexCodebaseArgs(
  args: Record<string, unknown> | undefined
): IndexCodebaseArgs {
  return {
    patterns: isStringArray(args?.patterns) ? args.patterns : undefined,
    excludePatterns: isStringArray(args?.excludePatterns) ? args.excludePatterns : undefined,
    forceReindex: isBoolean(args?.forceReindex) ? args.forceReindex : false,
    autoRepair: isBoolean(args?.autoRepair) ? args.autoRepair : false,
  };
}

/**
 * Handle index_codebase tool.
 */
export async function handleIndexCodebase(
  args: IndexCodebaseArgs,
  context: ToolContext,
  onProgress?: (progress: IndexProgress) => void
): Promise<ToolResponse> {
  const result = await context.indexer.indexCodebase(
    args.patterns,
    args.excludePatterns,
    args.forceReindex ?? false,
    onProgress,
    args.autoRepair ?? false
  );

  const mode = result.repaired
    ? 'Repaired (corruption detected)'
    : result.incremental
      ? 'Incremental update'
      : 'Full reindex';

  return createToolResponse(
    `${mode}: Indexed ${result.filesIndexed} files, total ${result.chunksCreated} chunks.`,
    context.toolGuidance
  );
}

/**
 * Handle get_index_status tool.
 */
export async function handleGetIndexStatus(context: ToolContext): Promise<ToolResponse> {
  const status = await context.indexer.getStatus();
  let statusText = JSON.stringify(status, null, 2);

  if (status.corrupted) {
    statusText =
      `**WARNING: Index corruption detected!**\n` +
      `Reason: ${status.corruptionReason}\n` +
      `\nTo repair, either:\n` +
      `1. Run \`index_codebase\` with \`autoRepair: true\`\n` +
      `2. Run \`clear_index\` followed by \`index_codebase\`\n\n` +
      statusText;
  }

  return createToolResponse(statusText, context.toolGuidance);
}

/**
 * Handle clear_index tool.
 */
export async function handleClearIndex(context: ToolContext): Promise<ToolResponse> {
  await context.indexer.clearIndex();
  return createToolResponse('Index cleared.', context.toolGuidance);
}
