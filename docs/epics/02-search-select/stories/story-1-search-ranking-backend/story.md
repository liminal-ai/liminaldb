# Story 1: Search & Ranking Backend

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`

---

## User Story

**As a** prompt power user,
**I want** the backend to support search, ranking, pin/favorite, and usage tracking,
**So that** the UI and MCP can query prompts with these capabilities.

---

## Context

With infrastructure in place from Story 0, this story implements the Convex data layer and Fastify API for search and ranking. After this story:

- Full-text search works via Convex search index
- Prompts are ranked by usage, recency, pin, and favorite
- API supports search query params, flags endpoint, usage tracking
- Migration backfills existing prompts with new fields

This is backend-only. UI comes in Story 4.

---

## Scope

**In scope:**
- Convex: `searchPrompts()`, `listPromptsRanked()`, `updatePromptFlags()`, `trackPromptUse()`
- Convex: `buildSearchText()`, `computeRankScore()`, `getRankingConfig()`
- Convex: Migration backfill execution
- API: Search/list with `q`, `tags`, `limit` params
- API: `PATCH /api/prompts/:slug/flags`
- API: `POST /api/prompts/:slug/usage`
- API: `GET /api/prompts/tags`

**Out of scope:**
- UI changes (Story 4)
- MCP tools (Story 2)
- Draft persistence (Story 3)

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-2 | Search matches prompts where query appears in slug, name, description, or content |
| AC-3 | Search is case-insensitive |
| AC-6 | Search can be combined with tag filter (ANY-of selected tags) |
| AC-8 | Prompt list is sorted by ranking score by default |
| AC-9 | Pinned prompts always appear at top of list |
| AC-10 | Among pinned prompts, sort by ranking score |
| AC-11 | Favorited prompts rank higher than non-favorited |
| AC-12 | Frequently used prompts rank higher than rarely used |
| AC-13 | Recently used prompts rank higher than stale prompts |
| AC-14 | Prompts never used appear lower than used prompts |
| AC-15 | Ranking behavior can be tuned to improve relevance over time |
| AC-17 | Copying or running a prompt increments its usage count |
| AC-18 | Copying or running a prompt updates its last-used timestamp |
| AC-19 | Listing prompts does not increment usage |
| AC-20 | Searching prompts does not increment usage |

**Note:** Backend supports pin/favorite flags via `updatePromptFlags()` mutation and `PATCH /flags` endpoint. User-facing ACs for pin/favorite (AC-22..28) are in Story 4 (UI).

---

## Test Conditions

| TC | Condition | ACs |
|----|-----------|-----|
| TC-2 | Given prompt with "SQL" in name, when searching "sql", then prompt appears | AC-3 |
| TC-5 | Given prompts with tags, when searching with tag filter, then ANY-of matching | AC-6 |
| TC-7 | Given prompts with varying usage, when list displayed, then sorted by ranking | AC-8 |
| TC-8 | Given pinned prompt with low usage, then appears above high-usage unpinned | AC-9 |
| TC-9 | Given multiple pinned prompts, then sorted by score among themselves | AC-10 |
| TC-10 | Given favorited and non-favorited with similar usage, then favorited higher | AC-11 |
| TC-11 | Given high-usage and low-usage prompts, then high-usage ranks higher | AC-12 |
| TC-12 | Given recently-used and stale prompts, then recent ranks higher | AC-13 |
| TC-13 | Given never-used prompt, then appears below used prompts | AC-14 |
| TC-15 | Given prompt usage tracked, then usage count incremented | AC-17 |
| TC-16 | Given prompt usage tracked, then last-used timestamp updated | AC-18 |
| TC-17 | Given prompt list requested, then usage counts unchanged | AC-19 |
| TC-18 | Given search performed, then usage counts unchanged | AC-20 |

---

## Dependencies

- **Story 0 must be complete** — Types, schemas, and stubs exist

---

## Deliverables

**New files:**

| File | Tests |
|------|-------|
| `tests/convex/prompts/ranking.test.ts` | TC-7..13 (7 tests) |
| `tests/convex/prompts/searchPrompts.test.ts` | TC-2 (1 test) |
| `tests/convex/prompts/usageTracking.test.ts` | TC-15..16 (2 tests) |

**Modified files:**

| File | Changes |
|------|---------|
| `convex/prompts.ts` | Implement queries/mutations |
| `convex/model/prompts.ts` | Implement search, ranking, flags, and usage helpers |
| `convex/model/ranking.ts` | Implement `computeRankScore()`, `rerank()`, `getRankingConfig()` |
| `convex/migrations/backfillSearchText.ts` | Implement backfill mutation |
| `convex/migrations/migrationStatus.ts` | Implement verification query |
| `src/routes/prompts.ts` | Add search params, flags route, usage route, tags route |
| `tests/service/prompts/listPrompts.test.ts` | TC-5, TC-17, TC-18 (3 tests) |

---

## Definition of Done

**Test counts:**
- `ranking.test.ts`: 7 tests
- `searchPrompts.test.ts`: 1 test
- `usageTracking.test.ts`: 2 tests
- `listPrompts.test.ts`: 3 additional tests
- **Total new tests: 13**

**Running total:** 278 + 13 = 291 tests

**Verification:**
- All 291 tests pass
- Migration backfill completes (all prompts have searchText, defaults)
- Manual: Search via API returns expected results
- Manual: Flags endpoint updates pinned/favorited
