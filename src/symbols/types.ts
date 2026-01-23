/**
 * Symbol types and interfaces for Serena-like symbolic code analysis.
 * Uses LSP-compatible symbol kinds for interoperability.
 */

/**
 * LSP-compatible symbol kinds.
 * Based on the Language Server Protocol specification.
 * @see https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#symbolKind
 */
export enum SymbolKind {
  File = 1,
  Module = 2,
  Namespace = 3,
  Package = 4,
  Class = 5,
  Method = 6,
  Property = 7,
  Field = 8,
  Constructor = 9,
  Enum = 10,
  Interface = 11,
  Function = 12,
  Variable = 13,
  Constant = 14,
  String = 15,
  Number = 16,
  Boolean = 17,
  Array = 18,
  Object = 19,
  Key = 20,
  Null = 21,
  EnumMember = 22,
  Struct = 23,
  Event = 24,
  Operator = 25,
  TypeParameter = 26,
}

/**
 * Human-readable names for symbol kinds
 */
export const SymbolKindNames: Record<SymbolKind, string> = {
  [SymbolKind.File]: 'File',
  [SymbolKind.Module]: 'Module',
  [SymbolKind.Namespace]: 'Namespace',
  [SymbolKind.Package]: 'Package',
  [SymbolKind.Class]: 'Class',
  [SymbolKind.Method]: 'Method',
  [SymbolKind.Property]: 'Property',
  [SymbolKind.Field]: 'Field',
  [SymbolKind.Constructor]: 'Constructor',
  [SymbolKind.Enum]: 'Enum',
  [SymbolKind.Interface]: 'Interface',
  [SymbolKind.Function]: 'Function',
  [SymbolKind.Variable]: 'Variable',
  [SymbolKind.Constant]: 'Constant',
  [SymbolKind.String]: 'String',
  [SymbolKind.Number]: 'Number',
  [SymbolKind.Boolean]: 'Boolean',
  [SymbolKind.Array]: 'Array',
  [SymbolKind.Object]: 'Object',
  [SymbolKind.Key]: 'Key',
  [SymbolKind.Null]: 'Null',
  [SymbolKind.EnumMember]: 'EnumMember',
  [SymbolKind.Struct]: 'Struct',
  [SymbolKind.Event]: 'Event',
  [SymbolKind.Operator]: 'Operator',
  [SymbolKind.TypeParameter]: 'TypeParameter',
};

/**
 * Location information for a symbol in a source file.
 */
export interface SymbolLocation {
  /** Relative path to the source file from the project root */
  filepath: string;
  /** Starting line number (1-indexed) */
  startLine: number;
  /** Ending line number (1-indexed) */
  endLine: number;
  /** Starting column (0-indexed) */
  startColumn: number;
  /** Ending column (0-indexed) */
  endColumn: number;
}

/**
 * A code symbol extracted from source code.
 * Represents functions, classes, methods, variables, etc.
 */
export interface Symbol {
  /** The symbol's name (e.g., 'MyClass', 'myMethod') */
  name: string;
  /**
   * Hierarchical name path within the file.
   * Format: "ClassName/methodName" or "/topLevelFunction"
   * Uses "/" as separator to match Serena's convention.
   */
  namePath: string;
  /** LSP-compatible symbol kind */
  kind: SymbolKind;
  /** Location in the source file */
  location: SymbolLocation;
  /** Parent symbol's name path, if this symbol is nested */
  parentNamePath?: string;
  /** Depth in the symbol hierarchy (0 = top-level) */
  depth: number;
  /** Child symbols (e.g., methods of a class) */
  children?: Symbol[];
  /** The symbol's source code body (only included when requested) */
  body?: string;
  /** Documentation/hover information (docstring, type signature) */
  info?: string;
}

/**
 * Result from find_symbol operations.
 * Includes the matched symbols and their location info.
 */
export interface FindSymbolResult {
  /** Matched symbols */
  symbols: Symbol[];
  /** Total number of matches found */
  totalMatches: number;
}

/**
 * Overview of symbols in a file, grouped by kind.
 */
export interface SymbolsOverview {
  /** Relative path to the file */
  filepath: string;
  /** Symbols grouped by kind */
  byKind: Record<string, SymbolOverviewEntry[]>;
  /** Total number of symbols */
  totalSymbols: number;
}

/**
 * Compact symbol entry for overview (without body)
 */
export interface SymbolOverviewEntry {
  /** Symbol name */
  name: string;
  /** Name path (hierarchical) */
  namePath: string;
  /** Line range */
  lines: string;
  /** Child count (if any) */
  children?: number;
}

