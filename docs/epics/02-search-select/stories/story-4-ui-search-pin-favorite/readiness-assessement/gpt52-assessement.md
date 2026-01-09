# Story 4 (UI Search & Pin/Favorite) — Implementation Readiness Assessment

**Prepared by:** GPT‑5.2  
**Date:** 2026‑01‑09  
**Story:** `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/story.md`  
**Scope constraint:** Assessment only (no implementation)

---

## Executive summary

**Story 4 is ready to implement** in the current repo state. The required backend (Story 1) endpoints and Convex functions exist, and the shell↔portlet “search + tags” message wiring already matches the Story 4 intent. The main readiness risks are **documentation/prompt drift** (Prompt 4.2 includes several mismatches with the current code) and **test/fixture alignment** (UI tests and fixtures need to reflect the v2 DTO fields and current response shapes).

---

## What I verified in the codebase (current state)

### Backend prerequisites (Story 1) — present

**Fastify routes exist and match Story 4 dependencies:**

- `GET /api/prompts` (list ranked or search based on `q`) in `src/routes/prompts.ts`
- `PATCH /api/prompts/:slug/flags` in `src/routes/prompts.ts`
- `POST /api/prompts/:slug/usage` in `src/routes/prompts.ts`
- `GET /api/prompts/tags` in `src/routes/prompts.ts`

**Convex functions exist and return v2 DTO fields:**

- `listPromptsRanked`, `searchPrompts`, `updatePromptFlags`, `trackPromptUse`, `listTags` in `convex/prompts.ts`
- `convex/schema.ts` includes `searchText`, `pinned`, `favorited`, `usageCount`, `lastUsedAt` (currently optional during migration), plus search index `search_prompts`

### UI wiring prerequisites — already present

**Shell (`src/ui/templates/shell.html`) already contains:**

- `#search-input`
- 150ms debounced broadcasting of `shell:filter { query, tags }`
- tag picker + tag pills that call `broadcastFilters()`

**Portlet (`src/ui/templates/prompts.html`) already contains:**

- `shell:filter` handler that calls `loadPrompts(payload.query || "", payload.tags || [])`
- `loadPrompts(query,tags)` that builds `/api/prompts` URL params and fetches results

### Existing response shape expectations (important)

The portlet currently treats `/api/prompts` as returning an **array** (it does `const data = await response.json(); prompts = Array.isArray(data) ? data : [];`). This matters because several prompts/examples assume a `{ data: ... }` wrapper.

---

## Story 4 scope fit vs current UI

### Already done (so Story 4 should not “re‑implement” it)

- **Search input + debounce + `shell:filter` messaging** (shell)
- **Tag filter selection UI** (shell)
- **Portlet receiving `shell:filter` and calling `loadPrompts(query,tags)`**

### Still missing (actual Story 4 UI work)

All remaining work is correctly scoped to `src/ui/templates/prompts.html` + UI tests:

- **Prompt header pin + favorite controls**
  - Add `#pin-toggle` and `#favorite-toggle` (or equivalent controls), and keep them testable (Story 4 docs expect `aria-pressed` toggling for determinism).
- **Sidebar list indicators**
  - Render pinned/favorited markers in list items (Story 4 docs/tests expect `.prompt-pin` and `.prompt-star`).
- **Empty state variants**
  - “No prompts match your search” (when query/tags are non-empty and results empty)
  - “Create your first prompt” CTA (when no filters and results empty)
- **Copy → usage tracking**
  - Fire-and-forget POST to `/api/prompts/:slug/usage` after successful clipboard write.

---

## Prompt set review (Story 4 docs) vs current code

### `story.md`

**Mostly aligned.** It correctly scopes drafts UI out of Story 4 and focuses on search/ranking display + pin/favorite + usage tracking. One minor note: it lists shell modifications as part of deliverables, but the shell side already exists in the repo.

### `prompt-4.1-skeleton-red.md` (Skeleton + TDD Red)

**Conceptually aligned, but has a key risk:**

- It suggests stubbing `handleFilter()` and wiring message listeners to it. In the current code, `shell:filter` already calls `loadPrompts(query,tags)` directly and is covered by existing tests (e.g. “TC‑2.4 search triggers API call” via `shell:search`).

**Recommendation:** For Story 4 “red phase”, avoid replacing the working `shell:filter → loadPrompts` path with a new stub that throws. Instead, introduce new stub functions only for the **new** behavior (pin/favorite handlers, rendering markers, empty state rendering, usage tracking hook) in a way that doesn’t break existing flows/tests.

