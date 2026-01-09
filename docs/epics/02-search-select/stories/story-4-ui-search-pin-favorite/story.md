# Story 4: UI Search & Pin/Favorite

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- UI Architecture: `docs/ui-arch-patterns-design.md`

---

## User Story

**As a** prompt power user,
**I want** to search my prompts, see them ranked by relevance, and mark important ones,
**So that** I can quickly find and access the prompts I use most.

---

## Context

Story 1 built the backend for search, ranking, and pin/favorite flags. This story adds the UI. After this story:

- Shell has search input with instant filtering
- Sidebar shows prompts ranked by usage/recency
- Pin icon appears in header, pins prompt to top
- Star icon appears in header, boosts ranking
- Icons visible in sidebar list for pinned/favorited
- Copying a prompt tracks usage (fire-and-forget)

Follows existing shell/portlet message protocol.

---

## Scope

**In scope:**
- Shell: Search input with debounced filtering
- Shell: Tag filter integration with search
- Portlet: List rendering with ranked order
- Portlet: Pin/star icons in prompt header
- Portlet: Pin/star icons in sidebar list items
- Portlet: Optimistic UI updates with rollback
- Portlet: Copy button triggers usage tracking
- Empty state: "No prompts match" message
- Empty state: "Create your first prompt" CTA

**Out of scope:**
- Draft indicator (Story 5)
- Line edit → draft (Story 5)
- Save/discard for drafts (Story 5)

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-1 | User can type in search box and see results filter as they type |
| AC-4 | Empty search shows full prompt list |
| AC-5 | Search with no matches shows "No prompts match" message |
| AC-7 | Search feels responsive while typing rapidly |
| AC-16 | Zero prompts shows "Create your first prompt" call-to-action |
| AC-22 | User can pin a prompt from the prompt view |
| AC-23 | User can unpin a previously pinned prompt |
| AC-24 | User can favorite a prompt from the prompt view |
| AC-25 | User can unfavorite a previously favorited prompt |
| AC-26 | Pin/favorite changes reflect immediately in UI |
| AC-27 | Pinned prompts show pin icon in sidebar list |
| AC-28 | Favorited prompts show star icon in sidebar list |

---

## Test Conditions

| TC | Condition | ACs |
|----|-----------|-----|
| TC-1 | Given prompts exist, when user types query, then matching prompts shown | AC-1 |
| TC-3 | Given empty search box, when user views list, then all prompts shown | AC-4 |
| TC-4 | Given no prompts match query, then "No prompts match" shown | AC-5 |
| TC-6 | Given user typing quickly, then search remains responsive | AC-7 |
| TC-14 | Given user has no prompts, then "Create your first prompt" shown | AC-16 |
| TC-20 | Given prompt view, when user clicks pin, then prompt becomes pinned | AC-22 |
| TC-21 | Given pinned prompt, when user clicks pin, then prompt unpinned | AC-23 |
| TC-22 | Given prompt view, when user clicks star, then prompt favorited | AC-24 |
| TC-23 | Given favorited prompt, when user clicks star, then unfavorited | AC-25 |
| TC-24 | Given pin/favorite clicked, then change reflects immediately | AC-26 |
| TC-25 | Given pinned prompt in list, then pin icon visible | AC-27 |
| TC-26 | Given favorited prompt in list, then star icon visible | AC-28 |

---

## Dependencies

- **Story 1 must be complete** — Backend search/ranking/flags APIs exist

---

## Deliverables

**Modified files:**

| File | Changes |
|------|---------|
| `src/ui/templates/shell.html` | Search input, filter message handling |
| `src/ui/templates/prompts.html` | Ranked list, pin/star UI, empty states, copy → usage |

**Modified test files:**

| File | Changes |
|------|---------|
| `tests/service/ui/prompts-module.test.ts` | TC-1, TC-3, TC-4, TC-14, TC-20..26 (11 tests) |
| `tests/service/ui/shell-history.test.ts` | TC-6 (1 test) |

---

## Definition of Done

**Test counts:**
- `prompts-module.test.ts`: 11 new tests
- `shell-history.test.ts`: 1 new test
- **Total new tests: 12**

**Running total:** 311 + 12 = 323 tests

**Verification:**
- All 323 tests pass
- Manual: Type in search, results filter instantly
- Manual: Click pin icon, prompt moves to top
- Manual: Click star icon, ranking boosted
- Manual: Icons visible in sidebar
- Manual: Copy prompt, usage increments (check API)
