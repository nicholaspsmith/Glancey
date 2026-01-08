import * as fs from 'fs/promises';
import * as path from 'path';

export interface LanceContextConfig {
  patterns?: string[];
  excludePatterns?: string[];
}

const DEFAULT_PATTERNS = [
  '**/*.ts',
  '**/*.tsx',
  '**/*.js',
  '**/*.jsx',
  '**/*.py',
  '**/*.go',
  '**/*.rs',
  '**/*.java',
  '**/*.rb',
  '**/*.php',
  '**/*.c',
  '**/*.cpp',
  '**/*.h',
  '**/*.hpp',
  '**/*.cs',
  '**/*.swift',
  '**/*.kt',
];

const DEFAULT_EXCLUDE_PATTERNS = [
  '**/node_modules/**',
  '**/dist/**',
  '**/.git/**',
  '**/build/**',
  '**/target/**',
  '**/__pycache__/**',
  '**/venv/**',
  '**/.venv/**',
  '**/vendor/**',
  '**/*.min.js',
  '**/*.min.css',
];

export const DEFAULT_CONFIG: LanceContextConfig = {
  patterns: DEFAULT_PATTERNS,
  excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
};

const CONFIG_FILENAMES = ['.lance-context.json', 'lance-context.config.json'];

/**
 * Load configuration from project directory
 */
export async function loadConfig(projectPath: string): Promise<LanceContextConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(projectPath, filename);
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const userConfig = JSON.parse(content) as Partial<LanceContextConfig>;

      return {
        patterns: userConfig.patterns || DEFAULT_PATTERNS,
        excludePatterns: userConfig.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
      };
    } catch {
      // Config file doesn't exist or is invalid, continue to next
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Get default patterns
 */
export function getDefaultPatterns(): string[] {
  return [...DEFAULT_PATTERNS];
}

/**
 * Get default exclude patterns
 */
export function getDefaultExcludePatterns(): string[] {
  return [...DEFAULT_EXCLUDE_PATTERNS];
}
