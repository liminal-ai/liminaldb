# Epic 03 — Template Merge: Full Epic Review

**Reviewer:** Sonnet 4.6
**Date:** 2026-03-01
**Scope:** All new and modified source + test files listed in the epic implementation
**Branch:** `feat/epic-03-template-merge`

---

## Executive Summary

The Template Merge implementation is **correct and complete**. The epic's five functional surfaces (extraction, merge operation, web UI, MCP, CLI handoff) are all implemented as designed. No critical issues found. Two major-class gaps are flagged for follow-up — one is a test coverage scope question (not a code defect), the other is a subtle behavioral concern in the UI component's `unfilledFields` tracking under a specific race path. Seven minor observations round out the report. The architecture is clean, the tech design is implemented faithfully, and the AC/TC coverage across reviewed files is tight.

**Verdict: Shippable after confirming the two major gaps below.**

---

## 1. Severity Index

| # | Severity | Area | Title |
|---|----------|------|-------|
| M1 | **Major** | Test Coverage | TC-1.3a service-level list/GET tests not in review scope — unverifiable |
| M2 | **Major** | UI Logic | `unfilledFields` in UI copy path uses `getMergeValues()` but empty-string preservation is non-obvious and untested at the unit level |
| m1 | Minor | Code | Dead code in `extractMergeFields`: `if (name === undefined) continue` |
| m2 | Minor | CSS | Asymmetric brace decoration: `::before` has `"{{"`, `::after` has `" }}"` (leading space) |
| m3 | Minor | Test | Integration test uses 500ms `setTimeout` for fire-and-forget tracking — potential flakiness |
| m4 | Minor | UI | `getMergeValues()` empty-string preservation logic lacks explanatory comment |
| m5 | Minor | MCP | No test for MCP `merge_prompt` authentication failure path (unauthenticated call) |
| m6 | Minor | Code | `prompt.mergeFields` from Convex is fetched but unused in the REST merge handler |
| m7 | Minor | Design | `PromptDTOv2Schema extends PromptInputSchema` retains `tags` as enum, but DTOs return `tags: string[]` — pre-existing schema inconsistency not addressed |

---

## 2. Major Findings

### M1 — TC-1.3a/b: Service-level list/GET test files not in review scope

**Location:** Tech design, Section 4 (TC-to-Test Mapping)
**Files:** `tests/service/prompts/getPrompt.test.ts`, `tests/service/prompts/listPrompts.test.ts` (both listed as "amended" in Chunk 1, Task 1.4)

The tech design's TC-to-test mapping explicitly assigns TC-1.3a ("list/search response items include `mergeFields`") to `listPrompts.test.ts` and TC-1.3b ("single fetch includes `mergeFields`") to `getPrompt.test.ts`. Neither file appears in the epic's implementation file list provided for this review.

**What this means:**
- These files require at minimum mechanical amendment (adding `mergeFields: []` to all mock DTOs) to prevent Zod validation failures after the schema change
- They should also carry explicit assertions that `mergeFields` appears in response items
- Without reading them, AC-1.3 service coverage is unverifiable

**Integration coverage is present** (`tests/integration/merge.test.ts` covers TC-1.3b for the single-prompt GET via the real server), but the list endpoint (`GET /api/prompts`) is not covered at the integration level.

**Action required:** Confirm that `getPrompt.test.ts` and `listPrompts.test.ts` were updated and assert `mergeFields` in response items. If omitted, the list endpoint's `mergeFields` contract has no service-level regression guard.

---

### M2 — `unfilledFields` determination in UI copy path has a semantic gap

**Location:** `public/js/components/merge-mode.js:112-127` (`collectCurrentValues`), `156-168` (`getMergeValues`); `src/ui/templates/prompts.html:1753-1779` (`copyContent`)

**The issue:**

`collectCurrentValues()` only collects fields where `inputEl.value !== ""`:

```js
if (inputEl.value !== "") {
    values[fieldName] = inputEl.value;
}
```

When the UI calls `POST /api/prompts/:slug/merge`, it sends these values. For fields the user left empty (never touched or cleared to empty), those fields are **absent from the values dict**, so the API correctly reports them as `unfilledFields`.

However, the spec (AC-2.1d) says **empty string counts as filled**: "Result is `"Write in "` and `language` is not in `unfilledFields`."

**The gap:** If a user explicitly types a value and then clears it to empty string, `getMergeValues()` does attempt recovery via the `mergeValues` state tracker:

