# Epic 03 — Template Merge: Critical Review (LiminalDB)

> **Reviewer:** GPT-5.2 via Codex CLI (`-m gpt-5.2`, reasoning: high)
> **Session:** `019cac27-f505-7e53-b379-ce854ce09ab9`
> **Tokens:** 4.2M in / 30.5K out (4.1M cached)
> **Date:** 2026-03-02

---

## 1. Executive Summary

Epic 03 adds a strict, handlebars-style template merge system for prompts (`{{fieldName}}`) with two main capabilities: (1) **derived** `mergeFields: string[]` returned on *every* prompt read across REST/MCP/Web UI, and (2) a **merge operation** that substitutes values and reports `unfilledFields` without modifying stored content. The core merge engine is clean, well-tested, and generally aligned with the epic + tech design. The largest risk area is the **web UI line-edit persistence fix** bundled into Story 2: the current implementation can **silently delete prompt `parameters`** (data loss) and introduces a few reliability/UX regressions around line-edit rendering and save concurrency.

Overall assessment: **Backend + MCP merge functionality is strong and close to ship**; **Web UI merge mode is solid**, but **line edit persistence must be fixed before shipping** per the epic prerequisite (A11 / bead `promptdb-utq`).

---

## 2. Findings by Severity

### Critical (Must Fix)

1. **Line edit PUT omits `parameters` → can erase stored metadata (data loss)**
   - **Where:** `src/ui/templates/prompts.html` `saveLineEdit()` sends a full `PUT /api/prompts/:slug` body without `parameters`. See `src/ui/templates/prompts.html#L1491` (body includes `slug`, `name`, `description`, `content`, `tags` only).
   - **Why critical:** `convex/model/prompts.ts` `updateBySlug()` patches `parameters: updates.parameters` unconditionally. If the request omits `parameters`, Zod parses it as `undefined`, and Convex patches `parameters` to `undefined` (effectively deleting it). See `convex/model/prompts.ts#L468` and `convex/model/prompts.ts#L473`.
   - **Impact:** Any prompt that has `parameters` set (even if "inert" per scope) can lose that metadata from a simple line edit. This is true data loss.
   - **Fix direction (either is acceptable):**
     - UI: include `parameters: prompt.parameters` in the `PUT` body in `saveLineEdit()`.
     - Or model-layer: change `updateBySlug()` to only patch `parameters` if it is present (avoid patching `undefined`), but be careful: this affects *all* update paths and may change semantics.

2. **Line-edit save re-renders edited lines as plain text, breaking semantic markup + stats**
   - **Where:** `src/ui/templates/prompts.html` `saveLineEdit()` sets `lineEl.textContent = newValue` on success and `lineEl.textContent = oldValue` on failure. See `src/ui/templates/prompts.html#L1517` and `src/ui/templates/prompts.html#L1537`.
   - **Why critical for Story 2:** Line edit mode is used in the same viewer state machine as merge mode. Replacing a parsed line's HTML with raw text strips variable/tag styling and can desynchronize viewer stats until a full re-render occurs.
   - **Impact:** Visual regressions + confusing behavior in the prompt viewer; undermines "save-before-switch" correctness because the UI may not reflect the actual rendered state after save.
   - **Fix direction:** After successful save (and on failure), call `displayPromptContent(rawPrompt)` (or re-render the single line using the same parser used by `renderPrompt()` for the current view) rather than setting `textContent`.

### Major (Should Fix)

1. **Potential double-save race on merge-mode entry due to "save-on-blur" + explicit save-before-switch**
   - **Where:** `startLineEdit()` saves on blur without awaiting (`saveLineEdit(...)`), and merge mode entry explicitly calls `saveCurrentLineEdit()` (awaited). See `src/ui/templates/prompts.html#L1410` and merge entry path `src/ui/templates/prompts.html` `enterMergeViewMode()`.
   - **Why major:** Clicking the Merge toggle will blur the textarea (triggering a non-awaited save), then the click handler runs and calls `saveCurrentLineEdit()` again. This can produce duplicate PUTs and racey UI outcomes (e.g., one succeeds, one fails → user sees an error toast and a reverted line even though the server saved).
   - **Fix direction:** Ensure only *one* save path runs:
     - Remove blur-based save, or
     - Make blur save await/serialize via an in-flight promise, or
     - Set a guard in blur handler when a mode switch is in progress.

