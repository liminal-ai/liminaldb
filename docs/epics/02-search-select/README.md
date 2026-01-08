# Epic 02: Search & Select

**Status:** Planning
**Created:** 2026-01-08
**Depends on:** Epic 01 (CRUD foundation)

---

## Vision

Build a search and select system that feels instant and effortless. Users should be able to find any prompt in their library within milliseconds, using any combination of text search, tags, and semantic similarity. The system should anticipate what users want and surface relevant results before they finish typing.

---

## Design Principles

Inspired by the responsiveness of Superhuman and Linear, without copying specific UI patterns:

| Principle | Meaning |
|-----------|---------|
| **Instant feedback** | Results appear as you type, no loading spinners |
| **Keyboard-first** | Full functionality without touching the mouse |
| **Progressive refinement** | Start broad, narrow down with filters/modifiers |
| **Predictive** | Recently used, frequently accessed, contextually relevant float to top |
| **Minimal friction** | One keystroke to search, one to select, one to use |

---

## Core Capabilities

### 1. Full-Text Search
- Search across slug, name, description, content
- Substring matching (not just prefix)
- Typo tolerance / fuzzy matching
- Highlight matching terms in results

### 2. Tag Filtering
- Combine text search with tag filters
- Tag autocomplete in search input
- Syntax: `tag:workflow` or `#workflow` inline with search terms

### 3. Semantic Search (Future)
- Vector embeddings for prompts
- "Find prompts similar to this one"
- Natural language queries ("prompts for code review")

### 4. Smart Ranking
- Recency: recently viewed/used prompts rank higher
- Frequency: frequently used prompts rank higher
- Relevance: match quality in title > description > content
- Context: prompts used in similar contexts (future)

### 5. User Workspace
- Per-user hot cache of active prompts
- Recently used list
- Favorites / pinned prompts
- Staged prompts (from Epic 01, persisted)

---

## Architecture

### Redis as Hot Layer

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Search Input → Debounced Query → Display Results   ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Fastify API Layer                     │
│  GET /api/search?q=...&tags=...&limit=...               │
└─────────────────────────────────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
┌──────────────────────┐    ┌──────────────────────────────┐
│        Redis         │    │          Convex              │
│  • User workspace    │    │  • Source of truth           │
│  • Search indexes    │    │  • Full prompt data          │
│  • Recent/frequent   │    │  • Tag relationships         │
│  • Vector embeddings │    │  • User ownership            │
└──────────────────────┘    └──────────────────────────────┘
```

### Redis Data Structures

| Key Pattern | Type | Purpose |
|-------------|------|---------|
| `user:{id}:recent` | Sorted Set | Recently accessed prompts (score = timestamp) |
| `user:{id}:frequent` | Sorted Set | Frequently used prompts (score = count) |
| `user:{id}:workspace` | Hash | Cached prompt metadata for fast display |
| `user:{id}:staging` | Hash | Staged prompts from insert mode |
| `search:prompts:{userId}` | RediSearch Index | Full-text search index |
| `vectors:prompts:{userId}` | RedisVL | Vector embeddings (future) |

### Sync Strategy

| Event | Action |
|-------|--------|
| Prompt created | Add to Redis index, add to workspace |
| Prompt updated | Update Redis index, invalidate workspace cache |
| Prompt deleted | Remove from Redis index, remove from workspace |
| Prompt viewed | Update recent set, increment frequent count |
| User login | Warm workspace cache from Convex |

---

## Phases

### Phase 1: Redis Infrastructure
- Redis connection and configuration
- Basic key-value operations
- User workspace cache (recent, frequent)
- Staging persistence (migrate from in-memory)

### Phase 2: Full-Text Search
- RediSearch index setup
- Search API endpoint
- Frontend search integration
- Debounced input, instant results

### Phase 3: Smart Ranking
- Recency/frequency scoring
- Composite ranking algorithm
- Search result ordering
- "Jump to recent" shortcut

### Phase 4: Keyboard Navigation
- Cmd+K command palette
- Arrow key navigation in results
- Enter to select, Esc to close
- Vim-style j/k navigation (optional)

### Phase 5: Advanced Filters
- Tag autocomplete in search
- Filter syntax parsing (`tag:x`, `#x`)
- Saved searches / filters
- Filter persistence in URL

### Phase 6: Semantic Search (Future)
- Embedding generation on prompt save
- Vector similarity search
- "Find similar" feature
- Natural language queries

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Search latency (p95) | < 50ms |
| Time to first result | < 100ms from keypress |
| Keyboard-only workflow | Full CRUD without mouse |
| Cache hit rate | > 90% for active users |

---

## Open Questions

1. **RediSearch vs. Elasticsearch?**
   - RediSearch is simpler, already planning Redis
   - Elasticsearch more powerful but additional infra
   - Start with RediSearch, migrate if needed

2. **Embedding model for semantic search?**
   - OpenAI embeddings (cost per call)
   - Local model (Sentence Transformers)
   - Defer decision until Phase 6

3. **Offline / local-first?**
   - Service worker caching for offline read?
   - Not critical for MVP, consider post-launch

4. **MCP integration?**
   - Same Redis cache serves both web UI and MCP
   - Search API usable from Claude Code
   - Design API to be client-agnostic

---

## References

- [RediSearch Documentation](https://redis.io/docs/stack/search/)
- [RedisVL (Vector Library)](https://github.com/RedisVentures/redisvl)
- Epic 01: `/docs/epics/01-promptdb-insert-get/`
- UI Architecture: `/docs/ui-arch-patterns-design.md`
