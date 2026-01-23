import * as fs from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

/**
 * Zod schema for configuration validation
 */
const ChunkingConfigSchema = z.object({
  maxLines: z.number().min(10).max(500).optional(),
  overlap: z.number().min(0).max(50).optional(),
});

const SearchConfigSchema = z.object({
  semanticWeight: z.number().min(0).max(1).optional(),
  keywordWeight: z.number().min(0).max(1).optional(),
});

const EmbeddingConfigSchema = z.object({
  backend: z.enum(['jina', 'ollama']).optional(),
  model: z.string().optional(),
});

const DashboardConfigSchema = z.object({
  enabled: z.boolean().optional(),
  port: z.number().min(1024).max(65535).optional(),
  openBrowser: z.boolean().optional(),
});

const ConfigSchema = z.object({
  patterns: z.array(z.string()).optional(),
  excludePatterns: z.array(z.string()).optional(),
  embedding: EmbeddingConfigSchema.optional(),
  chunking: ChunkingConfigSchema.optional(),
  search: SearchConfigSchema.optional(),
  dashboard: DashboardConfigSchema.optional(),
  instructions: z.string().optional(),
});

export type LanceContextConfig = z.infer<typeof ConfigSchema>;
export type ChunkingConfig = z.infer<typeof ChunkingConfigSchema>;
export type SearchConfig = z.infer<typeof SearchConfigSchema>;
export type DashboardConfig = z.infer<typeof DashboardConfigSchema>;

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

/**
 * Default chunking configuration
 */
export const DEFAULT_CHUNKING: Required<ChunkingConfig> = {
  maxLines: 100,
  overlap: 20,
};

/**
 * Default search configuration
 */
export const DEFAULT_SEARCH: Required<SearchConfig> = {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
};

/**
 * Default dashboard configuration
 */
export const DEFAULT_DASHBOARD: Required<DashboardConfig> = {
  enabled: true,
  port: 24300,
  openBrowser: true,
};

export const DEFAULT_CONFIG: LanceContextConfig = {
  patterns: DEFAULT_PATTERNS,
  excludePatterns: DEFAULT_EXCLUDE_PATTERNS,
  chunking: DEFAULT_CHUNKING,
  search: DEFAULT_SEARCH,
  dashboard: DEFAULT_DASHBOARD,
};

const CONFIG_FILENAMES = ['.lance-context.json', 'lance-context.config.json'];

/**
 * Load and validate configuration from project directory
 */
export async function loadConfig(projectPath: string): Promise<LanceContextConfig> {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(projectPath, filename);
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const rawConfig = JSON.parse(content);

      // Validate with Zod
      const result = ConfigSchema.safeParse(rawConfig);
      if (!result.success) {
        console.error(`[lance-context] Invalid config in ${filename}: ${result.error.message}`);
        continue;
      }

      const userConfig = result.data;

      return {
        patterns: userConfig.patterns || DEFAULT_PATTERNS,
        excludePatterns: userConfig.excludePatterns || DEFAULT_EXCLUDE_PATTERNS,
        embedding: userConfig.embedding,
        chunking: {
          ...DEFAULT_CHUNKING,
          ...userConfig.chunking,
        },
        search: {
          ...DEFAULT_SEARCH,
          ...userConfig.search,
        },
        dashboard: {
          ...DEFAULT_DASHBOARD,
          ...userConfig.dashboard,
        },
        instructions: userConfig.instructions,
      };
    } catch {
      // Config file doesn't exist or is invalid JSON, continue to next
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Get default file patterns
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

/**
 * Get chunking config with defaults
 */
export function getChunkingConfig(config: LanceContextConfig): Required<ChunkingConfig> {
  return {
    ...DEFAULT_CHUNKING,
    ...config.chunking,
  };
}

/**
 * Get search config with defaults
 */
export function getSearchConfig(config: LanceContextConfig): Required<SearchConfig> {
  return {
    ...DEFAULT_SEARCH,
    ...config.search,
  };
}

/**
 * Get dashboard config with defaults
 */
export function getDashboardConfig(config: LanceContextConfig): Required<DashboardConfig> {
  return {
    ...DEFAULT_DASHBOARD,
    ...config.dashboard,
  };
}

/**
 * Get project instructions from config
 */
export function getInstructions(config: LanceContextConfig): string | undefined {
  return config.instructions;
}

/**
 * Secrets stored separately from main config (should be gitignored)
 */
export interface LanceContextSecrets {
  jinaApiKey?: string;
}

/**
 * Load secrets from .lance-context/secrets.json
 */
export async function loadSecrets(projectPath: string): Promise<LanceContextSecrets> {
  const secretsPath = path.join(projectPath, '.lance-context', 'secrets.json');
  try {
    const content = await fs.readFile(secretsPath, 'utf-8');
    return JSON.parse(content) as LanceContextSecrets;
  } catch {
    return {};
  }
}

/**
 * Save secrets to .lance-context/secrets.json
 */
export async function saveSecrets(
  projectPath: string,
  secrets: LanceContextSecrets
): Promise<void> {
  const lanceDir = path.join(projectPath, '.lance-context');
  const secretsPath = path.join(lanceDir, 'secrets.json');

  // Ensure .lance-context directory exists
  await fs.mkdir(lanceDir, { recursive: true });

  // Load existing secrets and merge
  const existing = await loadSecrets(projectPath);
  const merged = { ...existing, ...secrets };

  await fs.writeFile(secretsPath, JSON.stringify(merged, null, 2));
}

/**
 * Embedding settings for dashboard configuration
 */
export interface EmbeddingSettings {
  backend: 'jina' | 'ollama';
  apiKey?: string;
  ollamaUrl?: string;
}

/**
 * Save embedding settings from dashboard
 * - Stores backend preference in .lance-context.json
 * - Stores API key in .lance-context/secrets.json (gitignored)
 */
export async function saveEmbeddingSettings(
  projectPath: string,
  settings: EmbeddingSettings
): Promise<void> {
  // Load existing config
  const configPath = path.join(projectPath, '.lance-context.json');
  let existingConfig: LanceContextConfig = {};

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    existingConfig = JSON.parse(content);
  } catch {
    // File doesn't exist, start fresh
  }

  // Update embedding config
  existingConfig.embedding = {
    ...existingConfig.embedding,
    backend: settings.backend,
  };

  // Save config
  await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));

  // Save API key to secrets if provided
  if (settings.apiKey) {
    await saveSecrets(projectPath, { jinaApiKey: settings.apiKey });
  }
}

/**
 * Get current embedding settings including secrets
 */
export async function getEmbeddingSettings(projectPath: string): Promise<{
  backend: 'jina' | 'ollama' | 'auto';
  hasApiKey: boolean;
  ollamaUrl?: string;
}> {
  const config = await loadConfig(projectPath);
  const secrets = await loadSecrets(projectPath);

  return {
    backend: config.embedding?.backend || 'auto',
    hasApiKey: !!(secrets.jinaApiKey || process.env.JINA_API_KEY),
    ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  };
}