2. **MCP tool outputs are JSON strings only (not structured output)**
   - **Where:** `src/lib/mcp.ts` `get_prompt` / `merge_prompt` return `content: [{ type: "text", text: JSON.stringify(...) }]`.
   - **Why major-ish:** It works (tests parse JSON), but it's less ergonomic for MCP consumers and increases the risk of downstream parsing errors. If other tools in the project return structured content, this is an inconsistency to consider.
   - **Fix direction:** Consider returning `structuredContent` (if supported by your MCP transport/clients) while keeping the text fallback.

3. **Derived-field drift risk (regex duplicated across Convex / server / UI)**
   - **Where:** Strict regex appears in:
     - `convex/model/merge.ts`
     - `src/lib/merge.ts`
     - `public/js/components/merge-mode.js`
   - **Why major:** This is an intentional boundary per tech design, but it's still a long-term maintenance hazard. Tests help, but drift can occur if only one layer changes.

### Minor (Nice to Fix)

1. **Merge mode "vars" stat likely undercounts in merge mode**
   - **Where:** `public/js/components/merge-mode.js` pre-processing replaces valid tokens before calling `renderMarkdown()`, so `renderMarkdown()` stats count fewer `{{...}}` occurrences.
   - **Impact:** Cosmetic/informational only.

2. **`mergeContent()` uses a global regex without explicitly resetting `lastIndex`**
   - **Where:** `src/lib/merge.ts`
   - **Impact:** Probably fine because `String.prototype.replace` typically handles this safely, and unit tests call `mergeContent()` repeatedly without issues. Resetting would match the defensive style used in `extractMergeFields()`.

3. **Empty-string-as-filled UX mismatch**
   - **Where:** `public/js/components/merge-mode.js` attempts to preserve intentionally-cleared values as `""` (so the server treats them as filled), but the UI styling marks empty inputs as "unfilled" (`filled` class depends on `value.length > 0`).
   - **Impact:** Users can end up with "no warning" behavior while the UI still looks unfilled.

---

## 3. AC/TC Coverage Analysis

### Story 1 — Merge Field Extraction + Merge Operation + MCP (+ CLI contract)

#### AC-1.* Merge Field Extraction (All Surfaces)

| TC | Implemented? | Evidence | Test Coverage |
|---|---:|---|---|
| TC-1.1a | Yes | `extractMergeFields()` strict regex + DTO mapping | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.1b | Yes | Returns `[]` when no matches | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.1c | Yes | `Set` dedupe preserves first occurrence | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.2a | Yes | Exec loop + `seen`/push order | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.3a | Yes | List/search endpoints return `mergeFields` via Convex DTO | `tests/service/prompts/listPrompts.test.ts` |
| TC-1.3b | Yes | `GET /api/prompts/:slug` returns `mergeFields` | `tests/service/prompts/getPrompt.test.ts` + `tests/integration/merge.test.ts` |
| TC-1.4a | Yes | Strict identifier regex | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.4b | Yes | `{{}}` ignored | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.4c | Yes | No whitespace trimming in strict parser | `tests/convex/prompts/mergeFields.test.ts` |
| TC-1.4d | Yes | Dots/spaces rejected | `tests/convex/prompts/mergeFields.test.ts` |

Implementation notes:
- Convex DTO enrichment is correctly applied in `convex/model/prompts.ts` across `getBySlug()`, `listByUser()`, and `toDTOv2()` (rank/search path).
- REST surfaces generally rely on Convex DTOs without re-parsing (good single source of truth).

#### AC-2.* Merge Operation (REST + server lib)

