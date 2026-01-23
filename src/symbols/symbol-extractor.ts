/**
 * Symbol extractor using Tree-sitter and TypeScript AST for multiple languages.
 * Extracts hierarchical symbol information from source files.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as ts from 'typescript';
import type { Parser as ParserType, Language, Node as SyntaxNode } from 'web-tree-sitter';
import {
  Symbol,
  SymbolKind,
  SymbolLocation,
  SymbolsOverview,
  SymbolOverviewEntry,
  SymbolKindNames,
} from './types.js';
import { buildNamePath, formatNamePath } from './name-path.js';

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
 * Language configuration for symbol extraction
 */
interface LanguageConfig {
  wasmFile: string;
  extensions: string[];
  // Node types for different symbol kinds
  functionTypes: string[];
  classTypes: string[];
  methodTypes: string[];
  importTypes: string[];
  variableTypes: string[];
  interfaceTypes: string[];
  typeTypes: string[];
  constructorTypes: string[];
}

/**
 * Language configurations (same as TreeSitterChunker but with constructor types)
 */
const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    wasmFile: 'tree-sitter-python.wasm',
    extensions: ['.py', '.pyi'],
    functionTypes: ['function_definition'],
    classTypes: ['class_definition'],
    methodTypes: ['function_definition'],
    importTypes: ['import_statement', 'import_from_statement'],
    variableTypes: ['assignment', 'expression_statement'],
    interfaceTypes: [],
    typeTypes: [],
    constructorTypes: [], // __init__ is detected by name
  },
  go: {
    wasmFile: 'tree-sitter-go.wasm',
    extensions: ['.go'],
    functionTypes: ['function_declaration'],
    classTypes: [],
    methodTypes: ['method_declaration'],
    importTypes: ['import_declaration'],
    variableTypes: ['var_declaration', 'const_declaration', 'short_var_declaration'],
    interfaceTypes: ['type_declaration'],
    typeTypes: ['type_declaration'],
    constructorTypes: [],
  },
  rust: {
    wasmFile: 'tree-sitter-rust.wasm',
    extensions: ['.rs'],
    functionTypes: ['function_item'],
    classTypes: [],
    methodTypes: ['function_item'],
    importTypes: ['use_declaration'],
    variableTypes: ['let_declaration', 'const_item', 'static_item'],
    interfaceTypes: ['trait_item'],
    typeTypes: ['type_item', 'struct_item', 'enum_item', 'impl_item'],
    constructorTypes: [],
  },
  java: {
    wasmFile: 'tree-sitter-java.wasm',
    extensions: ['.java'],
    functionTypes: [],
    classTypes: ['class_declaration', 'interface_declaration', 'enum_declaration'],
    methodTypes: ['method_declaration'],
    importTypes: ['import_declaration'],
    variableTypes: ['field_declaration', 'local_variable_declaration'],
    interfaceTypes: ['interface_declaration'],
    typeTypes: [],
    constructorTypes: ['constructor_declaration'],
  },
  ruby: {
    wasmFile: 'tree-sitter-ruby.wasm',
    extensions: ['.rb'],
    functionTypes: ['method'],
    classTypes: ['class', 'module'],
    methodTypes: ['method', 'singleton_method'],
    importTypes: ['call'],
    variableTypes: ['assignment'],
    interfaceTypes: [],
    typeTypes: [],
    constructorTypes: [], // initialize is detected by name
  },
};

/**
 * Symbol extractor for extracting hierarchical symbol information.
 */
