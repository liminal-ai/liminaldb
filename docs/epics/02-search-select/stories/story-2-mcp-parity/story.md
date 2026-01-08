# Story 2: MCP Parity

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`

---

## User Story

**As a** user in Claude Code, Cursor, or VS Code,
**I want** MCP tools for listing, searching, updating prompts, and tracking usage,
**So that** I have the same capabilities as the web UI from chat surfaces.

---

## Context

Story 1 implemented the Convex queries and Fastify routes for search/ranking. This story exposes those capabilities via MCP tools. After this story:

- `list_prompts` returns ranked prompts with optional limit
- `search_prompts` accepts query and tags filter
- `list_tags` returns user's unique tags
- `update_prompt` modifies existing prompts
- `track_prompt_use` increments usage (for AI assistants to call after using a prompt)

MCP clients (Claude Code, Cursor, etc.) have full parity with web UI for prompt management.

---

## Scope

**In scope:**
- MCP tool: `list_prompts`
- MCP tool: `search_prompts`
- MCP tool: `list_tags`
- MCP tool: `update_prompt`
- MCP tool: `track_prompt_use`
- Error handling with clear messages

**Out of scope:**
- UI changes (Story 4)
- Draft persistence (Story 3)
- `run_prompt` tool (deferred)

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-43 | MCP tool `list_prompts` returns prompts sorted by ranking |
| AC-44 | MCP tool `list_prompts` accepts optional limit parameter |
| AC-45 | MCP tool `search_prompts` accepts query and returns matches |
| AC-46 | MCP tool `search_prompts` accepts optional tags filter |
| AC-47 | MCP tool `list_tags` returns user's unique tags |
| AC-48 | MCP tool `update_prompt` modifies existing prompt by slug |
| AC-49 | Users receive clear error messages when MCP operations fail |
| AC-50 | MCP tool `track_prompt_use` increments usage count and updates last-used timestamp |
| AC-21 | Usage tracking works identically via web UI and MCP |

---

## Test Conditions

| TC | Condition | ACs |
|----|-----------|-----|
| TC-19 | Given MCP `track_prompt_use` called, then usage tracked same as web copy | AC-21, AC-50 |
| TC-41 | Given MCP client, when `list_prompts` called, then ranked prompts returned | AC-43 |
| TC-42 | Given MCP client, when `list_prompts` called with limit, then limited results | AC-44 |
| TC-43 | Given MCP client, when `search_prompts` called with query, then matches returned | AC-45 |
| TC-44 | Given MCP client, when `search_prompts` called with tags, then filtered results | AC-46 |
| TC-45 | Given MCP client, when `list_tags` called, then user's tags returned | AC-47 |
| TC-46 | Given MCP client, when `update_prompt` called, then prompt updated | AC-48 |
| TC-47 | Given MCP operation fails, then user receives clear error message | AC-49 |
| TC-48 | Given MCP client, when `track_prompt_use` called, then usage incremented | AC-50 |

---

## Dependencies

- **Story 1 must be complete** — Convex queries for search/ranking exist

---

## Deliverables

**Modified files:**

| File | Changes |
|------|---------|
| `src/lib/mcp.ts` | Register 5 new tools |
| `tests/service/prompts/mcpTools.test.ts` | TC-19, TC-41..48 (9 tests) |

---

## Definition of Done

**Test counts:**
- `mcpTools.test.ts`: 9 new tests
- **Total new tests: 9**

**Running total:** 291 + 9 = 300 tests

**Verification:**
- All 300 tests pass
- Manual: `list_prompts` via MCP returns ranked list
- Manual: `search_prompts` via MCP filters correctly
- Manual: `track_prompt_use` via MCP increments usage