| TC | Implemented? | Evidence | Test Coverage |
|---|---:|---|---|
| TC-2.1a | Yes | `mergeContent()` replace callback | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.1b | Yes | Global regex replaces all occurrences | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.1c | Yes | Multiple fields supported | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.1d | Yes | Empty string is an own-property value | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.2a | Yes | `unfilledFields: []` when all filled | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.2b | Yes | Missing values tracked in first-occurrence order | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.2c | Yes | Empty `{}` → all fields unfilled | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.3a | Yes | Unfilled tokens returned unchanged | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.4a | Yes | No fields → no-op | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.4b | Yes | Empty content returns empty arrays | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.5a | Yes | Merge endpoint does not call update mutation | `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.6a | Yes | Extra values ignored by regex | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.7a | Yes | Literal substitution | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.7b | Yes | Newlines preserved | `tests/service/lib/merge.test.ts` + `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.8a | Yes (best-effort) | Fire-and-forget `trackPromptUse` on success | `tests/service/prompts/mergePrompt.test.ts` + `tests/integration/merge.test.ts` |
| TC-2.8b | Yes | 404 returns early, no mutation | `tests/service/prompts/mergePrompt.test.ts` |
| TC-2.8c | Yes | 400 parse failure returns early | `tests/service/prompts/mergePrompt.test.ts` |

Implementation notes:
- Prototype-safety is handled correctly with `Object.hasOwn()`; there is direct coverage for `constructor` keys in `tests/service/lib/merge.test.ts`.

#### AC-4.* CLI Merge Command
- **Status in this repo:** **Not implemented here** (tech design explicitly states it lives in `liminaldb-cli`).
- **Coverage in this repo:** Only the **REST contract** (`POST /api/prompts/:slug/merge`) is delivered and tested.

#### AC-5.* MCP Merge Tool

| TC | Implemented? | Evidence | Test Coverage |
|---|---:|---|---|
| TC-5.1a | Yes | `merge_prompt` tool merges + returns `unfilledFields: []` | `tests/service/prompts/mcpTools.test.ts` |
| TC-5.1b | Yes | Partial merge supported | `tests/service/prompts/mcpTools.test.ts` |
| TC-5.1c | Yes | Missing prompt → `isError: true` | `tests/service/prompts/mcpTools.test.ts` |
| TC-5.2a | Yes | `get_prompt` returns DTO with `mergeFields` | `tests/service/prompts/mcpTools.test.ts` |

---

### Story 2 — Web UI Merge Mode (Plus line-edit persistence prerequisite)

