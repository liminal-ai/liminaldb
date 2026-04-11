# Story 5: UI Durable Drafts

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- UI Architecture: `docs/ui-arch-patterns-design.md`

---

## User Story

**As a** prompt power user,
**I want** my edits to persist as drafts until I explicitly save or discard,
**So that** I don't lose work on browser refresh and can review changes before committing.

---

## Context

Story 3 built the draft API. Story 4 added search/ranking UI. This story integrates drafts into the UI. After this story:

- Shell shows "Unsaved changes" indicator when drafts exist
- Clicking indicator navigates to draft content
- Line edits accumulate as draft (not immediate save)
- Edit mode changes auto-save as draft
- +New creates draft entries
- Save commits draft to Convex, Discard clears from Redis
- Cross-tab polling shows drafts from other tabs
- Warning shows when draft approaches expiration

This completes Epic 02.

---

## Scope

**In scope:**
- Shell: Draft indicator with count
- Shell: Polling `/api/drafts/summary` every 15s
- Shell: Click indicator → navigate to draft
- Portlet: Line edit → draft (not immediate save)
- Portlet: Multiple line edits accumulate in same draft
- Portlet: Edit mode → auto-save draft
- Portlet: +New → create draft
- Portlet: Save button commits draft to Convex
- Portlet: Discard button clears draft from Redis
- Portlet: Save failure preserves draft
- Portlet: Expiration warning display
- Message protocol: `portlet:drafts`, `shell:drafts:open`

**Out of scope:**
- `/prompts/new` route (uses separate prompt-editor module — drafts only apply to prompts list)
- Conflict resolution (explicit out-of-scope)
- Version history (separate feature)

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-29 | Edits in edit mode are automatically saved as draft |
| AC-30 | Line edits are saved as draft (not immediately committed) |
| AC-31 | Multiple line edits accumulate in the same draft |
| AC-32 | New prompt entries are automatically saved as draft |
| AC-33 | Multiple new drafts can exist simultaneously |
| AC-35 | Drafts are accessible from other browser tabs (UI verification) |
| AC-36 | "Unsaved changes" indicator appears when drafts exist |
| AC-37 | Clicking the indicator navigates to draft content |
| AC-40 | If save fails, draft is preserved |
| AC-42 | Warning shown when draft approaches expiration |

**Notes:**
- AC-35 backend support (summary endpoint) is in Story 3. This story verifies the UI behavior.
- AC-38 (save commits to database) is tested at API level in Story 3 (TC-36). The UI save button flow is verified via manual testing ("Line edit, see draft indicator, save commits").

---

## Test Conditions

| TC | Condition | ACs |
|----|-----------|-----|
| TC-27 | Given user editing prompt, when field changed, then draft saved | AC-29 |
| TC-28 | Given user in view mode, when line edited, then draft saved | AC-30 |
| TC-29 | Given user makes multiple line edits, then all in same draft | AC-31 |
| TC-30 | Given user creating prompt, when fields entered, then draft saved | AC-32 |
| TC-31 | Given user clicking +New multiple times, then multiple drafts | AC-33 |
| TC-33 | Given draft in Tab A, when Tab B opened, then indicator visible | AC-35 |
| TC-34 | Given draft exists, then "Unsaved changes" indicator shown | AC-36 |
| TC-35 | Given indicator clicked, then navigates to draft content | AC-37 |
| TC-38 | Given save fails, then draft preserved | AC-40 |
| TC-40 | Given draft near expiration, then warning shown | AC-42 |

---

## Dependencies

- **Story 3 must be complete** — Draft API endpoints exist
- **Story 4 must be complete** — UI foundation with search/pin exists

---

## Deliverables

**Modified files:**

| File | Changes |
|------|---------|
| `src/ui/templates/shell.html` | Draft indicator, polling, click handler |
| `src/ui/templates/prompts.html` | Draft state management, save/discard |

**Modified test files:**

| File | Changes |
|------|---------|
| `tests/service/ui/prompts-module.test.ts` | TC-27..31, TC-35, TC-38, TC-40 (8 tests) |
| `tests/service/ui/shell-history.test.ts` | TC-33, TC-34 (2 tests) |

---

## Definition of Done

**Test counts:**
- `prompts-module.test.ts`: 8 new tests
- `shell-history.test.ts`: 2 new tests
- **Total new tests: 10**

**Running total:** 331 + 10 = 341 tests

**Verification:**
- All 341 tests pass
- Manual: Edit prompt, refresh, draft preserved
- Manual: Line edit, see draft indicator, save commits
- Manual: Open second tab, see indicator from first tab's draft
- Manual: Discard draft, indicator disappears
- Manual: Leave draft near expiration, see warning

---

## Epic Complete

After Story 5, Epic 02 is complete:
- 50 ACs delivered
- 48 TCs verified
- 63 new tests across all stories (278 → 341)
- Search, ranking, pin/favorite, drafts, MCP parity all working
