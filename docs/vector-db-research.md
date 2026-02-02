# Vector Database Alternatives Research

## Current State: LanceDB

**Package:** `@lancedb/lancedb` (v0.23.0)
**License:** Apache-2.0
**Architecture:** Rust core with native bindings for Node.js

### Current Usage in Glancey
- `connect()` - Database connection
- `createTable()` / `openTable()` - Table management
- `table.add()` - Insert rows
- `table.search()` - Vector similarity search with cosine distance

### Known Issues
1. **Native binding problems** - Platform-specific `.node` files cause issues:
   - Windows: `vectordb-win32-x64-msvc` loading failures
   - Linux ARM64: musl library not found
   - esbuild: Native module resolution issues for VSCode extensions
2. **Large binary size** - Native binaries for each platform
3. **Complex deployment** - Optional dependencies for all platforms bloat package-lock.json

---

## Evaluation Criteria

| Criteria | Weight | Description |
|----------|--------|-------------|
| Embedded | High | No separate server process required |
| npm available | High | Easy installation via npm |
| Cross-platform | High | macOS, Linux, Windows support |
| Pure JS option | Medium | Avoid native bindings if possible |
| Performance | Medium | Fast vector search |
| Bundle size | Medium | Reasonable dependency weight |
| License | Medium | MIT or Apache preferred |
| Active maintenance | Medium | Recent updates, responsive maintainers |

---

## Candidates Evaluated

### 1. sqlite-vec ⭐ Recommended

**Package:** `sqlite-vec` (v0.1.7-alpha.2)
**License:** MIT OR Apache-2.0
**Architecture:** SQLite extension with native bindings

**Pros:**
- ✅ Truly embedded (file-based like SQLite)
- ✅ npm package available
- ✅ Cross-platform (macOS, Linux, Windows binaries included)
- ✅ Uses familiar SQLite API
- ✅ Works with better-sqlite3, node-sqlite3, bun:sqlite
- ✅ Small package size (4.6 KB + platform binaries)
- ✅ Active development by Alex Garcia

**Cons:**
- ⚠️ Still in alpha (0.1.7-alpha.2)
- ⚠️ Native bindings (but same issue as LanceDB)
- ⚠️ Less feature-rich than LanceDB (no built-in full-text search fusion)

**Migration Effort:** Medium - Different API, but same embedded model

---

### 2. Vectra ⭐ Strong Alternative

**Package:** `vectra` (v0.12.3)
**License:** MIT
**Architecture:** Pure TypeScript, file-based

**Pros:**
- ✅ **Pure TypeScript** - No native bindings!
- ✅ Truly embedded (folder on disk with JSON files)
- ✅ Cross-platform (runs anywhere Node.js runs)
- ✅ Simple API similar to Pinecone
- ✅ Supports BM25 hybrid search
- ✅ Document-level operations with chunking

**Cons:**
- ⚠️ **Loads entire index into memory** - Not suitable for very large codebases
- ⚠️ More dependencies (axios, cheerio, gpt-tokenizer)
- ⚠️ Slower than native implementations for large datasets

**Migration Effort:** Medium - API is different but conceptually similar

**Best For:** Smaller codebases, situations where native bindings are problematic

---

### 3. Chroma ❌ Not Recommended

**Package:** `chromadb`
**License:** Apache-2.0
**Architecture:** Python server with JS client

**Pros:**
- ✅ Popular and well-documented
- ✅ Rich feature set

**Cons:**
- ❌ **Requires separate server process** - Not embedded in JS
- ❌ JavaScript client is REST-only (connects to backend)
- ❌ Would require Python runtime for embedded mode

**Verdict:** Not suitable - requires external server

---

### 4. Qdrant ❌ Not Recommended

**Package:** `@qdrant/js-client-rest`
**License:** Apache-2.0
**Architecture:** Rust server with JS REST client

**Pros:**
- ✅ High performance
- ✅ Good TypeScript SDK

**Cons:**
- ❌ **Requires separate server** (Docker or standalone)
- ❌ Embedded mode only available in Python
- ❌ Qdrant Edge (embedded) is in private beta