| TC | Implemented? | Evidence | Test Coverage |
|---|---:|---|---|
| TC-3.1a | Yes | Merge toggle shown when `mergeFields.length > 0` | `tests/service/ui/merge-mode.test.ts` |
| TC-3.1b | Yes | Merge toggle hidden when `mergeFields.length === 0` | `tests/service/ui/merge-mode.test.ts` |
| TC-3.2a | Yes | Merge mode uses `renderMarkdown` rendered view | `tests/service/ui/merge-mode.test.ts` |
| TC-3.2b | Yes | Strict tokens become inputs with braces (CSS + wrapper) | `tests/service/ui/merge-mode.test.ts` |
| TC-3.2c | Yes | Same-field inputs synchronize | `tests/service/ui/merge-mode.test.ts` |
| TC-3.2d | Yes | `.filled` class for styling | `tests/service/ui/merge-mode.test.ts` |
| TC-3.3a | Yes | Copy calls merge endpoint, copies merged content | `tests/service/ui/merge-mode.test.ts` |
| TC-3.3b | Yes | Partial copy preserves `{{field}}` | `tests/service/ui/merge-mode.test.ts` |
| TC-3.4a | Yes | Toast warning lists unfilled fields | `tests/service/ui/merge-mode.test.ts` |
| TC-3.4b | Yes | Warning doesn't block clipboard write | `tests/service/ui/merge-mode.test.ts` |
| TC-3.5a | Yes | Edit + line edit controls hidden | `tests/service/ui/merge-mode.test.ts` |
| TC-3.5b | Yes | Controls restored on exit | `tests/service/ui/merge-mode.test.ts` |
| TC-3.6a | Yes | Line edit resumes if previously enabled | `tests/service/ui/merge-mode.test.ts` |
| TC-3.6b | Yes | Plain semantic view if line edit was off | `tests/service/ui/merge-mode.test.ts` |
| TC-3.6c | Yes | localStorage preference unchanged | `tests/service/ui/merge-mode.test.ts` |
| TC-3.7a | Yes | Confirm on dirty exit | `tests/service/ui/merge-mode.test.ts` |
| TC-3.7b | Yes | No confirm on untouched exit | `tests/service/ui/merge-mode.test.ts` |
| TC-3.7c | Yes | No confirm after copy resets dirty | `tests/service/ui/merge-mode.test.ts` |
| TC-3.7d | Yes | Dirty again after post-copy edits | `tests/service/ui/merge-mode.test.ts` |
| TC-3.7e | Yes | Confirm on prompt navigation when dirty | `tests/service/ui/merge-mode.test.ts` |
| TC-3.8a | Yes (but see Major finding) | Awaited save-before-switch exists | `tests/service/ui/merge-mode.test.ts` |
| TC-3.8b | Yes | Save failure blocks mode switch | `tests/service/ui/merge-mode.test.ts` |
| TC-3.9a | Yes (best-effort) | Merge endpoint tracks usage | `tests/service/ui/merge-mode.test.ts` + integration |
| TC-3.9b | Yes | Same as above | `tests/service/ui/merge-mode.test.ts` |
| TC-3.9c | Yes | Each copy triggers merge call | `tests/service/ui/merge-mode.test.ts` |
| TC-3.10a | Yes | DOM order inputs, no tabindex hacks | `tests/service/ui/merge-mode.test.ts` |
| TC-3.11a | Yes | Input value is literal text | `tests/service/ui/merge-mode.test.ts` |
| TC-3.12a | Yes | State reset on exit/re-entry | `tests/service/ui/merge-mode.test.ts` |

Key gap: While merge-mode TCs are well-covered, **the line-edit persistence fix's correctness around non-content fields (`parameters`) and correct semantic re-rendering is not covered by tests**, and currently fails the "no data loss" bar.

---

## 4. Interface Compliance

### REST Endpoints (Tech Design vs Implementation)

- `GET /api/prompts`
  - **Expected:** items include `mergeFields: string[]`.
  - **Actual:** returns Convex `listPromptsRanked`/`searchPrompts` results including `mergeFields`.
  - **Tests:** `tests/service/prompts/listPrompts.test.ts`, `tests/service/ui/*` (indirect).
- `GET /api/prompts/:slug`
  - **Expected:** response includes `mergeFields: string[]`.
  - **Actual:** passes through Convex DTO including `mergeFields`.
  - **Tests:** `tests/service/prompts/getPrompt.test.ts`, `tests/integration/merge.test.ts`.
- `POST /api/prompts/:slug/merge`
  - **Expected request:** `{ values: Record<string,string> }` (Zod).
  - **Expected response:** `{ content, mergeFields, unfilledFields }`.
  - **Actual:** matches; values are parsed with `MergeRequestSchema`, response is `mergeContent(...)`.
  - **Tests:** `tests/service/prompts/mergePrompt.test.ts`, `tests/integration/merge.test.ts`.

Error response shape: matches the tech design decision (`{ error: "..." }`, no `code` field).

### MCP Tool Signatures

- `merge_prompt`
  - **Expected input:** `slug`, `values` record.
  - **Actual inputSchema:** matches.
  - **Output:** JSON string in text content; functionally contains `content`, `mergeFields`, `unfilledFields`.
  - **Tests:** `tests/service/prompts/mcpTools.test.ts`.

### Convex Query/Mutation Signatures