/**
 * Options for the find_symbol tool.
 */
export interface FindSymbolOptions {
  /** Name path pattern to search for */
  namePathPattern: string;
  /** Restrict search to this file or directory */
  relativePath?: string;
  /** Depth of descendants to retrieve (0 = symbol only) */
  depth?: number;
  /** Whether to include the symbol's source code body */
  includeBody?: boolean;
  /** Whether to include additional info (docstring, signature) */
  includeInfo?: boolean;
  /** Use substring matching for the last element of the pattern */
  substringMatching?: boolean;
  /** Symbol kinds to include (LSP kind integers) */
  includeKinds?: SymbolKind[];
  /** Symbol kinds to exclude (takes precedence over includeKinds) */
  excludeKinds?: SymbolKind[];
  /** Maximum response size in characters */
  maxAnswerChars?: number;
}

/**
 * Options for the get_symbols_overview tool.
 */
export interface SymbolsOverviewOptions {
  /** Relative path to the file */
  relativePath: string;
  /** Depth of descendants to retrieve (0 = top-level only) */
  depth?: number;
  /** Maximum response size in characters */
  maxAnswerChars?: number;
}

/**
 * Reference to a symbol from another location in code.
 */
export interface SymbolReference {
  /** The symbol containing the reference */
  referencingSymbol: Symbol;
  /** Code snippet around the reference */
  codeSnippet: string;
  /** Line number where the reference occurs */
  line: number;
  /** Column where the reference starts */
  column: number;
}

/**
 * Options for find_referencing_symbols tool.
 */
export interface FindReferencesOptions {
  /** Name path of the symbol to find references for */
  namePath: string;
  /** Relative path to the file containing the symbol */
  relativePath: string;
  /** Whether to include additional info about referencing symbols */
  includeInfo?: boolean;
  /** Symbol kinds to include */
  includeKinds?: SymbolKind[];
  /** Symbol kinds to exclude */
  excludeKinds?: SymbolKind[];
  /** Maximum response size in characters */
  maxAnswerChars?: number;
}

/**
 * Options for search_for_pattern tool.
 */
export interface SearchPatternOptions {
  /** Regular expression pattern to search for */
  substringPattern: string;
  /** Restrict search to this path (file or directory) */
  relativePath?: string;
  /** Only search in code files (not config, docs, etc.) */
  restrictSearchToCodeFiles?: boolean;
  /** Glob pattern for files to include */
  pathsIncludeGlob?: string;
  /** Glob pattern for files to exclude */
  pathsExcludeGlob?: string;
  /** Number of context lines before each match */
  contextLinesBefore?: number;
  /** Number of context lines after each match */
  contextLinesAfter?: number;
  /** Maximum response size in characters */
  maxAnswerChars?: number;
}

/**
 * Result from pattern search.
 */
export interface PatternSearchResult {
  /** Map of filepath to matched lines with context */
  matches: Record<string, PatternMatch[]>;
  /** Total number of matches */
  totalMatches: number;
}

/**
 * A single pattern match with context.
 */
export interface PatternMatch {
  /** Line number of the match (1-indexed) */
  line: number;
  /** The matched line and context */
  content: string;
  /** Column where match starts (0-indexed) */
  matchStart?: number;
  /** Length of the match */
  matchLength?: number;
}

/**
 * Map from AST chunk types to LSP symbol kinds.
 */
export function chunkTypeToSymbolKind(
  chunkType:
    | 'function'
    | 'class'
    | 'method'
    | 'interface'
    | 'type'
    | 'variable'
    | 'import'
    | 'other'
): SymbolKind {
  switch (chunkType) {
    case 'function':
      return SymbolKind.Function;
    case 'class':
      return SymbolKind.Class;
    case 'method':
      return SymbolKind.Method;
    case 'interface':
      return SymbolKind.Interface;
    case 'type':
      return SymbolKind.TypeParameter;
    case 'variable':
      return SymbolKind.Variable;
    case 'import':
      return SymbolKind.Module;
    case 'other':
    default:
      return SymbolKind.Variable;
  }
}

/**
 * Get symbol kind from a name (for parsing user input).
 */
export function parseSymbolKind(name: string): SymbolKind | undefined {
  const normalized = name.toLowerCase();
  for (const [kind, kindName] of Object.entries(SymbolKindNames)) {
    if (kindName.toLowerCase() === normalized) {
      return Number(kind) as SymbolKind;
    }
  }
  return undefined;
}