```js
Object.keys(mergeValues).forEach((fieldName) => {
    if (!(fieldName in values) && activeFields.includes(fieldName)) {
        if (mergeValues[fieldName] === "") {
            values[fieldName] = "";
        }
    }
});
```

This correctly sends `""` to the API, which counts it as filled. **The happy path is correct.**

But the `mergeValues` dict is keyed by field name (not per-occurrence), so if a prompt has three `{{language}}` inputs and the user clears one input (setting it back to empty) while two others have values — the `mergeValues["language"]` state would be `""` (from the last `input` event on whichever input was last typed into), while the actual inputs might show `""` and `"Python"` respectively. The synchronization in `syncFieldValues` updates all inputs for the same field when any one changes, so this race is only possible if the user types into one `language` input, types into a second `language` input, then clears the first. In that case, `syncFieldValues` would have propagated the latest value to all inputs, and all inputs for that field would show the same value. **The synchronization logic prevents this divergence.**

**Assessment:** The code is functionally correct. The concern is that the correctness depends on the invariant that `syncFieldValues` keeps all same-field inputs synchronized — if that invariant ever breaks, `collectCurrentValues` and `getMergeValues` would silently produce incorrect results. The unit tests for TC-2.1d (empty string as filled) test the API layer but not the UI path. The `TC-3.2c` test verifies synchronization, but doesn't test the filled/unfilled classification for empty-after-clear.

**Recommendation:** Add a unit test for the scenario: user types a value, clears it, copies — verify empty string is sent (not absent) and the field is not listed as unfilled. This closes the behavioral gap at the test level.

---

## 3. Minor Findings

### m1 — Dead code in `extractMergeFields`

**Location:** `convex/model/merge.ts:30-33`

```typescript
const name = match[1];
if (name === undefined) {
    continue;
}
```

`match[1]` can never be `undefined` when the overall regex match succeeded, because the capture group `([a-zA-Z_][a-zA-Z0-9_]*)` is required (not optional). If the regex matches, the capture group matched. This check is unreachable dead code.

**Impact:** None — the check is harmless and never executes. But it reads as though a real edge case exists, which is misleading.

**Recommendation:** Remove the dead check, or add a comment explaining it's defensive for potential future regex changes.

---

### m2 — Asymmetric brace decoration in CSS

**Location:** `public/shared/prompt-viewer.css:352-362`

```css
.merge-mode .merge-input-wrapper::before {
  content: "{{";
}

.merge-mode .merge-input-wrapper::after {
  content: " }}";  /* note: leading space */
}
```

The opening `{{` has no trailing space, but the closing `}}` has a leading space. The rendered result is `{{ [input] }}` which is visually slightly asymmetric — the input is flush with `{{` but has padding before `}}`.

**Impact:** Purely cosmetic. The space before `}}` provides visual breathing room between the input text and the closing brace, which may be intentional. If intentional, a comment would clarify it.

---

### m3 — Integration test: 500ms sleep for fire-and-forget tracking

**Location:** `tests/integration/merge.test.ts:138`

```typescript
await new Promise((resolve) => setTimeout(resolve, 500));
```

Used after the merge API call to allow the fire-and-forget `trackPromptUse` to complete before checking `usageCount`. This is an acknowledged trade-off in the tech design ("In practice, Convex mutations complete in single-digit ms").

**Impact:** Could produce a false negative (test failure without a code defect) in slow CI environments. In local development with the Convex local backend, single-digit ms latency makes this reliable.

**Recommendation:** Document the timing assumption in a comment. Consider increasing the timeout to 1000ms for CI resilience, or use a retry/polling approach if flakiness is observed.

---

### m4 — `getMergeValues()` empty-string preservation logic undocumented

**Location:** `public/js/components/merge-mode.js:156-168`

The empty-string preservation block in `getMergeValues()` is subtle. The invariant it relies on — that `mergeValues[fieldName]` is the last value the user typed for that field, including if they deleted it to empty — is not captured in a comment. A future maintainer could misread the block as a bug (why add `""` as a value when `collectCurrentValues` already skips empty strings?).

**Recommendation:** Add a 2-line comment explaining the invariant: "Preserve intentionally cleared fields (user typed then deleted) so the API receives `""` and counts the field as filled, per AC-2.1d."

---

### m5 — No MCP test for authentication failure on `merge_prompt`