export class SymbolExtractor {
  private static parser: ParserType | null = null;
  private static loadedLanguages: Map<string, Language> = new Map();
  private static initPromise: Promise<void> | null = null;
  private static wasmBasePath: string | null = null;

  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
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
        // Try next path
      }
    }

    throw new Error(
      'Could not find @vscode/tree-sitter-wasm package. Please install it with: npm install @vscode/tree-sitter-wasm'
    );
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
      throw new Error('SymbolExtractor not initialized.');
    }

    const module = await loadParserModule();
    const wasmPath = path.join(this.wasmBasePath, config.wasmFile);
    const wasmBytes = await fs.readFile(wasmPath);
    const language = await module.Language.load(wasmBytes);
    this.loadedLanguages.set(config.wasmFile, language);
    return language;
  }

  /**
   * Check if a file can be analyzed for symbols.
   */
  static canAnalyze(filepath: string): boolean {
    const ext = path.extname(filepath).toLowerCase();
    // TypeScript/JavaScript via TS compiler
    if (['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(ext)) {
      return true;
    }
    // Other languages via tree-sitter
    return this.getLanguageConfig(filepath) !== null;
  }

  /**
   * Extract all symbols from a file.
   */
  async extractSymbols(filepath: string, includeBody: boolean = false): Promise<Symbol[]> {
    const fullPath = path.isAbsolute(filepath) ? filepath : path.join(this.projectPath, filepath);
    const relativePath = path.isAbsolute(filepath)
      ? path.relative(this.projectPath, filepath)
      : filepath;

    const ext = path.extname(fullPath).toLowerCase();

    // Use TypeScript compiler for TS/JS files
    if (['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs', '.cjs'].includes(ext)) {
      return this.extractSymbolsWithTypeScript(fullPath, relativePath, includeBody);
    }

    // Use tree-sitter for other languages
    const config = SymbolExtractor.getLanguageConfig(fullPath);
    if (config) {
      return this.extractSymbolsWithTreeSitter(fullPath, relativePath, config, includeBody);
    }

    throw new Error(`Unsupported file type: ${filepath}`);
  }

  /**
   * Get symbols overview for a file.
   */
  async getSymbolsOverview(filepath: string, depth: number = 0): Promise<SymbolsOverview> {
    const symbols = await this.extractSymbols(filepath, false);
    const relativePath = path.isAbsolute(filepath)
      ? path.relative(this.projectPath, filepath)
      : filepath;

    // Group by kind
    const byKind: Record<string, SymbolOverviewEntry[]> = {};

    const processSymbol = (symbol: Symbol, currentDepth: number) => {
      const kindName = SymbolKindNames[symbol.kind];
      if (!byKind[kindName]) {
        byKind[kindName] = [];
      }

      byKind[kindName].push({
        name: symbol.name,
        namePath: formatNamePath(symbol.namePath),
        lines: `${symbol.location.startLine}-${symbol.location.endLine}`,
        children: symbol.children?.length,
      });

      // Process children up to requested depth
      if (currentDepth < depth && symbol.children) {
        for (const child of symbol.children) {
          processSymbol(child, currentDepth + 1);
        }
      }
    };

    for (const symbol of symbols) {
      processSymbol(symbol, 0);
    }

    return {
      filepath: relativePath,
      byKind,
      totalSymbols: this.countSymbols(symbols, depth),
    };
  }

  private countSymbols(symbols: Symbol[], depth: number, currentDepth: number = 0): number {
    let count = symbols.length;
    if (currentDepth < depth) {
      for (const symbol of symbols) {
        if (symbol.children) {
          count += this.countSymbols(symbol.children, depth, currentDepth + 1);
        }
      }
    }
    return count;
  }

  /**
   * Extract symbols using TypeScript compiler.
   */
  private async extractSymbolsWithTypeScript(
    fullPath: string,
    relativePath: string,
    includeBody: boolean
  ): Promise<Symbol[]> {
    const content = await fs.readFile(fullPath, 'utf-8');
    const ext = path.extname(fullPath).toLowerCase();

    let scriptKind = ts.ScriptKind.TS;
    if (ext === '.tsx' || ext === '.jsx') {
      scriptKind = ts.ScriptKind.TSX;
    } else if (['.js', '.mjs', '.cjs'].includes(ext)) {
      scriptKind = ts.ScriptKind.JS;
    }

    const sourceFile = ts.createSourceFile(
      fullPath,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKind
    );

    const lines = content.split('\n');
    const symbols: Symbol[] = [];

    const processNode = (
      node: ts.Node,
      parentPath: string | undefined,
      parentDepth: number
    ): void => {
      // Skip import/export declarations
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        return;
      }

      const symbol = this.nodeToSymbol(
        node,
        sourceFile,
        lines,
        relativePath,
        parentPath,
        parentDepth,
        includeBody
      );
      if (symbol) {
        symbols.push(symbol);

        // Process children for classes
        if (ts.isClassDeclaration(node)) {
          const children: Symbol[] = [];
          node.members.forEach((member) => {
            const childSymbol = this.memberToSymbol(
              member,
              sourceFile,
              lines,
              relativePath,
              symbol.namePath,
              symbol.depth + 1,
              includeBody
            );
            if (childSymbol) {
              children.push(childSymbol);
            }
          });
          if (children.length > 0) {
            symbol.children = children;
          }
        }
      } else {
        // Process children for non-symbol nodes
        ts.forEachChild(node, (child) => processNode(child, parentPath, parentDepth));
      }
    };

    ts.forEachChild(sourceFile, (node) => processNode(node, undefined, 0));

    return symbols;
  }

  private nodeToSymbol(
    node: ts.Node,
    sourceFile: ts.SourceFile,
    lines: string[],
    relativePath: string,
    parentPath: string | undefined,
    depth: number,
    includeBody: boolean
  ): Symbol | null {
    const fullStart = node.getFullStart();
    const startLine = sourceFile.getLineAndCharacterOfPosition(fullStart).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
    const startChar = sourceFile.getLineAndCharacterOfPosition(node.getStart()).character;
    const endChar = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).character;

    let name: string | undefined;
    let kind: SymbolKind;

    if (ts.isFunctionDeclaration(node) && node.name) {
      name = node.name.getText(sourceFile);
      kind = SymbolKind.Function;
    } else if (ts.isClassDeclaration(node) && node.name) {
      name = node.name.getText(sourceFile);
      kind = SymbolKind.Class;
    } else if (ts.isInterfaceDeclaration(node)) {
      name = node.name.getText(sourceFile);
      kind = SymbolKind.Interface;
    } else if (ts.isTypeAliasDeclaration(node)) {
      name = node.name.getText(sourceFile);
      kind = SymbolKind.TypeParameter;
    } else if (ts.isEnumDeclaration(node)) {
      name = node.name.getText(sourceFile);
      kind = SymbolKind.Enum;
    } else if (ts.isVariableStatement(node)) {
      const declarations = node.declarationList.declarations;
      if (declarations.length > 0 && ts.isIdentifier(declarations[0].name)) {
        name = declarations[0].name.getText(sourceFile);
        kind =
          ts.getCombinedModifierFlags(declarations[0]) & ts.ModifierFlags.Const
            ? SymbolKind.Constant
            : SymbolKind.Variable;
      } else {
        return null;
      }
    } else {
      return null;
    }

    if (!name) {
      return null;
    }

    const namePath = buildNamePath(parentPath, name);
    const location: SymbolLocation = {
      filepath: relativePath,
      startLine,
      endLine,
      startColumn: startChar,
      endColumn: endChar,
    };

    const symbol: Symbol = {
      name,
      namePath,
      kind,
      location,
      depth,
      parentNamePath: parentPath,
    };

    if (includeBody) {
      symbol.body = lines.slice(startLine - 1, endLine).join('\n');
    }

    return symbol;
  }

  private memberToSymbol(
    member: ts.ClassElement,
    sourceFile: ts.SourceFile,
    lines: string[],
    relativePath: string,
    parentPath: string,
    depth: number,
    includeBody: boolean
  ): Symbol | null {
    const fullStart = member.getFullStart();
    const startLine = sourceFile.getLineAndCharacterOfPosition(fullStart).line + 1;
    const endLine = sourceFile.getLineAndCharacterOfPosition(member.getEnd()).line + 1;
    const startChar = sourceFile.getLineAndCharacterOfPosition(member.getStart()).character;
    const endChar = sourceFile.getLineAndCharacterOfPosition(member.getEnd()).character;

    let name: string | undefined;
    let kind: SymbolKind;

    if (
      ts.isMethodDeclaration(member) ||
      ts.isGetAccessorDeclaration(member) ||
      ts.isSetAccessorDeclaration(member)
    ) {
      name = member.name?.getText(sourceFile);
      kind = SymbolKind.Method;
    } else if (ts.isConstructorDeclaration(member)) {
      name = 'constructor';
      kind = SymbolKind.Constructor;
    } else if (ts.isPropertyDeclaration(member)) {
      name = member.name?.getText(sourceFile);
      kind = SymbolKind.Property;
    } else {
      return null;
    }

    if (!name) {
      return null;
    }

    const namePath = buildNamePath(parentPath, name);
    const location: SymbolLocation = {
      filepath: relativePath,
      startLine,
      endLine,
      startColumn: startChar,
      endColumn: endChar,
    };

    const symbol: Symbol = {
      name,
      namePath,
      kind,
      location,
      depth,
      parentNamePath: parentPath,
    };

    if (includeBody) {
      symbol.body = lines.slice(startLine - 1, endLine).join('\n');
    }

    return symbol;
  }

  /**
   * Extract symbols using tree-sitter.
   */
  private async extractSymbolsWithTreeSitter(
    fullPath: string,
    relativePath: string,
    config: LanguageConfig,
    includeBody: boolean
  ): Promise<Symbol[]> {
    await SymbolExtractor.initialize();

    const language = await SymbolExtractor.loadLanguage(config);
    const parser = SymbolExtractor.parser;
    if (!parser) {
      throw new Error('SymbolExtractor parser not initialized');
    }
    parser.setLanguage(language);

    const content = await fs.readFile(fullPath, 'utf-8');
    const tree = parser.parse(content);
    if (!tree) {
      throw new Error(`Failed to parse file: ${fullPath}`);
    }

    const lines = content.split('\n');
    const symbols: Symbol[] = [];

    this.processTreeSitterNode(
      tree.rootNode,
      config,
      lines,
      relativePath,
      undefined,
      0,
      symbols,
      includeBody
    );

    return symbols;
  }

  private processTreeSitterNode(
    node: SyntaxNode,
    config: LanguageConfig,
    lines: string[],
    relativePath: string,
    parentPath: string | undefined,
    depth: number,
    symbols: Symbol[],
    includeBody: boolean,
    parentClassName?: string
  ): void {
    // Check for classes
    if (config.classTypes.includes(node.type)) {
      const name = this.getTreeSitterNodeName(node) || 'AnonymousClass';
      const namePath = buildNamePath(parentPath, name);

      const symbol: Symbol = {
        name,
        namePath,
        kind: SymbolKind.Class,
        location: {
          filepath: relativePath,
          startLine: node.startPosition.row + 1,
          endLine: node.endPosition.row + 1,
          startColumn: node.startPosition.column,
          endColumn: node.endPosition.column,
        },
        depth,
        parentNamePath: parentPath,
        children: [],
      };

      if (includeBody) {
        symbol.body = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');
      }

      // Process class children
      const symbolChildren = symbol.children || [];
      for (const child of node.children) {
        this.processTreeSitterNode(
          child,
          config,
          lines,
          relativePath,
          namePath,
          depth + 1,
          symbolChildren,
          includeBody,
          name
        );
      }

      if (symbolChildren.length === 0) {
        delete symbol.children;
      } else {
        symbol.children = symbolChildren;
      }

      symbols.push(symbol);
      return;
    }

    // Check for functions (top-level)
    if (config.functionTypes.includes(node.type) && !parentClassName) {
      const name = this.getTreeSitterNodeName(node);
      if (name) {
        const namePath = buildNamePath(parentPath, name);

        const symbol: Symbol = {
          name,
          namePath,
          kind: SymbolKind.Function,
          location: {
            filepath: relativePath,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            startColumn: node.startPosition.column,
            endColumn: node.endPosition.column,
          },
          depth,
          parentNamePath: parentPath,
        };

        if (includeBody) {
          symbol.body = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');
        }

        symbols.push(symbol);
        return;
      }
    }

    // Check for methods (inside class)
    if (config.methodTypes.includes(node.type) && parentClassName) {
      const name = this.getTreeSitterNodeName(node);
      if (name) {
        const namePath = buildNamePath(parentPath, name);

        // Determine if constructor
        const isConstructor =
          config.constructorTypes.includes(node.type) ||
          name === '__init__' ||
          name === 'initialize' ||
          name === 'constructor';

        const symbol: Symbol = {
          name,
          namePath,
          kind: isConstructor ? SymbolKind.Constructor : SymbolKind.Method,
          location: {
            filepath: relativePath,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            startColumn: node.startPosition.column,
            endColumn: node.endPosition.column,
          },
          depth,
          parentNamePath: parentPath,
        };

        if (includeBody) {
          symbol.body = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');
        }

        symbols.push(symbol);
        return;
      }
    }

    // Check for interfaces/traits
    if (config.interfaceTypes.includes(node.type)) {
      const name = this.getTreeSitterNodeName(node);
      if (name) {
        const namePath = buildNamePath(parentPath, name);

        const symbol: Symbol = {
          name,
          namePath,
          kind: SymbolKind.Interface,
          location: {
            filepath: relativePath,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            startColumn: node.startPosition.column,
            endColumn: node.endPosition.column,
          },
          depth,
          parentNamePath: parentPath,
        };

        if (includeBody) {
          symbol.body = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');
        }

        symbols.push(symbol);
        return;
      }
    }

    // Check for top-level variables
    if (
      config.variableTypes.includes(node.type) &&
      (node.parent?.type === 'source_file' || node.parent?.type === 'program')
    ) {
      const name = this.getTreeSitterNodeName(node);
      if (name) {
        const namePath = buildNamePath(parentPath, name);

        const symbol: Symbol = {
          name,
          namePath,
          kind: SymbolKind.Variable,
          location: {
            filepath: relativePath,
            startLine: node.startPosition.row + 1,
            endLine: node.endPosition.row + 1,
            startColumn: node.startPosition.column,
            endColumn: node.endPosition.column,
          },
          depth,
          parentNamePath: parentPath,
        };

        if (includeBody) {
          symbol.body = lines.slice(node.startPosition.row, node.endPosition.row + 1).join('\n');
        }

        symbols.push(symbol);
        return;
      }
    }

    // Recurse into children for other node types
    for (const child of node.children) {
      this.processTreeSitterNode(
        child,
        config,
        lines,
        relativePath,
        parentPath,
        depth,
        symbols,
        includeBody,
        parentClassName
      );
    }
  }

  private getTreeSitterNodeName(node: SyntaxNode): string | undefined {
    // Look for name/identifier child
    for (const child of node.children) {
      if (
        child.type === 'identifier' ||
        child.type === 'name' ||
        child.type === 'type_identifier'
      ) {
        return child.text;
      }
      if (child.type === 'decorated_definition') {
        return this.getTreeSitterNodeName(child);
      }
    }

    const firstNamedChild = node.firstNamedChild;
    if (
      firstNamedChild &&
      (firstNamedChild.type === 'identifier' || firstNamedChild.type === 'name')
    ) {
      return firstNamedChild.text;
    }

    return undefined;
  }
}
