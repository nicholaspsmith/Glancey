/**
 * Reference finder for locating all usages of a symbol.
 * Uses Tree-sitter to find identifier references across the codebase.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { glob } from 'glob';
import * as ts from 'typescript';
import type { Parser as ParserType, Language, Node as SyntaxNode } from 'web-tree-sitter';
import { SymbolReference, Symbol, SymbolKind, FindReferencesOptions } from './types.js';
import { SymbolExtractor } from './symbol-extractor.js';
import { getSymbolName, parseNamePath, matchNamePath } from './name-path.js';

// Dynamic import for ESM compatibility
interface ParserModule {
  Parser: typeof ParserType;
  Language: typeof Language;
}

let parserModule: ParserModule | null = null;
const loadParserModule = async (): Promise<ParserModule> => {
  if (!parserModule) {
    const mod = await import('web-tree-sitter');
    parserModule = {
      Parser: mod.Parser,
      Language: mod.Language,
    };
  }
  return parserModule;
};

/**
 * Language configuration for reference finding
 */
interface LanguageConfig {
  wasmFile: string;
  extensions: string[];
  identifierTypes: string[];
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    wasmFile: 'tree-sitter-python.wasm',
    extensions: ['.py', '.pyi'],
    identifierTypes: ['identifier'],
  },
  go: {
    wasmFile: 'tree-sitter-go.wasm',
    extensions: ['.go'],
    identifierTypes: ['identifier', 'type_identifier', 'field_identifier'],
  },
  rust: {
    wasmFile: 'tree-sitter-rust.wasm',
    extensions: ['.rs'],
    identifierTypes: ['identifier', 'type_identifier', 'field_identifier'],
  },
  java: {
    wasmFile: 'tree-sitter-java.wasm',
    extensions: ['.java'],
    identifierTypes: ['identifier', 'type_identifier'],
  },
  ruby: {
    wasmFile: 'tree-sitter-ruby.wasm',
    extensions: ['.rb'],
    identifierTypes: ['identifier', 'constant'],
  },
};

/**
 * Default patterns for files to exclude when searching
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
];

/**
 * Find references to a symbol across the codebase.
 */
export class ReferenceFinder {
  private static parser: ParserType | null = null;
  private static loadedLanguages: Map<string, Language> = new Map();
  private static initPromise: Promise<void> | null = null;
  private static wasmBasePath: string | null = null;