**Location:** `tests/service/prompts/mcpTools.test.ts`

The existing MCP tests for `save_prompts`, `get_prompt`, `delete_prompt`, and others include an "requires authentication" test. The `merge_prompt` describe block does not:

```typescript
describe("MCP Tools - merge_prompt", () => {
    // TC-5.1a, TC-5.1b, TC-5.1c, TC-5.2a
    // No auth-failure test
```

**Impact:** Low. The MCP auth middleware is shared across all tools, so a regression here would be caught by any other tool's auth test. But the explicit coverage for `merge_prompt` is missing.

---

### m6 — `prompt.mergeFields` fetched but unused in REST merge handler

**Location:** `src/routes/prompts.ts:253-262`, `src/lib/merge.ts`

The REST merge handler fetches `prompt` from Convex (which includes `mergeFields` computed by `extractMergeFields`), then passes `prompt.content` to `mergeContent()`. `mergeContent()` independently re-runs the regex to derive `mergeFields` for the response. The `prompt.mergeFields` field from Convex is never used.

```typescript
const prompt = await convex.query(api.prompts.getPromptBySlug, ...);
// prompt.mergeFields exists here, but is not used
const result = mergeContent(prompt.content, values);
// result.mergeFields is independently derived by mergeContent()
```

**Impact:** Zero behavioral impact. `extractMergeFields` and `mergeContent`'s internal regex are identical (both use `MERGE_FIELD_REGEX` duplicated at the Convex boundary), so the results would always match. This is one unnecessary function call cost, negligible at the content scale involved.

**Recommendation:** No action needed. A code comment noting that `prompt.mergeFields` is not used (because `mergeContent` re-derives it) would prevent future confusion.

---

### m7 — Pre-existing: `PromptDTOv2Schema` inherits enum-typed `tags` from `PromptInputSchema`

**Location:** `src/schemas/prompts.ts:138`

```typescript
export const PromptDTOv2Schema = PromptInputSchema.extend({
    mergeFields: z.array(z.string()),
    ...
});
```

`PromptInputSchema` defines `tags: z.array(z.enum(GLOBAL_TAG_NAMES))`. But prompt DTO responses return `tags: string[]` (no enum constraint). If `PromptDTOv2Schema.parse()` were ever called on a real API response, it would fail for tags. In practice, the response schemas are type annotations only and are not runtime-validated on the response path, so this has no runtime impact.

This is a **pre-existing issue** not introduced by Epic 03. Epic 03 adds `mergeFields` to this schema correctly. The tag enum inheritance issue was present before and is out of scope for this review. Flagged for awareness.

---

## 4. AC/TC Coverage Analysis

### Flow 1: Merge Field Extraction (All Surfaces)

| AC | TCs | Coverage | Status |
|----|-----|----------|--------|
| AC-1.1 (mergeFields in every response) | TC-1.1a,b,c | `mergeFields.test.ts` (parser), `integration/merge.test.ts` (GET single prompt) | ✅ |
| AC-1.2 (first-occurrence order) | TC-1.2a | `mergeFields.test.ts` | ✅ |
| AC-1.3 (all read operations) | TC-1.3a,b | TC-1.3b via integration test; TC-1.3a (list/search) unverifiable — see M1 | ⚠️ |
| AC-1.4 (parser syntax rules) | TC-1.4a,b,c,d | `mergeFields.test.ts` (9 tests) | ✅ |

### Flow 2: Merge Operation

| AC | TCs | Coverage | Status |
|----|-----|----------|--------|
| AC-2.1 (replaces all occurrences) | TC-2.1a–d | `merge.test.ts` (unit) + `mergePrompt.test.ts` (service) | ✅ |
| AC-2.2 (unfilled fields in order) | TC-2.2a–c | `merge.test.ts` + `mergePrompt.test.ts` | ✅ |
| AC-2.3 (unfilled remain as tokens) | TC-2.3a | `merge.test.ts` + `mergePrompt.test.ts` | ✅ |
| AC-2.4 (no-op on no fields) | TC-2.4a,b | `merge.test.ts` + `mergePrompt.test.ts` | ✅ |
| AC-2.5 (stored prompt unchanged) | TC-2.5a | `mergePrompt.test.ts` (mutation call count check) | ✅ |
| AC-2.6 (extra values ignored) | TC-2.6a | `merge.test.ts` + `mergePrompt.test.ts` | ✅ |
| AC-2.7 (literal substitution) | TC-2.7a,b | `merge.test.ts` + `mergePrompt.test.ts` | ✅ |
| AC-2.8 (usage tracking) | TC-2.8a–c | `mergePrompt.test.ts` (service) + `integration/merge.test.ts` (real count) | ✅ |