### `prompt-4.2-green.md` (TDD Green)

This prompt contains several **mismatches** with the current repo and should be corrected before being used as an implementation instruction set:

- **Response shape mismatch:** uses `then(({ data }) => ...)` but `/api/prompts` returns an array in the current UI and route handlers.
- **Auth header mismatch:** adds `Authorization: Bearer ${getToken()}`; there is no `getToken()` in the UI utilities and the app uses cookie auth.
- **Toast API mismatch:** uses `showToast('...', 'error')` but `public/js/components/toast.js` expects `showToast(message, { type: 'error' })`.
- **CSS/class mismatch:** references `.hidden`, `.pin-indicator`, `.favorite-indicator` conventions that don’t exist in current CSS and don’t match Story 4 test hooks (`.prompt-pin`, `.prompt-star`).
- **Protocol drift:** introduces `portlet:clearSearch`, which the shell does not currently handle and Story 4 didn’t scope.

**Recommendation:** Treat Prompt 4.2 as a “behavior checklist”, not copy/pasteable code, unless revised to match current repo conventions.

### `prompt-4.R-verify.md`

**Mostly aligned.** One good confirmation: this repo has a dedicated `vitest` **`ui` project** (`vitest.config.ts`), so `bun run test --project ui ...` is valid here.

---

## Tech design vs current implementation drift (not blockers, but should be acknowledged)

These are not Story 4 blockers (UI can remain fire-and-forget), but the docs and code diverge:

- **`POST /api/prompts/:slug/usage` response**
  - Tech design describes `202 { tracked: true }`
  - Current Fastify route returns **`204`** with no body.
- **`PATCH /api/prompts/:slug/flags` response**
  - Tech design describes returning updated prompt DTO optionally
  - Current route returns **`{ updated: true }`** only (no prompt object).

**Implication for Story 4:** UI should not depend on response bodies for these endpoints; it should rely on optimistic updates + re-fetch list (with current filters preserved) where needed.

---

## UI test readiness assessment (Story 4)

### What’s already strong

- Existing UI test harness in `tests/service/ui/setup.ts` provides `loadTemplate`, `mockFetch`, `postMessage`, `click`, `waitForAsync`, etc.
- Existing tests already cover loading prompts, selecting prompts, copying content, and legacy `shell:search` message behavior.

### Primary alignment gap

`tests/service/ui/setup.ts` `mockPrompts` currently lacks the **v2 DTO fields** required to assert pin/favorite behaviors:

- `pinned`, `favorited`, `usageCount`, `lastUsedAt`

**Recommendation (choose one):**

- **Option A (simple):** extend the shared `mockPrompts` objects to include the v2 fields with defaults.
- **Option B (safer isolation):** keep existing `mockPrompts` unchanged and add Story‑4‑specific fixtures (`mockPromptsV2`) used only in Story 4 tests.

### Known integration risk for tests/implementation

`#empty-state` currently serves multiple roles (“Select a prompt to view”, editor transitions, etc.). Introducing “no prompts/no matches” empty states must be done carefully so existing behaviors and tests don’t regress.

---

## Risks and “before coding” decisions

### High risk (fix before starting Story 4)

- **Prompt 4.2 drift:** if followed literally, it will create auth/response/toast/protocol inconsistencies and likely break existing UI tests.

### Medium risk (design decision needed)

- **Preserving filter state across re-renders and re-fetches:** after pin/favorite, the list should refresh without dropping the current `query/tags`. The current module doesn’t have a single canonical “currentFilterState” variable; it passes args into `loadPrompts(query,tags)` and has a `savedListState` used mainly for insert mode.

### Low risk (polish)

- **Empty state copy and CTA behavior:** must integrate with existing “no selection” empty state messaging and not interfere with editor modes.

---

## Readiness verdict

**READY FOR IMPLEMENTATION**, with the following recommended pre‑implementation checklist:

- [ ] Update Prompt 4.2 (or annotate it) to match current repo conventions:
  - `/api/prompts` returns an array (not `{ data }`)
  - no `getToken()` / no `Authorization` header
  - `showToast(msg, { type: "error" })` usage
  - stick to `.prompt-pin` / `.prompt-star` markers and real CSS classes
  - avoid inventing new shell↔portlet message types
- [ ] Decide fixture approach for v2 fields (`mockPrompts` vs Story‑4‑local fixture).
- [ ] Decide how pin/favorite refresh preserves current `query/tags`.
- [ ] Plan empty state integration so existing selection/edit flows remain correct.

