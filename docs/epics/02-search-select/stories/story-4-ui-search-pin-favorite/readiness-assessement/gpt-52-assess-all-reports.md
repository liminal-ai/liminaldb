## Story 4 readiness reports — meta-analysis (all assessors)

**Date:** 2026-01-09  
**Story:** UI Search & Pin/Favorite (Story 4)  
**Goal:** Compare/validate the existing readiness reports against each other and against the current repo state, then provide a single consolidated readiness call + doc/prompt corrections (no implementation).

---

## Reports reviewed

- **Claude Opus 4.5**: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/readiness-assessment/opus-assessment.md`
- **Gemini (Antigravity)**: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/readiness-assessement/gemini-assessement.md`
- **GPT‑5.2 (story-level)**: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/readiness-assessement/gpt52-assessement.md`
- **Gemini (meta)**: `docs/epics/02-search-select/stories/story-4-ui-search-pin-favorite/readiness-assessement/gemini-assess-all-reports.md`

---

## Consolidated verdict

**READY, with caveats.** All reports agree Story 4’s *true* dependency surface is satisfied (backend endpoints + Convex functions exist; shell↔portlet filter messaging exists). The caveats are primarily **prompt/documentation drift** and **test fixture alignment**, not missing product functionality.

In other words: the codebase is ready; the written Story 4 prompts need a small “reality sync” before being treated as executable instructions.

---

## High-consensus findings (all assessors align)

### Backend prerequisites are in place

All assessors confirm the Story 1 backend work exists and is usable for Story 4 UI:

- `GET /api/prompts` supports list/search based on query params
- `PATCH /api/prompts/:slug/flags` exists
- `POST /api/prompts/:slug/usage` exists
- Convex returns the v2 DTO fields (`pinned`, `favorited`, `usageCount`, `lastUsedAt`) for list/search

### Shell filtering is already implemented

All assessors note (correctly) that the shell already has:

- `#search-input`
- debounced broadcast of `shell:filter { query, tags }`
- tag picker and selected tag pills

### Portlet already receives `shell:filter`

All assessors note (correctly) that `src/ui/templates/prompts.html` already listens for `shell:filter` and calls `loadPrompts(query,tags)`; thus Story 4 work should be concentrated in the prompts portlet UI rather than re-wiring shell messaging.

---

## Where the reports diverge (and what’s actually correct)

### Prompt 4.2 (“Green”) fidelity

- **Gemini (story-level)**: asserts prompts are “fully verified and aligned,” and implies Prompt 4.2 can be followed directly.
- **Opus**: marks Prompt 4.2 as “Pass / accurate” and doesn’t flag drift in its example code.
- **GPT‑5.2 + Gemini(meta)**: explicitly identify multiple code-shape mismatches in Prompt 4.2 that would break the app/tests if copy/pasted.

**Fact check (repo reality):** GPT‑5.2/Gemini(meta) are correct on drift. Prompt 4.2 contains several instructions that don’t match the current repo conventions:

- `/api/prompts` is treated as returning an **array** in the current portlet; Prompt 4.2 examples assume `{ data: ... }`.
- Prompt 4.2 introduces `getToken()`/`Authorization` headers; there is no `getToken()` helper in the UI utilities and the app uses cookie auth.
- Prompt 4.2 uses a toast API shape that doesn’t match `public/js/components/toast.js` usage.
- Prompt 4.2 uses class/marker conventions that don’t currently exist and don’t match the Story 4 test hooks (`.prompt-pin`, `.prompt-star`).
- Prompt 4.2 invents a `portlet:clearSearch` message the shell does not handle.

**Takeaway:** Prompt 4.2 is *directionally right about behavior*, but **not copy/paste safe** without updating its code examples to match the repo.

### Verification command: `--project ui` vs `--project service`

- **Opus**: claims Story 4 verify prompt uses `--project ui` but should be `--project service`.
- **GPT‑5.2**: states `--project ui` is valid in this repo.

**Fact check (repo reality):** `vitest.config.ts` defines a distinct `ui` project that includes `tests/service/ui/**/*.test.ts`. So **`--project ui` is correct** for running Story 4’s UI tests. Opus’s suggestion to switch to `--project service` is incorrect (service explicitly excludes UI tests).

**Takeaway:** keep the verify command on the `ui` project (or no project flag + explicit file paths).

### Baseline test count (“311 vs 319 vs …”)

- **Gemini (story-level)** repeats the prompt’s baseline framing (“311 existing PASS”) without calling out drift.
- **Opus** claims the baseline is **319** and provides a rationale (“cumulative drift”) and shows evidence in the terminal capture that a test run occurred.
- **GPT‑5.2** intentionally avoided hard-coding counts and treated counts as drifting documentation.

**Fact check (repo reality):** This is inherently time-sensitive. The only grounded thing to say is: **counts drift** and should not be used as a hard gate unless measured at the start of the story. Opus likely measured locally; Gemini did not.

**Takeaway:** treat “311/323/331” numbers in Story 4 prompts as stale. If you want counts, capture them at story start (`bun run test`) and update the docs accordingly.

---

## Gaps/risks that only some reports surfaced

### Test fixture shape (v2 prompt fields)

- **Opus + GPT‑5.2 + Gemini(meta)**: flag that `tests/service/ui/setup.ts` `mockPrompts` lacks v2 fields needed for pin/favorite tests.
- **Gemini (story-level)**: does not mention this.

**Practical impact:** if Story 4 tests assert `prompt.pinned`/`prompt.favorited` UI behavior, fixture data must include these fields (either globally or in Story 4-local fixtures).

### “Red phase” stubbing risk (breaking existing working paths)

GPT‑5.2 called out a subtle risk: Prompt 4.1 suggests introducing a new `handleFilter()` stub that throws, which—if wired into the already-working `shell:filter` path—could cause **existing** UI behaviors/tests to error (not just the new Story 4 tests).

**Takeaway:** In the “Skeleton/Red” phase, only stub *new* behavior (pin/favorite/empty-state/usage hook), and avoid routing existing `shell:filter → loadPrompts` through a throwing stub.

---

## Recommended “single source of truth” corrections (docs/prompts only)

### Update Prompt 4.2 to match repo conventions

- Treat `/api/prompts` as returning an array (or update the codebase consistently—choose one, don’t mix).
- Remove `getToken()`/`Authorization` header usage; rely on same-origin cookies.
- Use the real toast signature (`showToast(message, { type: "error" })`).
- Standardize on Story 4 test markers: `.prompt-pin` and `.prompt-star`.
- Do not introduce new shell↔portlet message types unless you also update shell behavior and tests.

### Clarify Prompt 4.1 so it can’t break existing tests

- Explicitly state: keep the current `shell:filter → loadPrompts(query,tags)` wiring intact during skeleton/red; add new stubs adjacent to it.

### Stop hard-coding total test counts in Story 4 docs

- Replace “311 → 323” style assertions with a procedural check:
  - “Record baseline at start of story (e.g., `bun run test`), then add 12 tests, then baseline+12 should pass.”

### Optional hygiene

- There are two directories: `readiness-assessment/` and `readiness-assessement/` (typo). Consider consolidating to one to avoid losing reports.

---

## Final synthesis (what to do next)

- Proceed to Story 4 implementation **confidently on functionality readiness** (backend + wiring are present).
- Before coding, do a quick **doc reality sync**: revise Prompt 4.2 and (optionally) Prompt 4.1/4.R to match the repo’s actual UI patterns and response shapes.
- Prefer the combined caution stance from **GPT‑5.2 + Gemini(meta)**: “Go for Red now, but fix Prompt 4.2 before using it as executable guidance.”