**Verdict:** Not suitable - requires external server

---

### 5. Milvus Lite ❌ Not Recommended

**Package:** `@zilliz/milvus2-sdk-node`
**License:** Apache-2.0
**Architecture:** Python-based Milvus Lite with JS client

**Pros:**
- ✅ Full-featured vector database
- ✅ Enterprise-grade

**Cons:**
- ❌ **Milvus Lite not available for JavaScript/TypeScript**
- ❌ Requires Python runtime to run Milvus Lite server
- ❌ JS SDK connects to running server only

**Verdict:** Not suitable - no JS embedded mode

---

### 6. Turbopuffer ❌ Not Recommended

**Package:** `@turbopuffer/turbopuffer`
**Architecture:** Cloud-only

**Pros:**
- ✅ Very fast
- ✅ Good TypeScript SDK

**Cons:**
- ❌ **Cloud-only** - Not embedded/local
- ❌ Requires internet connection
- ❌ Not free

**Verdict:** Not suitable - not local/embedded

---

### 7. VectorDB.js (Bonus)

**Package:** `@themaximalist/vectordb.js`
**License:** MIT
**Architecture:** Pure JavaScript, in-memory

**Pros:**
- ✅ Pure JavaScript
- ✅ Simple API
- ✅ No dependencies

**Cons:**
- ⚠️ In-memory only (no persistence built-in)
- ⚠️ Less mature
- ⚠️ Limited features

**Best For:** Simple use cases, prototyping

---

## Recommendation Summary

| Option | Embedded | Pure JS | Cross-platform | Recommendation |
|--------|----------|---------|----------------|----------------|
| **LanceDB (current)** | ✅ | ❌ | ✅ | ⭐ **Keep** - Best maintained, feature-complete |
| sqlite-vec | ✅ | ❌ | ✅ | ❌ Unmaintained (~1 year stale) |
| Vectra | ✅ | ✅ | ✅ | ⚠️ Memory limits for large codebases |
| Chroma | ❌ | - | - | ❌ Requires server |
| Qdrant | ❌ | - | - | ❌ Requires server |
| Milvus Lite | ❌ | - | - | ❌ No JS embedded |
| Turbopuffer | ❌ | - | - | ❌ Cloud only |

## Conclusion

**Decision: Keep LanceDB**

After evaluating all alternatives, LanceDB remains the best choice:

| Factor | LanceDB | sqlite-vec | Vectra |
|--------|---------|------------|--------|
| Last commit | 3 days ago | ~1 year ago | Sporadic |
| Maintenance | Very active | **Stale** | Low activity |
| Large codebases | ✅ Designed for it | ✅ SQLite scales | ⚠️ Memory limits |
| Native bindings | Yes (Rust) | Yes (C) | No (pure JS) |
| Features | Rich (hybrid search, FTS) | Basic vectors | Basic vectors |

### Reasons

1. **Active maintenance** - LanceDB has daily commits and responsive maintainers
2. **sqlite-vec is unmaintained** - No commits in ~1 year, still in alpha
3. **Vectra memory limitations** - Loads entire index into memory, unsuitable for large codebases
4. **Feature completeness** - LanceDB provides hybrid search, full-text search, and advanced filtering
5. **Native bindings are unavoidable** - sqlite-vec has the same challenge; only Vectra avoids it but with significant trade-offs

### Potential Improvements

To improve resilience with LanceDB:
1. Add graceful error handling when native bindings fail to load
2. Provide clearer error messages pointing users to platform-specific fixes
3. Document known platform issues in README

## Sources

- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec)
- [sqlite-vec npm](https://www.npmjs.com/package/sqlite-vec)
- [Vectra GitHub](https://github.com/Stevenic/vectra)
- [Vectra npm](https://www.npmjs.com/package/vectra)
- [Chroma GitHub](https://github.com/chroma-core/chroma)
- [Qdrant JS SDK](https://github.com/qdrant/qdrant-js)
- [Milvus Node SDK Issue #354](https://github.com/milvus-io/milvus-sdk-node/issues/354)
- [LanceDB GitHub Issues](https://github.com/lancedb/lancedb/issues)
