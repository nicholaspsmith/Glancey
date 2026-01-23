/**
 * Symbol editor for modifying symbol definitions in source files.
 * Provides atomic operations to replace, insert before, or insert after symbols.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { Symbol } from './types.js';
import { SymbolExtractor } from './symbol-extractor.js';
import { parseNamePath, matchNamePath, getSymbolName } from './name-path.js';

/**
 * Result from a symbol edit operation.
 */
export interface EditResult {
  /** Whether the edit was successful */
  success: boolean;
  /** Updated file path */
  filepath: string;
  /** Symbol that was edited */
  symbolName: string;
  /** New line range of the edited content */
  newRange?: { startLine: number; endLine: number };
  /** Error message if failed */
  error?: string;
}

/**
 * Options for replace_symbol_body.
 */
export interface ReplaceSymbolOptions {
  /** Name path of the symbol to replace */
  namePath: string;
  /** Relative path to the file containing the symbol */
  relativePath: string;
  /** The new body content for the symbol */
  body: string;
}

/**
 * Options for insert_before_symbol or insert_after_symbol.
 */
export interface InsertSymbolOptions {
  /** Name path of the reference symbol */
  namePath: string;
  /** Relative path to the file containing the symbol */
  relativePath: string;
  /** The content to insert */
  body: string;
}

/**
 * Symbol editor for modifying source files.
 */
