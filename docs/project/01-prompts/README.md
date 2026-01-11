# 01: Prompts

## Milestone: Core Prompt Functionality with API/MCP Parity

**Status:** Complete

## What Was Delivered

Full prompt lifecycle across all surfaces (Web UI, API, MCP):

### Core CRUD
- Create prompts (single and batch)
- Read prompts (by slug, list, search)
- Update prompts (full update, flags)
- Delete prompts

### Data Model
- Prompts with slug, name, description, content, parameters
- Tags (many-to-many with denormalized tagNames)
- Validation (slug format, field limits)

### Search & Ranking
- Full-text search (Convex search index on searchText)
- Smart ranking (usage, recency, pinned, favorited)
- Tag filtering (ANY-of selected tags)
- Configurable ranking weights

### Organization
- Pin prompts (always at top)
- Favorite prompts (boosted ranking)
- Usage tracking (count + lastUsedAt)

### Durable Drafts
- Redis-backed drafts (24h TTL)
- Survives browser refresh
- Cross-tab sync via polling
- Draft indicator in shell header

### API Endpoints
- `/api/prompts` - GET (list), POST (create)
- `/api/prompts/:slug` - GET, PUT, DELETE
- `/api/prompts/tags` - GET (unique tags)
- `/api/drafts` - Full draft management

### MCP Tools (Parity with API)
- `save_prompts` - batch create
- `get_prompt` - retrieve by slug
- `list_prompts` - ranked list
- `search_prompts` - query + tag filter
- `update_prompt` - modify existing
- `delete_prompt` - remove
- `list_tags` - user's tags
- `track_prompt_use` - record usage

### Web UI
- Prompts portlet with list/detail view
- Prompt viewer (rendered/semantic/plain modes)
- Prompt editor with validation
- Line edit mode
- Tag picker in shell header
- Search in shell header

## Features in This Group

| Feature | Description | Status |
|---------|-------------|--------|
| [01-promptdb-insert-get](./01-promptdb-insert-get/) | Core CRUD, batch insert, Web UI | Complete |
| [02-search-select](./02-search-select/) | Search, ranking, pin/favorite, drafts, MCP parity | Complete |

## Test Coverage

341 tests across:
- Service tests (mocked dependencies)
- Convex function tests
- Integration tests (real HTTP)
- UI component tests (jsdom)
