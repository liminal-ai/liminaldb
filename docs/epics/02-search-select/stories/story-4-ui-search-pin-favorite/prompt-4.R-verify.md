# Prompt 4.R: Verify UI Search & Pin/Favorite (Story 4)

**Target Model:** GPT-5.2

**Story:** UI Search & Pin/Favorite (Story 4)

**Working Directory:** `/Users/leemoore/promptdb`

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- Story: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/story.md`
- Skeleton Prompt: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/prompt-4.1-skeleton-red.md`
- Green Prompt: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/prompt-4.2-green.md`

## Objective

Verify the UI supports search, ranking display, pin/favorite actions, and usage tracking on copy.

## Output Requirements (GPT-5.2)

- Provide a 1-paragraph summary.
- Then provide a checklist with Pass/Fail for each section below.
- If anything fails or is blocked, add a short **Fixes** section with concrete next steps.

---

## AC Coverage

| AC | Description | Verification Method |
|----|-------------|---------------------|
| AC-1 | Search filters as user types | TC-1 (automated) |
| AC-4 | Empty search shows full list | TC-3 (automated) |
| AC-5 | No matches shows empty state | TC-4 (automated) |
| AC-7 | Search remains responsive | TC-6 (automated) |
| AC-16 | Zero prompts shows CTA | TC-14 (automated) |
| AC-22 | Pin from prompt view | TC-20 (automated) |
| AC-23 | Unpin from prompt view | TC-21 (automated) |
| AC-24 | Favorite from prompt view | TC-22 (automated) |
| AC-25 | Unfavorite from prompt view | TC-23 (automated) |
| AC-26 | Pin/favorite updates are immediate | TC-24 (automated) |
| AC-27 | Pinned icon in list | TC-25 (automated) |
| AC-28 | Favorited icon in list | TC-26 (automated) |

---

## Verification Commands

```bash
bun run typecheck
bun run test --project ui \
  tests/service/ui/prompts-module.test.ts \
  tests/service/ui/shell-history.test.ts
```

## Automated Tests

All of these should PASS:

| Test File | TCs | Expected |
|-----------|-----|----------|
| `tests/service/ui/prompts-module.test.ts` | TC-1, TC-3, TC-4, TC-14, TC-20..26 | 11 tests |
| `tests/service/ui/shell-history.test.ts` | TC-6 | 1 test |
| **Story 4 Total** | | **12 tests** |
| **Running Total** | | **316 tests** |

## Manual Verification

1) **Search + empty states**
- Type into search box; verify list filters immediately.
- Clear search; verify full list returns.
- Use a query with no matches; verify empty state text.

2) **Pin/Favorite**
- Open a prompt, click pin; confirm icon state and list item pin icon.
- Click again to unpin; UI rolls back if API fails.
- Click favorite star; confirm star state and list item star icon.

3) **Copy usage tracking**
- Click copy; verify a POST to `/api/prompts/:slug/usage` is fired (fire-and-forget).

---

## Checklist

### Automated
- [ ] All 12 Story 4 tests pass
- [ ] Running total 316 tests pass
- [ ] `bun run typecheck` passes

### Implementation Details
- [ ] Shell reuses existing `#search-input` and `shell:filter` message
- [ ] Portlet handles `shell:filter` by calling existing `loadPrompts(query, tags)`
- [ ] Pin/favorite buttons set `aria-pressed` for deterministic tests
- [ ] List items render `.prompt-pin` and `.prompt-star` markers
- [ ] Optimistic updates include rollback on API failure
- [ ] Copy action triggers `POST /api/prompts/:slug/usage` with `keepalive: true`

### Manual
- [ ] Search works as expected
- [ ] Pin/favorite toggles and list icons update
- [ ] Copy triggers usage tracking call

---

## Story 4 Complete When

All checklist items pass and no blockers remain.
