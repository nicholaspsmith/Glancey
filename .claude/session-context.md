# Session Context: Ollama Indexing Performance

## Problem Statement
User reported lance-context indexing was too slow in ~/Code/centrifugue (52,016 chunks, initial ETA 3+ hours). System wasn't being taxed.

## Changes Made (Releases 1.15.0 - 1.17.0)

### 1. Configurable Settings (PR #70)
- Added `embedding.ollamaConcurrency` config option (1-200, default 100)
- Added `indexing.batchSize` config option (1-1000, default 200)
- Added ETA display during indexing
- Added dropdown menus in dashboard for both settings

### 2. Batch API Migration (PR #74 - v1.16.0)
- Switched from `/api/embeddings` (single text) to `/api/embed` (batch)
- Ollama's batch API accepts array of texts in one request
- Reduced HTTP requests from 52,000 to ~260 (with batch size 200)
- Requires Ollama 0.2.0+ (documented in README)

### 3. Parallel Batch Processing (PR #76 - v1.17.0)
- Added `concurrency` config to `EmbeddingConfig` in `src/embeddings/types.ts`
- Updated `OllamaBackend.embedBatch()` to process batches in parallel
- Default concurrency: 4 (processes 4 batch requests simultaneously)
- Uses `Promise.all` with chunked batch groups
- Results are correctly ordered regardless of completion order

## Key Files Modified
- `src/embeddings/types.ts` - Added `concurrency` field to EmbeddingConfig
- `src/embeddings/ollama.ts` - Parallel batch processing implementation
- `src/embeddings/index.ts` - Pass concurrency config through
- `src/config.ts` - Added ollamaConcurrency to schema, EmbeddingSettings interface
- `src/dashboard/ui.ts` - Dropdown menus, ETA display, save button visibility
- `src/__tests__/embeddings/ollama.test.ts` - Tests for parallel processing
- `src/__tests__/mocks/fetch.mock.ts` - Added `createOllamaBatchEmbeddingResponse`

## Current Architecture
```
52,000 chunks with batchSize=100, concurrency=4:
- 520 batch requests (52,000 / 100)
- 4 requests sent in parallel
- ~130 parallel cycles instead of 520 sequential
```

## Ollama Configuration
User runs Ollama via macOS GUI app. To set parallel processing on Ollama's side:
```bash
launchctl setenv OLLAMA_NUM_PARALLEL 4
# Then restart Ollama app
```

## Outstanding Items
1. Test v1.17.0 on centrifugue to measure actual improvement
2. Consider documenting `OLLAMA_NUM_PARALLEL` in README if it significantly helps
3. The default Ollama model is `qwen3-embedding:0.6b` (1024 dimensions)

## Dashboard Settings
- Concurrency dropdown: 10, 25, 50, 100 (default), 150, 200
- Batch size dropdown: 32, 50, 100, 200 (default), 500, 1000
- Save button only shows when settings differ from active config

## Test Commands
```bash
npm test -- ollama  # Run Ollama tests
npm test            # Full test suite (1199 tests)
npm run type-check  # TypeScript validation
```

## To Update lance-context
```bash
npm i -g lance-context@1.17.0
# Or for auto-updates:
claude mcp add --scope user --transport stdio lance-context -- npx -y lance-context@latest
```
