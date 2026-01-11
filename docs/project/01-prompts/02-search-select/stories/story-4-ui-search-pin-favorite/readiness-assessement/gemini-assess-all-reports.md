# Readiness Assessment Analysis

**Date:** 2026-01-09
**Analyzed Reports:** `gemini-assessement.md`, `gpt52-assessement.md`
**Status:** ⚠️ READY WITH CAVEATS

## Executive Summary

Both assessments agree that the structural prerequisites for Story 4 are met. The backend API (`convex/prompts.ts`, `src/routes/prompts.ts`) is correctly implemented for full-text search, ranking, and flag management. The UI shell (`shell.html`) already supports the necessary message broadcasting.

However, the **GPT-5.2 assessment identifies critical drifts** between the current codebase state and the instructions provided in `prompt-4.2-green.md`. If the developer follows `prompt-4.2-green.md` blindly, they will introduce bugs regarding authentication, response parsing, and UI component usage.

## 1. Consensus (The Good News)

1.  **Backend Ready:** Story 1 deliverables (search/rank/flag APIs) are successfully deployed and verified.
2.  **Architecture Fit:** The proposed UI architecture (Shell ↔ Portlet messaging) matches the existing implementation.
3.  **Test Strategy:** The general test plan (adding 12 new UI tests) is sound.

## 2. Identified Risks & Drifts (The Warnings)

The `gpt52-assessement.md` provides a deeper technical audit than the initial `gemini-assessement.md`, flagging specific incompatibilities in the "Green" prompt:

| Area | Current Codebase | Instruction in Prompt 4.2 | Impact |
|------|------------------|---------------------------|--------|
| **Response Shape** | `/api/prompts` returns `PromptDTO[]` | Expects `{ data: PromptDTO[] }` | **Code Break:** List will fail to render. |
| **Authentication** | Cookie-based (implicit) | `Authorization: Bearer ${getToken()}` | **Code Break:** `getToken` undefined; headers unnecessary. |
| **Toast API** | `showToast(msg, { type: 'error' })` | `showToast(msg, 'error')` | **UX Bug:** Toasts won't style correctly. |
| **CSS Classes** | Matches Story 4 (`.prompt-pin`) | Uses outdated `.pin-indicator` | **Test Failure:** Tests expecting `.prompt-pin` will fail. |
| **Protocol** | Shell handles `shell:filter` | Introduces `portlet:clearSearch` | **No-op:** Shell ignores new message; search won't clear. |

## 3. Test Fixture Gap

GPT-5.2 correctly identifies that `tests/service/ui/setup.ts` uses a legacy `mockPrompts` fixture. This fixture lacks the new V2 fields (`pinned`, `favorited`, `usageCount`).
*   **Risk:** Tests attempting to access `prompt.pinned` will read `undefined` unless fixtures are updated.

## 4. Final Recommendation

**Do NOT proceed blindly with `prompt-4.2-green.md`.**

1.  **Adopt the TDD plan** from `prompt-4.1-skeleton-red.md`, but ensure the "Red" tests use the correct CSS selectors (`.prompt-pin`, `.prompt-star`).
2.  **Patch the Implementation Instructions:**
    *   Remove `getToken()` calls.
    *   Handle array responses from `/api/prompts`.
    *   Use correct Toast signature.
    *   Establish V2 mock data in the test setup.
3.  **Proceed to Implementation:** Start the "Red" phase immediately, but keep this analysis handy to correct the "Green" phase implementation details on the fly.

**Verdict:** Go for "Red" (Skeleton), but correction needed before "Green" (Implementation).
