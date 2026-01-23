import type { EmbeddingBackend, EmbeddingConfig } from './types.js';
import { chunkArray } from './types.js';
import { fetchWithRetry } from './retry.js';

/** Default parallel batch size for Ollama (concurrent requests) */
const DEFAULT_BATCH_SIZE = 10;

/**
 * Ollama embedding backend
 * Uses local Ollama server for embeddings
 */
export class OllamaBackend implements EmbeddingBackend {
  name = 'ollama';
  private model: string;
  private baseUrl: string;
  private dimensions = 768; // nomic-embed-text default
  private batchSize: number;

  constructor(config: EmbeddingConfig) {
    this.model = config.model || 'nomic-embed-text';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
  }

  async initialize(): Promise<void> {
    // Test connection
    try {
      const response = await fetchWithRetry(`${this.baseUrl}/api/tags`, {});
      if (!response.ok) {
        throw new Error(`Ollama server returned ${response.status}`);
      }
    } catch (error) {
      throw new Error(`Failed to connect to Ollama at ${this.baseUrl}: ${error}`);
    }
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetchWithRetry(`${this.baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.status}`);
    }

    const data = (await response.json()) as { embedding: number[] };
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Ollama doesn't have native batch API, so we parallelize with controlled concurrency
    // to avoid overwhelming the server with too many concurrent requests
    const chunks = chunkArray(texts, this.batchSize);
    const results: number[][] = [];

    for (const chunk of chunks) {
      // Process each chunk in parallel, but chunks sequentially
      const chunkResults = await Promise.all(chunk.map((t) => this.embed(t)));
      results.push(...chunkResults);
    }

    return results;
  }

  getDimensions(): number {
    return this.dimensions;
  }

  getModel(): string {
    return this.model;
  }
}
