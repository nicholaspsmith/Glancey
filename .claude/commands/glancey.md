---
name: glancey
description: Show glancey tool usage tips and quick reference
---

# Use Glancey

You have **glancey** MCP tools available. Stop and switch to them now.

## Instead of grep/ripgrep/find, use:

| Instead of... | Use this glancey tool |
|---|---|
| `grep`/`rg` for searching code | **`search_code`** - natural language semantic search |
| `find`/`fd`/`glob` for finding files | **`search_code`** or **`find_symbol`** |
| Reading many files to understand code | **`summarize_codebase`** + **`list_concepts`** |
| Searching for a function/class name | **`find_symbol`** (supports glob patterns) |
| Checking who calls a function | **`find_referencing_symbols`** |
| Regex search across files | **`search_for_pattern`** |
| Writing code that might already exist | **`search_similar`** first |
| Raw `git commit` | **`commit`** tool (validates branch, message format) |

## Quick reference

- **Explore unfamiliar code**: `summarize_codebase` → `list_concepts` → `search_by_concept`
- **Find code by concept**: `search_code("how does auth work")`
- **Find similar patterns**: `search_similar(code="snippet")` or `search_similar(filepath="file.ts", startLine=10, endLine=25)`
- **Understand a file**: `get_symbols_overview(filepath="file.ts")`
- **Edit symbols**: `replace_symbol_body`, `insert_before_symbol`, `insert_after_symbol`, `rename_symbol`
- **Save context for later**: `write_memory` / `read_memory`

## Check index health

If results seem stale, run `get_index_status` and `index_codebase` if needed.
