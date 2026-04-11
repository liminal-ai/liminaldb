# Prompt 0.R: Verify Infrastructure (Story 0)

**Target Model:** GPT-5.2

**Story:** Infrastructure (Story 0)

**Working Directory:** `/Users/leemoore/promptdb`

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- Story: `docs/epics/02-search-select/stories/story-0-infrastructure/story.md`
- Setup Prompt: `docs/epics/02-search-select/stories/story-0-infrastructure/prompt-0.1-setup.md`

## Objective

Verify the Story 0 infrastructure scaffolding is complete and consistent with the tech design. No feature functionality is expected yet.

## Output Requirements (GPT-5.2)

- Provide a 1-paragraph summary.
- Then provide a checklist with Pass/Fail for each section below.
- If anything fails or is blocked, add a short **Fixes** section with concrete next steps.

---

## Verification Commands

```bash
bun run typecheck
bun run test
```

Optional (only if Convex is available locally):

```bash
bunx convex dev --local
```

## Automated Tests

All existing tests should still pass:

| Test Scope | Expected |
|------------|----------|
| Full suite | 278 tests pass |

## Manual Verification

Not required for infrastructure. Only code inspection and commands above.

## Checklist

### Automated
- [ ] `bun run typecheck` passes
- [ ] `bun run test` passes (278 tests)

### Schema & Migrations
- [ ] `convex/schema.ts` adds optional fields on `prompts` (`searchText`, `pinned`, `favorited`, `usageCount`, `lastUsedAt`)
- [ ] `convex/schema.ts` defines search index `search_prompts` on `searchText` with `filterFields: ["userId"]` and `staged: false`
- [ ] `convex/schema.ts` defines `rankingConfig` table with `by_key` index
- [ ] `convex/migrations/backfillSearchText.ts` exists with `buildSearchText` helper
- [ ] `convex/migrations/migrationStatus.ts` exists
- [ ] `convex/migrations/seedRankingConfig.ts` exists and inserts default config when missing

### Type & API Scaffolding
- [ ] `src/lib/config.ts` exports `redisUrl: optionalEnv("REDIS_URL")`
- [ ] `src/lib/redis.ts` exists and throws `NotImplementedError` in `getRedis`
- [ ] `src/routes/drafts.ts` exists with stub handlers throwing `NotImplementedError`
- [ ] `src/index.ts` registers drafts routes at `/api/drafts`
- [ ] `src/schemas/drafts.ts` defines Draft DTOs and request schemas
- [ ] `src/schemas/prompts.ts` exports `PromptDTOv2`, `PromptMeta`, and ranking schemas
- [ ] `convex/model/ranking.ts` exists with `DEFAULT_RANKING_CONFIG` and stub functions

### Test Utilities
- [ ] `tests/__mocks__/redis.ts` exists (in-memory Redis mock)
- [ ] `tests/fixtures/mockConvexCtx.ts` includes `withSearchIndex` on query builder

---

## Story 0 Complete When

All checklist items pass and no blockers remain.
