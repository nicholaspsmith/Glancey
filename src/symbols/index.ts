/**
 * Symbolic code analysis module.
 * Provides Serena-like symbol navigation and analysis tools.
 */

// Types
export * from './types.js';

// Name path utilities
export * from './name-path.js';

// Symbol extraction
export { SymbolExtractor } from './symbol-extractor.js';

// Pattern search
export { searchForPattern, formatPatternSearchResults } from './pattern-search.js';

// Reference finding
export { ReferenceFinder, formatReferencesResult } from './reference-finder.js';

// Symbol editing
export { SymbolEditor } from './symbol-editor.js';
export type { EditResult, ReplaceSymbolOptions, InsertSymbolOptions } from './symbol-editor.js';

// Symbol renaming
export { SymbolRenamer, formatRenameResult } from './symbol-renamer.js';
export type { RenameResult, RenameSymbolOptions, RenameFileResult } from './symbol-renamer.js';
