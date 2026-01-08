# Story 0: Infrastructure

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`

---

## Purpose

Set up shared infrastructure before feature stories begin. This story creates types, schemas, stubs, and migration tooling that all subsequent stories depend on.

---

## Context

Epic 01 delivered prompt CRUD. Epic 02 adds search, ranking, drafts, and MCP parity. Before implementing features, we need:

- New TypeScript types for ranking, drafts, and extended prompts
- Convex schema changes (new fields on prompts table, new rankingConfig table)
- Redis client wrapper for draft persistence
- Migration utilities for backfilling existing prompts

After this story, the codebase compiles with new types and stubs. No features work yet.

---

## Deliverables

**New files:**

| File | Purpose |
|------|---------|
| `src/lib/redis.ts` | Bun Redis client wrapper (stub) |
| `src/schemas/drafts.ts` | Zod schemas for draft DTOs |
| `src/routes/drafts.ts` | Draft route handlers (stubs) |
| `convex/model/ranking.ts` | Rank score computation (stub) |
| `convex/migrations/backfillSearchText.ts` | Migration for existing prompts |
| `convex/migrations/migrationStatus.ts` | Query to verify migration |

**Modified files:**

| File | Changes |
|------|---------|
| `src/lib/config.ts` | Add `REDIS_URL` env var |
| `src/schemas/prompts.ts` | Add `PromptDTOv2`, `RankingConfig` types |
| `convex/schema.ts` | Add new fields to prompts, add rankingConfig table |
| `src/index.ts` | Register drafts routes |

**Test utilities:**

| File | Purpose |
|------|---------|
| `tests/__mocks__/redis.ts` | In-memory Redis mock for draft tests |
| `tests/fixtures/mockConvexCtx.ts` | Add `withSearchIndex` to mock query builder |

---

## Acceptance Criteria

This is an infrastructure story - no user-facing ACs. Success criteria:

- [ ] `bun run typecheck` passes
- [ ] All new types exported and usable
- [ ] Convex schema deploys without errors
- [ ] Stubs throw `NotImplementedError` when called
- [ ] Existing tests continue to pass

---

## Dependencies

None. This is the first story.

---

## Definition of Done

- All files created per deliverables
- TypeScript compiles
- Convex schema deployed
- Existing 278 tests still pass
- No new tests (infrastructure only)