export class SymbolEditor {
  private projectPath: string;
  private symbolExtractor: SymbolExtractor;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.symbolExtractor = new SymbolExtractor(projectPath);
  }

  /**
   * Replace a symbol's body with new content.
   */
  async replaceSymbolBody(options: ReplaceSymbolOptions): Promise<EditResult> {
    const { namePath, relativePath, body } = options;
    const fullPath = path.join(this.projectPath, relativePath);

    try {
      // Find the target symbol
      const symbols = await this.symbolExtractor.extractSymbols(relativePath, true);
      const pattern = parseNamePath(namePath);
      const targetSymbol = this.findSymbolByPattern(symbols, pattern);

      if (!targetSymbol) {
        return {
          success: false,
          filepath: relativePath,
          symbolName: getSymbolName(namePath),
          error: `Symbol not found: ${namePath}`,
        };
      }

      // Read the file
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Get the indentation of the original symbol
      const originalFirstLine = lines[targetSymbol.location.startLine - 1];
      const indentation = this.detectIndentation(originalFirstLine);

      // Apply indentation to the new body
      const indentedBody = this.applyIndentation(body, indentation);

      // Replace the lines
      const beforeLines = lines.slice(0, targetSymbol.location.startLine - 1);
      const afterLines = lines.slice(targetSymbol.location.endLine);
      const newBodyLines = indentedBody.split('\n');

      const newContent = [...beforeLines, ...newBodyLines, ...afterLines].join('\n');

      // Write the file atomically
      await this.atomicWrite(fullPath, newContent);

      return {
        success: true,
        filepath: relativePath,
        symbolName: targetSymbol.name,
        newRange: {
          startLine: targetSymbol.location.startLine,
          endLine: targetSymbol.location.startLine + newBodyLines.length - 1,
        },
      };
    } catch (error) {
      return {
        success: false,
        filepath: relativePath,
        symbolName: getSymbolName(namePath),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Insert content before a symbol.
   */
  async insertBeforeSymbol(options: InsertSymbolOptions): Promise<EditResult> {
    const { namePath, relativePath, body } = options;
    const fullPath = path.join(this.projectPath, relativePath);

    try {
      // Find the target symbol
      const symbols = await this.symbolExtractor.extractSymbols(relativePath, false);
      const pattern = parseNamePath(namePath);
      const targetSymbol = this.findSymbolByPattern(symbols, pattern);

      if (!targetSymbol) {
        return {
          success: false,
          filepath: relativePath,
          symbolName: getSymbolName(namePath),
          error: `Symbol not found: ${namePath}`,
        };
      }

      // Read the file
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Get the indentation of the target symbol
      const originalFirstLine = lines[targetSymbol.location.startLine - 1];
      const indentation = this.detectIndentation(originalFirstLine);

      // Apply indentation to the new body
      const indentedBody = this.applyIndentation(body, indentation);
      const newBodyLines = indentedBody.split('\n');

      // Insert before the symbol (add blank line after if not present)
      const insertPoint = targetSymbol.location.startLine - 1;
      const beforeLines = lines.slice(0, insertPoint);
      const afterLines = lines.slice(insertPoint);

      // Add a blank line between new content and existing symbol if needed
      const needsBlankLine =
        newBodyLines.length > 0 && afterLines.length > 0 && afterLines[0].trim() !== '';
      const separator = needsBlankLine ? [''] : [];

      const newContent = [...beforeLines, ...newBodyLines, ...separator, ...afterLines].join('\n');

      // Write the file atomically
      await this.atomicWrite(fullPath, newContent);

      return {
        success: true,
        filepath: relativePath,
        symbolName: targetSymbol.name,
        newRange: {
          startLine: insertPoint + 1,
          endLine: insertPoint + newBodyLines.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        filepath: relativePath,
        symbolName: getSymbolName(namePath),
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Insert content after a symbol.
   */
  async insertAfterSymbol(options: InsertSymbolOptions): Promise<EditResult> {
    const { namePath, relativePath, body } = options;
    const fullPath = path.join(this.projectPath, relativePath);

    try {
      // Find the target symbol
      const symbols = await this.symbolExtractor.extractSymbols(relativePath, false);
      const pattern = parseNamePath(namePath);
      const targetSymbol = this.findSymbolByPattern(symbols, pattern);

      if (!targetSymbol) {
        return {
          success: false,
          filepath: relativePath,
          symbolName: getSymbolName(namePath),
          error: `Symbol not found: ${namePath}`,
        };
      }

      // Read the file
      const content = await fs.readFile(fullPath, 'utf-8');
      const lines = content.split('\n');

      // Get the indentation of the target symbol
      const originalFirstLine = lines[targetSymbol.location.startLine - 1];
      const indentation = this.detectIndentation(originalFirstLine);

      // Apply indentation to the new body
      const indentedBody = this.applyIndentation(body, indentation);
      const newBodyLines = indentedBody.split('\n');

      // Insert after the symbol
      const insertPoint = targetSymbol.location.endLine;
      const beforeLines = lines.slice(0, insertPoint);
      const afterLines = lines.slice(insertPoint);

      // Add a blank line before new content if needed
      const needsBlankLine =
        beforeLines.length > 0 && beforeLines[beforeLines.length - 1].trim() !== '';
      const separator = needsBlankLine ? [''] : [];

      const newContent = [...beforeLines, ...separator, ...newBodyLines, ...afterLines].join('\n');

      // Write the file atomically
      await this.atomicWrite(fullPath, newContent);

      return {
        success: true,
        filepath: relativePath,
        symbolName: targetSymbol.name,
        newRange: {
          startLine: insertPoint + separator.length + 1,
          endLine: insertPoint + separator.length + newBodyLines.length,
        },
      };
    } catch (error) {
      return {
        success: false,
        filepath: relativePath,
        symbolName: getSymbolName(namePath),
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
   * Detect the indentation used on a line.
   */
  private detectIndentation(line: string): string {
    const match = line.match(/^(\s*)/);
    return match ? match[1] : '';
  }

  /**
   * Apply indentation to a block of code.
   */
  private applyIndentation(code: string, baseIndentation: string): string {
    const lines = code.split('\n');

    // Find the minimum indentation in the provided code (excluding empty lines)
    let minIndent = Infinity;
    for (const line of lines) {
      if (line.trim().length > 0) {
        const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
        minIndent = Math.min(minIndent, indent);
      }
    }
    if (minIndent === Infinity) minIndent = 0;

    // Re-indent the code with the base indentation
    return lines
      .map((line) => {
        if (line.trim().length === 0) {
          return '';
        }
        const relativeIndent = line.substring(minIndent);
        return baseIndentation + relativeIndent;
      })
      .join('\n');
  }

  /**
   * Write a file atomically (write to temp file, then rename).
   */
  private async atomicWrite(filepath: string, content: string): Promise<void> {
    const tempPath = `${filepath}.tmp.${Date.now()}`;
    try {
      await fs.writeFile(tempPath, content, 'utf-8');
      await fs.rename(tempPath, filepath);
    } catch (error) {
      // Try to clean up temp file
      try {
        await fs.unlink(tempPath);
      } catch {
        // Ignore cleanup errors
      }
      throw error;
    }
  }
}