### Flow 3: Web UI Merge Mode

All 25+ TCs in the spec are present as individual test cases in `tests/service/ui/merge-mode.test.ts`. The mapping is explicit and complete.

| AC | Coverage | Status |
|----|----------|--------|
| AC-3.1 (merge toggle visibility) | TC-3.1a,b | ✅ |
| AC-3.2 (rendered view + inputs) | TC-3.2a–d | ✅ |
| AC-3.3 (copy produces merged) | TC-3.3a,b | ✅ |
| AC-3.4 (unfilled warning) | TC-3.4a,b | ✅ |
| AC-3.5 (authoring controls hidden) | TC-3.5a,b | ✅ |
| AC-3.6 (exit restores state) | TC-3.6a,b,c | ✅ |
| AC-3.7 (dirty-state confirm) | TC-3.7a–e | ✅ |
| AC-3.8 (save line edit before switch) | TC-3.8a,b | ✅ |
| AC-3.9 (copy tracks usage) | TC-3.9a,b,c | ✅ (indirect — verifies merge API call count) |
| AC-3.10 (tab navigation) | TC-3.10a | ✅ (verifies input order + no explicit tabindex) |
| AC-3.11 (HTML displays as literal) | TC-3.11a | ✅ |
| AC-3.12 (values cleared on re-entry) | TC-3.12a | ✅ |

### Flow 4: CLI

| AC | Status | Notes |
|----|--------|-------|
| AC-4.1, AC-4.2 | Deferred | Correctly scoped to `liminaldb-cli` repo. API contract (`MergeRequestSchema` / `MergeResponseSchema`) is the deliverable for this repo. |

### Flow 5: MCP Merge Tool

| AC | TCs | Coverage | Status |
|----|-----|----------|--------|
| AC-5.1 (merge tool accepts slug + values) | TC-5.1a,b,c | `mcpTools.test.ts` | ✅ |
| AC-5.2 (get_prompt includes mergeFields) | TC-5.2a | `mcpTools.test.ts` | ✅ |

---

## 5. Interface Compliance

### Parser: `convex/model/merge.ts`

Regex: `/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g` — matches spec exactly (A3)
Deduplication via Set, first-occurrence order preserved — matches AC-1.2
`lastIndex` reset before use — correct for global regex reuse
Implementation matches the tech design interface definition verbatim ✅

### Merge Utility: `src/lib/merge.ts`

`Object.hasOwn()` for value lookup — correctly prevents prototype pollution (noted in tech design)
Replace callback rather than string pattern — correctly avoids `$1`/`$&` issues
Returns `{ content, mergeFields, unfilledFields }` — matches `MergeResult` interface ✅

### Schemas: `src/schemas/prompts.ts`

`MergeRequestSchema = z.object({ values: z.record(z.string(), z.string()) })` — matches spec; correctly rejects non-string values
`MergeResponseSchema` — matches spec
`PromptDTOSchema` and `PromptDTOv2Schema` both updated with `mergeFields: z.array(z.string())` ✅

### Convex DTO Layer

`getBySlug()`, `listByUser()` (both paths), and `toDTOv2()` all call `extractMergeFields(prompt.content)` — all read paths updated ✅

### Convex Return Validators: `convex/prompts.ts`

`getPromptBySlug.returns` — includes `mergeFields: v.array(v.string())` ✅
`listPrompts.returns` — includes `mergeFields: v.array(v.string())` ✅
`promptDtoV2Schema` (used by `listPromptsRanked` + `searchPrompts`) — includes `mergeFields: v.array(v.string())` ✅

### REST Route: `src/routes/prompts.ts`

Handler flow matches tech design Flow 2 step-by-step:
1. Auth check → 401 ✅
2. Slug validation → 400 ✅
3. Body parse via `MergeRequestSchema` → 400 on failure ✅
4. `getPromptBySlug` → 404 if null ✅
5. `mergeContent(prompt.content, values)` ✅
6. Fire-and-forget `trackPromptUse` ✅
7. `200` with `{ content, mergeFields, unfilledFields }` ✅

