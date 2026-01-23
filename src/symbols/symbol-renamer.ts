/**
 * Symbol renamer for renaming symbols across the codebase.
 * Uses text-based replacement with reference finding for cross-file renames.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Symbol } from './types.js';
import { SymbolExtractor } from './symbol-extractor.js';
import { ReferenceFinder } from './reference-finder.js';
import { parseNamePath, matchNamePath, getSymbolName } from './name-path.js';

/**
 * Result from a rename operation.
 */
export interface RenameResult {
  /** Whether the rename was successful */
  success: boolean;
  /** Original symbol name */
  originalName: string;
  /** New symbol name */
  newName: string;
  /** Files that were modified */
  modifiedFiles: RenameFileResult[];
  /** Total number of replacements made */
  totalReplacements: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Result for a single file in a rename operation.
 */
export interface RenameFileResult {
  /** Relative path to the file */
  filepath: string;
  /** Number of replacements made in this file */
  replacements: number;
}

/**
 * Options for rename_symbol.
 */
export interface RenameSymbolOptions {
  /** Name path of the symbol to rename */
  namePath: string;
  /** Relative path to the file containing the symbol definition */
  relativePath: string;
  /** The new name for the symbol */
  newName: string;
  /** Whether to perform a dry run (preview without making changes) */
  dryRun?: boolean;
}

/**
 * Symbol renamer for cross-file symbol renaming.
 */
export class SymbolRenamer {
  private projectPath: string;
  private symbolExtractor: SymbolExtractor;
  private referenceFinder: ReferenceFinder;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.symbolExtractor = new SymbolExtractor(projectPath);
    this.referenceFinder = new ReferenceFinder(projectPath);
  }

  /**
   * Rename a symbol across the codebase.
   */
  async renameSymbol(options: RenameSymbolOptions): Promise<RenameResult> {
    const { namePath, relativePath, newName, dryRun = false } = options;

    try {
      // Validate new name
      if (!this.isValidIdentifier(newName)) {
        return {
          success: false,
          originalName: getSymbolName(namePath),
          newName,
          modifiedFiles: [],
          totalReplacements: 0,
          error: `Invalid identifier: ${newName}`,
        };
      }

      // Find the target symbol
      const symbols = await this.symbolExtractor.extractSymbols(relativePath, false);
      const pattern = parseNamePath(namePath);
      const targetSymbol = this.findSymbolByPattern(symbols, pattern);

      if (!targetSymbol) {
        return {
          success: false,
          originalName: getSymbolName(namePath),
          newName,
          modifiedFiles: [],
          totalReplacements: 0,
          error: `Symbol not found: ${namePath} in ${relativePath}`,
        };
      }

      const originalName = targetSymbol.name;

      // Find all references to this symbol
      const references = await this.referenceFinder.findReferences({
        namePath,
        relativePath,
        includeInfo: false,
      });

      // Group replacements by file
      const replacementsByFile = new Map<string, Set<number>>();

      // Helper to get or create set for a file
      const getFileSet = (file: string): Set<number> => {
        let set = replacementsByFile.get(file);
        if (!set) {
          set = new Set();
          replacementsByFile.set(file, set);
        }
        return set;
      };

      // Add the definition location
      getFileSet(relativePath).add(targetSymbol.location.startLine);

      // Add all reference locations
      for (const ref of references) {
        const file = ref.referencingSymbol.location.filepath;
        getFileSet(file).add(ref.line);
      }

      const modifiedFiles: RenameFileResult[] = [];
      let totalReplacements = 0;

      // Perform replacements
      for (const [file, lines] of replacementsByFile) {
        const result = await this.replaceInFile(file, originalName, newName, lines, dryRun);
        if (result.replacements > 0) {
          modifiedFiles.push({
            filepath: file,
            replacements: result.replacements,
          });
          totalReplacements += result.replacements;
        }
      }

      return {
        success: true,
        originalName,
        newName,
        modifiedFiles,
        totalReplacements,
      };
    } catch (error) {
      return {
        success: false,
        originalName: getSymbolName(namePath),
        newName,
        modifiedFiles: [],
        totalReplacements: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check if a string is a valid identifier.
   */
  private isValidIdentifier(name: string): boolean {
    // Basic identifier validation - starts with letter/underscore, followed by alphanumeric/underscore
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Find a symbol by name path pattern.
   */
  private findSymbolByPattern(
    symbols: Symbol[],
    pattern: ReturnType<typeof parseNamePath>
  ): Symbol | null {
    for (const symbol of symbols) {
      if (matchNamePath(symbol.namePath, pattern)) {
        return symbol;
      }
      if (symbol.children) {
        const found = this.findSymbolByPattern(symbol.children, pattern);
        if (found) {
          return found;
        }
      }
    }
    return null;
  }

  /**
   * Replace occurrences in a file on specific lines.
   */
  private async replaceInFile(
    relativePath: string,
    originalName: string,
    newName: string,
    targetLines: Set<number>,
    dryRun: boolean
  ): Promise<{ replacements: number }> {
    const fullPath = path.join(this.projectPath, relativePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const lines = content.split('\n');

    let replacements = 0;
    const newLines = lines.map((line, index) => {
      const lineNumber = index + 1;

      // Only replace on target lines (where we found references)
      if (!targetLines.has(lineNumber)) {
        return line;
      }

      // Use word boundary matching to avoid partial replacements
      const regex = new RegExp(`\\b${this.escapeRegex(originalName)}\\b`, 'g');
      const newLine = line.replace(regex, () => {
        replacements++;
        return newName;
      });

      return newLine;
    });

    if (replacements > 0 && !dryRun) {
      const newContent = newLines.join('\n');
      await this.atomicWrite(fullPath, newContent);
    }

    return { replacements };
  }

  /**
   * Escape special regex characters in a string.
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Write a file atomically.
   */
  private async atomicWrite(filepath: string, content: string): Promise<void> {
    const tempPath = `${filepath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filepath);
    } catch (error) {
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}

/**
 * Format rename result for display.
 */
export function formatRenameResult(result: RenameResult): string {
  if (!result.success) {
    return `Rename failed: ${result.error}`;
  }

  const parts: string[] = [];
  parts.push(`Renamed "${result.originalName}" to "${result.newName}"`);
  parts.push(`Total replacements: ${result.totalReplacements}`);
  parts.push('\nModified files:');

  for (const file of result.modifiedFiles) {
    parts.push(
      `- ${file.filepath} (${file.replacements} replacement${file.replacements === 1 ? '' : 's'})`
    );
  }

  return parts.join('\n');
}