- `getPromptBySlug` / `listPrompts` / `listPromptsRanked` / `searchPrompts`
  - **Expected returns:** include `mergeFields: string[]`.
  - **Actual:** validators in `convex/prompts.ts` include `mergeFields` in all relevant DTOs.
- No new Convex merge mutation was required; merge is performed in server layer using prompt content fetched via `getPromptBySlug`.

### Zod Schemas

- `PromptDTOSchema` / `PromptDTOv2Schema` include `mergeFields`.
- `MergeRequestSchema` / `MergeResponseSchema` match tech design.

---

## 5. Architecture Alignment

### Layer separation (Convex model → server lib → routes/MCP → UI)

- **Convex model (`convex/model/merge.ts`, `convex/model/prompts.ts`)**
  - Correctly owns extraction (`extractMergeFields`) and injects `mergeFields` into DTOs on read.
- **Server library (`src/lib/merge.ts`)**
  - Owns deterministic merge behavior (`mergeContent`) and security-hardening for dictionary lookup.
- **Routes (`src/routes/prompts.ts`)**
  - Implements merge endpoint as stateless read→merge→respond, with best-effort usage tracking.
- **MCP (`src/lib/mcp.ts`)**
  - Mirrors REST semantics: get prompt → merge locally → track usage.
- **UI (`src/ui/templates/prompts.html`, `public/js/components/merge-mode.js`)**
  - Implements rendered-view merge mode using strict pre-processing to avoid regex ambiguity with `renderMarkdown()`.

Alignment is strong with one notable exception: the **line edit persistence fix** is currently implemented in the UI layer in a way that can **change non-content fields** (parameters) and degrade rendering, which violates the architectural intent of "safe persistence fix" and introduces cross-feature regressions.

---

## 6. Test Quality Assessment

Strengths:
- **Good unit coverage** for extraction and merge semantics, including ordering, edge cases, and prototype-safety (`constructor`).
- **Service-level API tests** for merge endpoint cover validation errors, 404 behavior, and usage tracking invocation semantics.
- **UI merge mode tests** are thorough and map well to the epic's TCs, including dirty-state confirmation and navigation guard.
- **Integration test** validates real-system behavior and confirms `mergeFields` enrichment and usage count increment.

Weaknesses / gaps:
- **No test** asserts that line edit persistence preserves `parameters` (the current implementation would fail such a test).
- **No test** covers the blur/save-before-switch race (duplicate saves) or verifies "single save" behavior.
- Integration test relies on a **fixed `setTimeout(500ms)`** to observe usage tracking, which can become flaky under load or slower environments.

---

## 7. Cross-Cutting Concerns

### Error handling consistency
- REST endpoints use `{ error: "..." }` consistently and align with the tech design decision.
- Merge endpoint's parse errors return first Zod issue message (consistent with existing patterns in `src/routes/prompts.ts`).

### Input validation completeness
- Merge endpoint validates `values` as `record<string,string>`, which is sufficient for the epic.
- Slug validation is consistently enforced via `SlugSchema`.

### Security considerations
- Merge dictionary lookup uses `Object.hasOwn()` to avoid prototype-chain surprises; good defense-in-depth.
- UI merge inputs are plain `<input>.value` (not HTML-rendered), satisfying TC-3.11.
- Server returns merged content as plain text; downstream renderers must still avoid unsafe HTML rendering (current UI copies to clipboard only).

### Performance considerations
- Extraction is a single-regex scan per read and is likely fine at the 100k-char constraint.
- The biggest performance cost remains **returning full `content` on list/search** (pre-existing), not the extraction itself.

---

## Bottom Line / Ship Readiness

| Area | Status |
|------|--------|
| Backend + MCP | Close to ship — logic and tests are strong |
| Web UI merge mode | Good implementation and test coverage |
| **Blocker** | Fix `saveLineEdit()` to **prevent data loss (`parameters`)** and to **re-render correctly** (avoid plain `textContent`) before considering Epic 03 complete |