**Error responses** follow existing convention `{ error: "..." }` — correctly deviates from epic's `code` field documentation (noted in tech design as intentional for API consistency) ✅

### MCP Tool: `src/lib/mcp.ts`

`merge_prompt` registered with `SlugSchema` + `z.record(z.string(), z.string())` inputSchema ✅
Same stateless flow as REST (fetch → merge → fire-and-forget tracking) ✅
Returns JSON-encoded `{ content, mergeFields, unfilledFields }` via `text` content type ✅
Not-found returns `isError: true` — consistent with other MCP tool error patterns ✅

### Web UI: Architecture alignment

**Pre-processing approach**: `merge-mode.js` uses nonce-based placeholders (`%%%MERGE_${nonce}_${idx}_${fieldName}%%%`) to protect valid `{{field}}` tokens through `renderMarkdown()`. This is the approach specified in Q3 of the tech design. Implementation matches spec ✅

**`renderMarkdown` export**: Exposed via `window.promptViewer.renderMarkdown` in `prompt-viewer.js:396-399` ✅

**Viewer state machine**: `currentMode` variable in `prompts.html`; `preMergeLineEdit` captured before entry; restored on exit. Matches Flow 3 state machine ✅

**Dirty-state tracking**: `mergeDirty` in `merge-mode.js`, `resetMergeDirty()` called after copy ✅

**Navigation guard**: `selectPrompt()` checks `mergeActive && window.mergeMode?.isMergeDirty()` before switching ✅

**Line-edit save-before-switch**: Checks `editingLineIndex !== null`, calls `saveCurrentLineEdit()`, awaits result — success continues, failure blocks ✅

---

## 6. Test Quality

### `tests/convex/prompts/mergeFields.test.ts`

9 tests. Covers TC-1.1a–c, TC-1.2a, TC-1.4a–d, plus two standalone edge cases (empty braces, whitespace inside braces). Uses `MERGE_FIXTURES` for consistency with the merge utility tests. Clean and sufficient. Uses `extractMergeFields` directly — no mocking, tests the real regex. ✅

### `tests/service/lib/merge.test.ts`

13 tests. Covers all happy paths, edge cases (empty string, empty content, extra keys, literal substitution, newlines), and the prototype pollution safety test (`{{constructor}}`). Uses `MERGE_FIXTURES` for shared fixtures. Direct unit tests — no mocking. ✅

### `tests/service/prompts/mergePrompt.test.ts`

16 service tests + auth test + non-string values test = 18 total. Maps 1:1 to TCs in the spec. Mocks Convex client correctly. Verifies that `mergeContent` is applied (via response assertions) and that only `trackPromptUse` mutation is called (not a content-modifying mutation), addressing TC-2.5a correctly. ✅

### `tests/service/prompts/mcpTools.test.ts`

5 merge-specific tests added to an existing test file. All TCs covered. The file structure (many `describe` blocks, one per tool) is clean. The `readToolResult` helper correctly handles both JSON and SSE response formats. ✅

### `tests/service/ui/merge-mode.test.ts`

25 named tests + 1 "non-TC" collision guard test = 26 total. Every AC-3.x TC is present. Tests cover happy paths, edge cases (dirty state on navigation, line-edit save failure), and security (XSS via `<script>` in field value). Uses `waitForAsync` consistently to handle the JSDOM async event loop.

**Observation on TC-3.9a/b/c:** These tests verify that the merge endpoint was called N times (by counting fetch calls to `/api/prompts/:slug/merge`), not that the actual `usageCount` incremented. This is correct for a service-level test — the increment is handled server-side and verified in the integration tests. The indirection is appropriate. ✅

### `tests/integration/merge.test.ts`

7 integration tests covering full-stack flows. Exercises the real server, real Convex backend, and real merge logic. The 500ms sleep for usage tracking (m3) is the only structural concern. Test cleanup is idempotent. ✅

### `tests/fixtures/merge.ts`

6 typed fixture objects. The `literalPlaceholder` fixture is particularly thoughtful — it exercises the placeholder collision guard specifically. Using a shared fixture set across parser tests, merge utility tests, and UI tests implicitly verifies that both `extractMergeFields` and `mergeContent` produce identical results for the same content (if either regex diverges, both test suites will fail). ✅

---

## 7. Architecture Alignment

The implementation matches the tech design's architectural decisions at every level:

