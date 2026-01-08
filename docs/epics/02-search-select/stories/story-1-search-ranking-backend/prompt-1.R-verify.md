# Prompt 1.R: Verify Search & Ranking Backend (Story 1)

**Target Model:** GPT-5.2

**Story:** Search & Ranking Backend (Story 1)

**Working Directory:** `/Users/leemoore/promptdb`

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- Story: `docs/epics/02-search-select/stories/story-1-search-ranking-backend/story.md`
- Skeleton Prompt: `docs/epics/02-search-select/stories/story-1-search-ranking-backend/prompt-1.1-skeleton-red.md`
- Green Prompt: `docs/epics/02-search-select/stories/story-1-search-ranking-backend/prompt-1.2-green.md`

## Objective

Verify Story 1 backend search, ranking, flags, and usage tracking are fully implemented and conform to the tech design.

## Output Requirements (GPT-5.2)

- Provide a 1-paragraph summary.
- Then provide a checklist with Pass/Fail for each section below.
- If anything fails or is blocked, add a short **Fixes** section with concrete next steps.

---

## AC Coverage

| AC | Description | Verification Method |
|----|-------------|---------------------|
| AC-2 | Search matches slug/name/description/content | TC-2 (automated) |
| AC-3 | Search is case-insensitive | TC-2 (automated) |
| AC-6 | Search supports ANY-of tag filter | TC-5 (automated) |
| AC-8 | Default list sorted by ranking | TC-7 (automated) |
| AC-9 | Pinned prompts appear at top | TC-8 (automated) |
| AC-10 | Pinned prompts sorted by score | TC-9 (automated) |
| AC-11 | Favorited prompts rank higher | TC-10 (automated) |
| AC-12 | High-usage prompts rank higher | TC-11 (automated) |
| AC-13 | Recent prompts rank higher | TC-12 (automated) |
| AC-14 | Never-used prompts rank lower | TC-13 (automated) |
| AC-15 | Ranking config tunable | Code inspection |
| AC-17 | Usage count increments on copy/run | TC-15 (automated) |
| AC-18 | lastUsedAt updated on copy/run | TC-16 (automated) |
| AC-19 | Listing prompts does not increment usage | TC-17 (automated) |
| AC-20 | Searching prompts does not increment usage | TC-18 (automated) |

---

## Verification Commands

```bash
bun run typecheck
bun run test --project service \
  tests/convex/prompts/ranking.test.ts \
  tests/convex/prompts/searchPrompts.test.ts \
  tests/convex/prompts/usageTracking.test.ts \
  tests/service/prompts/listPrompts.test.ts
```

## Automated Tests

All of these should PASS:

| Test File | TCs | Expected |
|-----------|-----|----------|
| `tests/convex/prompts/ranking.test.ts` | TC-7..13 | 7 tests |
| `tests/convex/prompts/searchPrompts.test.ts` | TC-2 | 1 test |
| `tests/convex/prompts/usageTracking.test.ts` | TC-15..16 | 2 tests |
| `tests/service/prompts/listPrompts.test.ts` | TC-5, TC-17, TC-18 | 3 tests |
| **Story 1 Total** | | **13 tests** |
| **Running Total** | | **291 tests** |

## Manual Verification

Requires an authenticated session or bearer token.

1) **Search via API** (AC-2, AC-3, AC-6)
- Start server (`bun run dev`) in another terminal.
- Call `GET /api/prompts?q=sql&tags=tag-a,tag-b&limit=20`.
- Confirm results are filtered (case-insensitive) and tags are ANY-of.

2) **Flags + usage endpoints** (AC-17..20)
- `PATCH /api/prompts/:slug/flags` with `{ pinned: true, favorited: true }`.
- `POST /api/prompts/:slug/usage` and confirm `usageCount` and `lastUsedAt` change.
- Verify `GET /api/prompts` does not change usage values.

---

## Checklist

### Automated
- [ ] All 13 Story 1 tests pass
- [ ] Running total 291 tests pass
- [ ] `bun run typecheck` passes

### Implementation Details
- [ ] `searchText` is built from slug/name/description/content and lowercased
- [ ] `searchPrompts` uses `withSearchIndex("search_prompts", ...)` and filters by `userId`
- [ ] `listPromptsRanked` does not update usage fields
- [ ] `searchPrompts` does not update usage fields
- [ ] `trackPromptUse` increments `usageCount` and updates `lastUsedAt`
- [ ] `getRankingConfig` reads `rankingConfig` row keyed by `global` and falls back to defaults if missing
- [ ] `searchRerankLimit` is enforced before reranking
- [ ] `PATCH /api/prompts/:slug/flags` updates `pinned`/`favorited` only
- [ ] `GET /api/prompts/tags` returns unique tag names

### Manual
- [ ] API search behaves as expected
- [ ] Flags endpoint updates pinned/favorited
- [ ] Usage endpoint increments usage and updates timestamp

---

## Story 1 Complete When

All checklist items pass and no blockers remain.