  private projectPath: string;
  private symbolExtractor: SymbolExtractor;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
    this.symbolExtractor = new SymbolExtractor(projectPath);
  }

  /**
   * Initialize the tree-sitter parser.
   */
  private static async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      this.wasmBasePath = await this.findWasmBasePath();
      const module = await loadParserModule();

      const webTreeSitterWasm = path.join(
        process.cwd(),
        'node_modules',
        'web-tree-sitter',
        'web-tree-sitter.wasm'
      );
      await module.Parser.init({
        locateFile: () => webTreeSitterWasm,
      });
      this.parser = new module.Parser();
    })();

    return this.initPromise;
  }

  private static async findWasmBasePath(): Promise<string> {
    const { fileURLToPath } = await import('url');
    const possiblePaths = [
      path.join(process.cwd(), 'node_modules', '@vscode', 'tree-sitter-wasm', 'wasm'),
      path.join(
        fileURLToPath(import.meta.url),
        '..',
        '..',
        '..',
        'node_modules',
        '@vscode',
        'tree-sitter-wasm',
        'wasm'
      ),
    ];

    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        return p;
      } catch {
        // Try next
      }
    }

    throw new Error('Could not find @vscode/tree-sitter-wasm package.');
  }

  private static getLanguageConfig(filepath: string): LanguageConfig | null {
    const ext = path.extname(filepath).toLowerCase();
    for (const [, config] of Object.entries(LANGUAGE_CONFIGS)) {
      if (config.extensions.includes(ext)) {
        return config;
      }
    }
    return null;
  }

  private static async loadLanguage(config: LanguageConfig): Promise<Language> {
    const cached = this.loadedLanguages.get(config.wasmFile);
    if (cached) {
      return cached;
    }

    if (!this.wasmBasePath) {
      throw new Error('ReferenceFinder not initialized.');
    }

    const module = await loadParserModule();
    const wasmPath = path.join(this.wasmBasePath, config.wasmFile);
    const wasmBytes = await fs.readFile(wasmPath);
    const language = await module.Language.load(wasmBytes);
    this.loadedLanguages.set(config.wasmFile, language);
    return language;
  }

  /**
   * Find all references to a symbol.
   */
  async findReferences(options: FindReferencesOptions): Promise<SymbolReference[]> {
    const { namePath, relativePath, includeInfo = false, includeKinds, excludeKinds } = options;

    // First, find the target symbol
    const fullPath = path.join(this.projectPath, relativePath);
    const symbols = await this.symbolExtractor.extractSymbols(fullPath, false);

    const pattern = parseNamePath(namePath);
    const targetSymbol = this.findSymbolByPattern(symbols, pattern);

    if (!targetSymbol) {
      throw new Error(`Symbol not found: ${namePath} in ${relativePath}`);
    }

    const symbolName = getSymbolName(targetSymbol.namePath);

    // Find all files to search
    const files = await this.findFilesToSearch();

    const references: SymbolReference[] = [];

    for (const file of files) {
      const fileRefs = await this.findReferencesInFile(
        file,
        symbolName,
        targetSymbol,
        includeInfo,
        includeKinds,
        excludeKinds
      );
      references.push(...fileRefs);
    }

    return references;
  }

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

  private async findFilesToSearch(): Promise<string[]> {
    const codeExtensions = [
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
    ];

    const patterns = codeExtensions.map((ext) => `**/*${ext}`);
    const files: string[] = [];

    for (const pattern of patterns) {
      const matches = await glob(pattern, {
        cwd: this.projectPath,
        ignore: DEFAULT_EXCLUDE_PATTERNS,
        absolute: true,
      });
      files.push(...matches);
    }

    return [...new Set(files)];
  }

  private async findReferencesInFile(
    filepath: string,
    symbolName: string,
    targetSymbol: Symbol,
    includeInfo: boolean,
    includeKinds?: SymbolKind[],
    excludeKinds?: SymbolKind[]
  ): Promise<SymbolReference[]> {
    const ext = path.extname(filepath).toLowerCase();
    const relativePath = path.relative(this.projectPath, filepath);
    const references: SymbolReference[] = [];

    try {
      const content = await fs.readFile(filepath, 'utf-8');
      const lines = content.split('\n');

      // Skip the definition file for non-exported symbols
      if (path.relative(this.projectPath, filepath) === targetSymbol.location.filepath) {
        // Still find references within the same file, but skip the definition itself
      }

      // Use TypeScript for TS/JS files
      if (['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(ext)) {
        const refs = this.findReferencesWithTypeScript(
          content,
          filepath,
          relativePath,
          lines,
          symbolName,
          targetSymbol
        );
        references.push(...refs);
      } else {
        // Use tree-sitter for other languages
        const config = ReferenceFinder.getLanguageConfig(filepath);
        if (config) {
          const refs = await this.findReferencesWithTreeSitter(
            content,
            filepath,
            relativePath,
            lines,
            symbolName,
            targetSymbol,
            config
          );
          references.push(...refs);
        }
      }

      // Filter by kinds
      return references.filter((ref) => {
        if (excludeKinds && excludeKinds.includes(ref.referencingSymbol.kind)) {
          return false;
        }
        if (includeKinds && !includeKinds.includes(ref.referencingSymbol.kind)) {
          return false;
        }
        return true;
      });
    } catch {
      // Skip files that can't be read
      return [];
    }
  }

  private findReferencesWithTypeScript(
    content: string,
    _filepath: string,
    relativePath: string,
    lines: string[],
    symbolName: string,
    targetSymbol: Symbol
  ): SymbolReference[] {
    const references: SymbolReference[] = [];

    const ext = path.extname(relativePath).toLowerCase();
    let scriptKind = ts.ScriptKind.TS;
    if (ext === '.tsx' || ext === '.jsx') {
      scriptKind = ts.ScriptKind.TSX;
    } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
      scriptKind = ts.ScriptKind.JS;
    }

    const sourceFile = ts.createSourceFile(
      relativePath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const findIdentifiers = (node: ts.Node) => {
      if (ts.isIdentifier(node) && node.text === symbolName) {
        const line = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
        const column = sourceFile.getLineAndCharacterOfPosition(node.getStart()).character;

        // Skip the definition itself
        if (
          relativePath === targetSymbol.location.filepath &&
          line === targetSymbol.location.startLine
        ) {
          return;
        }

        // Get context (surrounding lines)
        const startLine = Math.max(0, line - 2);
        const endLine = Math.min(lines.length, line + 1);
        const codeSnippet = lines.slice(startLine, endLine).join('\n');

        // Create a minimal referencing symbol
        const referencingSymbol: Symbol = {
          name: symbolName,
          namePath: `/${relativePath}:${line}`,
          kind: SymbolKind.Variable, // Default - we don't have full context here
          location: {
            filepath: relativePath,
            startLine: line,
            endLine: line,
            startColumn: column,
            endColumn: column + symbolName.length,
          },
          depth: 0,
        };

        references.push({
          referencingSymbol,
          codeSnippet,
          line,
          column,
        });
      }

      ts.forEachChild(node, findIdentifiers);
    };

    findIdentifiers(sourceFile);

    return references;
  }

  private async findReferencesWithTreeSitter(
    content: string,
    _filepath: string,
    relativePath: string,
    lines: string[],
    symbolName: string,
    targetSymbol: Symbol,
    config: LanguageConfig
  ): Promise<SymbolReference[]> {
    await ReferenceFinder.initialize();

    const language = await ReferenceFinder.loadLanguage(config);
    const parser = ReferenceFinder.parser;
    if (!parser) {
      return [];
    }
    parser.setLanguage(language);

    const tree = parser.parse(content);
    if (!tree) {
      return [];
    }

    const references: SymbolReference[] = [];

    const findIdentifiers = (node: SyntaxNode) => {
      if (config.identifierTypes.includes(node.type) && node.text === symbolName) {
        const line = node.startPosition.row + 1;
        const column = node.startPosition.column;

        // Skip the definition itself
        if (
          relativePath === targetSymbol.location.filepath &&
          line >= targetSymbol.location.startLine &&
          line <= targetSymbol.location.endLine
        ) {
          return;
        }

        // Get context (surrounding lines)
        const startLine = Math.max(0, line - 2);
        const endLine = Math.min(lines.length, line + 1);
        const codeSnippet = lines.slice(startLine, endLine).join('\n');

        const referencingSymbol: Symbol = {
          name: symbolName,
          namePath: `/${relativePath}:${line}`,
          kind: SymbolKind.Variable,
          location: {
            filepath: relativePath,
            startLine: line,
            endLine: line,
            startColumn: column,
            endColumn: column + symbolName.length,
          },
          depth: 0,
        };

        references.push({
          referencingSymbol,
          codeSnippet,
          line,
          column,
        });
      }

      for (const child of node.children) {
        findIdentifiers(child);
      }
    };

    findIdentifiers(tree.rootNode);

    return references;
  }
}

/**
 * Format reference results for display.
 */
export function formatReferencesResult(references: SymbolReference[]): string {
  if (references.length === 0) {
    return 'No references found.';
  }

  const parts: string[] = [];
  parts.push(`Found ${references.length} reference${references.length === 1 ? '' : 's'}:\n`);

  // Group by file
  const byFile = new Map<string, SymbolReference[]>();
  for (const ref of references) {
    const file = ref.referencingSymbol.location.filepath;
    const fileRefs = byFile.get(file) || [];
    fileRefs.push(ref);
    byFile.set(file, fileRefs);
  }

  for (const [filepath, fileRefs] of byFile) {
    parts.push(`\n## ${filepath}\n`);

    for (const ref of fileRefs) {
      parts.push(`Line ${ref.line}:`);
      parts.push('```');
      parts.push(ref.codeSnippet);
      parts.push('```\n');
    }
  }

  return parts.join('\n');
}