| Decision | Expected | Actual |
|----------|----------|--------|
| Extraction layer | Convex model (`extractMergeFields`) | ✅ `convex/model/merge.ts` |
| Called by | `toDTOv2()`, `getBySlug()`, `listByUser()` | ✅ All three call sites |
| Regex duplication | Convex + src/lib + merge-mode.js | ✅ Three copies, identical regex |
| `parameters` field | Leave inert | ✅ Not removed |
| Error response format | `{ error: "..." }` only, no `code` field | ✅ Matches existing pattern |
| Pre-processing approach for UI | Nonce placeholders before `renderMarkdown` | ✅ Nonce includes `Date.now()` + `Math.random()` |
| Usage tracking | Fire-and-forget, matching existing pattern | ✅ Both REST + MCP |
| Merge mode and line edit | Mutually exclusive, controls hidden not disabled | ✅ `style.display = 'none'` |
| Line edit persistence fix | Bundled into Story 2, PUT to real API | ✅ `saveCurrentLineEdit` calls PUT endpoint |

---

## 8. Security

- **XSS (UI):** User-entered merge field values are stored in `<input>.value` (not rendered as innerHTML). `TC-3.11a` explicitly verifies `<script>` tags don't render. ✅
- **XSS (field name rendering):** `inputWrapperHtml()` applies `safeHtml()` to field names in HTML attributes. Field names can only contain `[a-zA-Z_][a-zA-Z0-9_]*`, so escaping is technically redundant but is correct defense-in-depth. ✅
- **Prototype pollution:** `Object.hasOwn()` in `mergeContent` prevents `{{constructor}}`, `{{toString}}`, etc. from reading prototype properties. Explicitly tested. ✅
- **Injection via values:** Values are substituted as plain strings via replace callback; no eval, no template literal reconstruction, no recursive processing. ✅

---

## 9. Positive Observations

1. **Regex consistency across all three runtimes** — The same pattern `[a-zA-Z_][a-zA-Z0-9_]*` is used in Convex (`merge.ts`), Node (`src/lib/merge.ts`), and browser (`merge-mode.js`). The shared `MERGE_FIXTURES` data implicitly validates consistency.

2. **Placeholder collision guard** — The `literalPlaceholder` fixture and its test are a nice touch: content containing `%%%MERGE_0_name%%%` literally is correctly handled (the nonce ensures uniqueness, the placeholder is not re-substituted).

3. **TC-3.8b (save failure blocks mode switch)** — This is the hardest scenario to get right. The implementation correctly awaits `saveCurrentLineEdit()`, checks the return value, and blocks mode switch on failure. The test verifies the viewer stays in `line-edit-mode` and does NOT enter `merge-mode`. Clean.

4. **`getMergeValues()` empty-value recovery** — Though subtle (see M2), the empty-string preservation logic addresses a real edge case (user fills a field then clears it) that could otherwise silently misclassify the field as unfilled. The design is careful.

5. **Fire-and-forget pattern is consistent** — Both the REST handler and MCP tool use the same `void promise.catch(log)` pattern for usage tracking, matching the existing `POST /:slug/usage` handler. The tech design explicitly notes this is intentional duplication for readability.

6. **All 25+ Web UI TCs mapped 1:1** — The merge-mode.test.ts is a rare example of complete explicit TC coverage in a UI test file. Every requirement in AC-3.x has a named, labeled test.

---

## 10. Conclusion

Epic 03 is a well-executed implementation. The architecture is clean, the interface compliance is exact, and the test coverage is thorough across all reviewed files. The two major flags (M1 — unverified service-level list tests, M2 — empty-string classification gap in UI) are both **confirmable before merge**: M1 requires checking two existing test files, M2 requires one targeted test. Neither represents a logic defect in the current code.

**Recommended actions before merge:**

1. **[M1 — Blocking]** Confirm `tests/service/prompts/listPrompts.test.ts` and `getPrompt.test.ts` were updated and contain assertions on `mergeFields` in response items.
2. **[M2 — Non-blocking if confirmed]** Add a test for: user types a value, clears it to empty, copies — verify empty string is sent in the values dict and the field is not listed as unfilled.
3. **[m3 — Informational]** Consider increasing the integration test sleep to 1000ms or adding a retry, to guard against CI latency.
4. **[m1,m4 — Informational]** Add comments to dead code and `getMergeValues()` empty-string preservation block.
