# Prompt 5.R: Verify UI Durable Drafts (Story 5)

**Target Model:** GPT-5.2

**Story:** UI Durable Drafts (Story 5)

**Working Directory:** `/Users/leemoore/promptdb`

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- Story: `docs/epics/02-search-select/stories/story-5-ui-drafts/story.md`
- Skeleton Prompt: `docs/epics/02-search-select/stories/story-5-ui-drafts/prompt-5.1-skeleton-red.md`
- Green Prompt: `docs/epics/02-search-select/stories/story-5-ui-drafts/prompt-5.2-green.md`

## Objective

Verify draft persistence and UI behavior: indicators, cross-tab polling, save/discard, and expiration warnings.

## Output Requirements (GPT-5.2)

- Provide a 1-paragraph summary.
- Then provide a checklist with Pass/Fail for each section below.
- If anything fails or is blocked, add a short **Fixes** section with concrete next steps.

---

## AC Coverage

| AC | Description | Verification Method |
|----|-------------|---------------------|
| AC-29 | Edit mode auto-saves draft | TC-27 (automated) |
| AC-30 | Line edits saved as draft | TC-28 (automated) |
| AC-31 | Multiple line edits accumulate in same draft | TC-29 (automated) |
| AC-32 | New prompt entries saved as draft | TC-30 (automated) |
| AC-33 | Multiple new drafts can exist | TC-31 (automated) |
| AC-35 | Cross-tab draft visibility | TC-33 (automated) |
| AC-36 | Unsaved changes indicator appears | TC-34 (automated) |
| AC-37 | Indicator click navigates to draft | TC-35 (automated) |
| AC-40 | Save failure preserves draft | TC-38 (automated) |
| AC-42 | Expiration warning shown | TC-40 (automated) |

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
| `tests/service/ui/prompts-module.test.ts` | TC-27..31, TC-35, TC-38, TC-40 | 8 tests |
| `tests/service/ui/shell-history.test.ts` | TC-33..34 | 2 tests |
| **Story 5 Total** | | **10 tests** |
| **Running Total** | | **326 tests** |

## Manual Verification

1) **Edit mode draft**
- Open a prompt, edit fields, and confirm draft indicator appears.
- Refresh page; draft remains and content restored.

2) **Line edits accumulate**
- Use line edit on multiple lines; confirm a single draft ID tracks all edits.

3) **Cross-tab**
- Open second tab and confirm indicator appears from first tab drafts.

4) **Save/Discard**
- Click Save: draft clears and prompt persists.
- Click Discard: draft clears and prompt unchanged.
- Simulate save failure: draft remains and indicator stays.

5) **Expiration warning (explicit steps)**
- Create a draft via UI (or call `PUT /api/drafts/:draftId`).
- Identify the Redis key for the draft:
  ```bash
  redis-cli KEYS "liminal:draft:*"
  ```
- Set TTL to 1 hour to trigger warning window:
  ```bash
  redis-cli EXPIRE "liminal:draft:{userId}:{draftId}" 3600
  ```
- Refresh UI and confirm warning appears.

---

## Checklist

### Automated
- [ ] All 10 Story 5 tests pass
- [ ] Running total 326 tests pass
- [ ] `bun run typecheck` passes

### Implementation Details
- [ ] Shell polls `/api/drafts/summary` every 15s
- [ ] Shell emits `shell:drafts:open` on indicator click
- [ ] Portlet listens for `shell:drafts:open` and loads draft
- [ ] Portlet posts `portlet:drafts` updates when drafts change
- [ ] Draft IDs are stable per prompt (`edit:{slug}`) and per new draft (`new:{uuid}`)
- [ ] Save and discard correctly call draft APIs and update UI state

### Manual
- [ ] Drafts persist across refresh
- [ ] Indicator appears and navigates correctly
- [ ] Cross-tab indicator works
- [ ] Save/discard behavior correct
- [ ] Expiration warning shown near TTL

---

## Story 5 Complete When

All checklist items pass and no blockers remain.
