# Epic Review: Template Merge (Epic 03)

**Reviewer:** Claude Opus 4.6
**Date:** 2026-03-01
**Branch:** `feat/epic-03-template-merge`
**Commits reviewed:** 9f02c6f through d3ec75f (6 commits)

---

## Executive Summary

The Template Merge feature is well-implemented with strong alignment to both the epic spec and tech design. The parser, merge engine, REST endpoint, MCP tool, and web UI merge mode all function correctly. Test coverage is comprehensive, with 8+ test files covering unit, service, UI, and integration layers. The architecture follows the established codebase patterns cleanly.

There are no critical issues. I found one major issue (regex duplication without a sync guard), several minor issues worth noting, and some observations on spec coverage gaps that are intentionally out-of-scope but worth documenting.

---

## Findings by Severity

### Critical

**None.**

---

### Major

#### M1: Triple regex duplication without a sync guard

**Files:** `convex/model/merge.ts:10`, `src/lib/merge.ts:6`, `public/js/components/merge-mode.js:6`

The merge field regex `/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g` is duplicated in three locations across three runtime boundaries (Convex edge, Node/Bun, browser). The code comments document this is intentional (Convex runtime isolation prevents cross-boundary imports), but there is no automated mechanism to detect drift.

If someone modifies the regex in one location (e.g., to allow dots in field names), the other two locations silently diverge, causing different surfaces to parse different fields from the same content.

**Recommendation:** Add a test in `tests/convex/prompts/mergeFields.test.ts` (or a new cross-cutting test) that imports both `convex/model/merge.ts` and `src/lib/merge.ts`, feeds the same edge-case content through both, and asserts identical output. The browser regex can't be imported in Node, but a string comparison test (read the `.js` file, extract the regex literal, compare) would catch drift. Alternatively, a shared `MERGE_FIELD_PATTERN` string constant in a file that both runtimes can read at build time.

**Impact:** If regexes diverge, the Convex layer would report `mergeFields: ["foo.bar"]` but the merge engine would refuse to replace `{{foo.bar}}`, producing silent data inconsistency.

---

### Minor

#### m1: `mergeContent` has a redundant `undefined` check on value lookup

**File:** `src/lib/merge.ts:48-53`

```typescript
if (hasValue) {
    const value = values[fieldName];
    if (value !== undefined) {
        return value;
    }
}
```

After `Object.hasOwn(values, fieldName)` returns `true`, `values[fieldName]` can only be `undefined` if someone explicitly set `values[fieldName] = undefined`. But `MergeRequestSchema` is `z.record(z.string(), z.string())`, which rejects non-string values. The inner `undefined` check is dead code in practice.

**Impact:** No functional impact. Slight readability cost (reader wonders "can this path actually trigger?").

**Tech design reference:** The tech design's interface definition at Section 3 shows the simpler pattern `return values[fieldName]` without the guard. The implementation added a defensive check not in the spec.

#### m2: `extractMergeFields` implementation deviates slightly from tech design

**File:** `convex/model/merge.ts:24-28`

The tech design specifies:
```typescript
while ((match = MERGE_FIELD_REGEX.exec(content)) !== null) {
    const name = match[1];
    if (!seen.has(name)) { ... }
}
```

The implementation uses:
```typescript
while (true) {
    match = MERGE_FIELD_REGEX.exec(content);
    if (match === null) { break; }
    const name = match[1];
    if (name === undefined) { continue; }
    ...
}
```

This is semantically equivalent but adds an extra `undefined` check on `match[1]`. A regex with a capture group always populates `match[1]` when it matches (it may be an empty string for `()` but not undefined for a group that matched). The `undefined` check is dead code given this regex.

**Impact:** None. Style-only deviation. The `while(true) + break` pattern is a valid Biome/lint preference to avoid assignment-in-condition.

#### m3: Web UI merge mode copy sends field values even when no fields were touched

**File:** `src/ui/templates/prompts.html` (copyContent function around line 1752)

When the user enters merge mode and immediately clicks Copy without typing anything, `getMergeValues()` returns `{}` and the merge endpoint is called with an empty values dict. This is correct behavior per AC-2.2c and AC-2.4a (returns content unchanged with all fields unfilled), but the network round-trip is unnecessary for zero-input copies. The tech design acknowledges this as a v1 trade-off (Section 2, "Copy latency trade-off").

**Impact:** Minor UX delay on no-op copies. Documented as acceptable in tech design.

#### m4: `renderMarkdown` variable regex is looser than merge field regex

**File:** `public/js/components/prompt-viewer.js:282-283`

`renderMarkdown()` uses `/\{\{([^}]+)\}\}/g` (anything inside braces) while the merge system uses `/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g` (valid identifiers only). This mismatch is documented and handled by the pre-processing approach in merge-mode.js (tech design Q3), but it means that in normal (non-merge) view, `{{ spaces }}` renders as a highlighted variable when it isn't a valid merge field.

**Impact:** Cosmetic inconsistency in normal view mode. Not a merge mode bug (merge mode correctly uses the strict regex). The epic explicitly states this is out of scope: "Template validation or linting" is listed under Out of Scope.

#### m5: Integration test has a timing-dependent assertion for fire-and-forget usage tracking

**File:** `tests/integration/merge.test.ts:139`

```typescript
await new Promise((resolve) => setTimeout(resolve, 500));
```

The test waits 500ms for the fire-and-forget `trackPromptUse` mutation to complete before asserting the usage count. While the tech design documents this as acceptable ("In practice, Convex mutations complete in single-digit ms"), this is inherently flaky under load. A retry loop with exponential backoff would be more robust.

**Impact:** Potential CI flake under high load. Unlikely in practice but worth noting.

#### m6: `MergeRequestSchema` allows `values` to be an empty object but does not validate string value lengths

**File:** `src/schemas/prompts.ts:174-176`

```typescript
export const MergeRequestSchema = z.object({
    values: z.record(z.string(), z.string()),
});
```

The schema validates that values are strings but does not enforce any length constraint. A malicious client could send a 100MB string as a merge value. The merged content would exceed the 100k content limit.

**Impact:** Low risk. The merge endpoint doesn't persist the result, so this can only affect response size. Fastify's default body limit (1MB) provides a practical upper bound.

---

## AC/TC Coverage Verification

### Flow 1: Merge Field Extraction

| AC | TC | Covered | Test Location |
|----|-----|---------|---------------|
| AC-1.1 | TC-1.1a | Yes | `mergeFields.test.ts:6-10`, `merge.test.ts:26-35` |
| AC-1.1 | TC-1.1b | Yes | `mergeFields.test.ts:18-21` |
| AC-1.1 | TC-1.1c | Yes | `mergeFields.test.ts:12-16` |
| AC-1.2 | TC-1.2a | Yes | `mergeFields.test.ts:54-59` |
| AC-1.3 | TC-1.3a | Yes | Convex `listByUser()` and `listPromptsRanked()` both call `extractMergeFields`. Verified in `convex/prompts.ts` return validators. Integration test: `merge.test.ts:59-67`. |
| AC-1.3 | TC-1.3b | Yes | `mergePrompt.test.ts` (all tests verify response includes `mergeFields`). Integration: `merge.test.ts:59-67`. |
| AC-1.4 | TC-1.4a | Yes | `mergeFields.test.ts:30-34` (edgeCases fixture) |
| AC-1.4 | TC-1.4b | Yes | `mergeFields.test.ts:36-39` |
| AC-1.4 | TC-1.4c | Yes | `mergeFields.test.ts:41-46` |
| AC-1.4 | TC-1.4d | Yes | `mergeFields.test.ts:48-52` |

### Flow 2: Merge Operation

| AC | TC | Covered | Test Location |
|----|-----|---------|---------------|
| AC-2.1 | TC-2.1a | Yes | `merge.test.ts:6-14`, `mergePrompt.test.ts:46-66` |
| AC-2.1 | TC-2.1b | Yes | `merge.test.ts:16-24`, `mergePrompt.test.ts:69-91` |
| AC-2.1 | TC-2.1c | Yes | `merge.test.ts:26-35`, `mergePrompt.test.ts:94-114` |
| AC-2.1 | TC-2.1d | Yes | `merge.test.ts:37-42`, `mergePrompt.test.ts:117-136` |
| AC-2.2 | TC-2.2a | Yes | `merge.test.ts:44-51`, `mergePrompt.test.ts:139-157` |
| AC-2.2 | TC-2.2b | Yes | `merge.test.ts:53-61`, `mergePrompt.test.ts:160-178` |
| AC-2.2 | TC-2.2c | Yes | `merge.test.ts:63-69`, `mergePrompt.test.ts:181-199` |
| AC-2.3 | TC-2.3a | Yes | `merge.test.ts:53-61`, `mergePrompt.test.ts:202-220` |
| AC-2.4 | TC-2.4a | Yes | `merge.test.ts:71-77`, `mergePrompt.test.ts:223-243` |
| AC-2.4 | TC-2.4b | Yes | `merge.test.ts:79-87`, `mergePrompt.test.ts:246-266` |
| AC-2.5 | TC-2.5a | Yes | `mergePrompt.test.ts:269-294` (verifies no content-modifying mutation) |
| AC-2.6 | TC-2.6a | Yes | `merge.test.ts:107-116`, `mergePrompt.test.ts:297-316` |
| AC-2.7 | TC-2.7a | Yes | `merge.test.ts:89-95`, `mergePrompt.test.ts:319-337` |
| AC-2.7 | TC-2.7b | Yes | `merge.test.ts:97-105`, `mergePrompt.test.ts:340-358` |
| AC-2.8 | TC-2.8a | Yes | `mergePrompt.test.ts:361-385`, `merge.test.ts(integration):119-146` |
| AC-2.8 | TC-2.8b | Yes | `mergePrompt.test.ts:388-401` |
| AC-2.8 | TC-2.8c | Yes | `mergePrompt.test.ts:404-414` |

### Flow 3: Web UI Merge Mode

| AC | TC | Covered | Test Location |
|----|-----|---------|---------------|
| AC-3.1 | TC-3.1a | Yes | `merge-mode.test.ts:127-131` |
| AC-3.1 | TC-3.1b | Yes | `merge-mode.test.ts:133-137` |
| AC-3.2 | TC-3.2a | Yes | `merge-mode.test.ts:139-160` |
| AC-3.2 | TC-3.2b | Yes | `merge-mode.test.ts:162-173` |
| AC-3.2 | TC-3.2c | Yes | `merge-mode.test.ts:175-191` |
| AC-3.2 | TC-3.2d | Yes | `merge-mode.test.ts:193-205` |
| AC-3.3 | TC-3.3a | Yes | `merge-mode.test.ts:207-236` |
| AC-3.3 | TC-3.3b | Yes | `merge-mode.test.ts:238-261` |
| AC-3.4 | TC-3.4a | Yes | `merge-mode.test.ts:263-286` |
| AC-3.4 | TC-3.4b | Yes | `merge-mode.test.ts:288-310` |
| AC-3.5 | TC-3.5a | Yes | `merge-mode.test.ts:312-318` |
| AC-3.5 | TC-3.5b | Yes | `merge-mode.test.ts:320-328` |
| AC-3.6 | TC-3.6a | Yes | `merge-mode.test.ts:330-342` |
| AC-3.6 | TC-3.6b | Yes | `merge-mode.test.ts:344-353` |
| AC-3.6 | TC-3.6c | Yes | `merge-mode.test.ts:355-367` |
| AC-3.7 | TC-3.7a | Yes | `merge-mode.test.ts:369-388` |
| AC-3.7 | TC-3.7b | Yes | `merge-mode.test.ts:390-401` |
| AC-3.7 | TC-3.7c | Yes | `merge-mode.test.ts:403-430` |
| AC-3.7 | TC-3.7d | Yes | `merge-mode.test.ts:432-458` |
| AC-3.7 | TC-3.7e | Yes | `merge-mode.test.ts:460-481` |
| AC-3.8 | TC-3.8a | Yes | `merge-mode.test.ts:483-511` |
| AC-3.8 | TC-3.8b | Yes | `merge-mode.test.ts:514-541` |
| AC-3.9 | TC-3.9a | Yes | `merge-mode.test.ts:543-573` |
| AC-3.9 | TC-3.9b | Yes | `merge-mode.test.ts:576-601` |
| AC-3.9 | TC-3.9c | Yes | `merge-mode.test.ts:603-630` |
| AC-3.10 | TC-3.10a | Yes | `merge-mode.test.ts:632-643` (verifies tab order via DOM ordering, no explicit tabindex attributes) |
| AC-3.11 | TC-3.11a | Yes | `merge-mode.test.ts:645-657` |
| AC-3.12 | TC-3.12a | Yes | `merge-mode.test.ts:659-677` |

### Flow 4: CLI Merge Command

| AC | TC | Status | Notes |
|----|-----|--------|-------|
| AC-4.1 | TC-4.1a | Out of repo scope | CLI lives in `liminaldb-cli` repo. API contract is defined here. |
| AC-4.1 | TC-4.1b | Out of repo scope | Same. |
| AC-4.2 | TC-4.2a | Out of repo scope | Same. |
| AC-4.2 | TC-4.2b | Out of repo scope | Same. |

Tech design correctly documents this as a handoff artifact (Section 1, "CLI implementation lives in the liminaldb-cli repo").

### Flow 5: MCP Merge Tool

| AC | TC | Covered | Test Location |
|----|-----|---------|---------------|
| AC-5.1 | TC-5.1a | Yes | `mcpTools.test.ts:607-638` |
| AC-5.1 | TC-5.1b | Yes | `mcpTools.test.ts:640-671` |
| AC-5.1 | TC-5.1c | Yes | `mcpTools.test.ts:673-689` |
| AC-5.2 | TC-5.2a | Yes | `mcpTools.test.ts:691-714` |

---

## Architecture Alignment

### Tech Design Compliance

| Aspect | Status | Notes |
|--------|--------|-------|
| Parser in `convex/model/merge.ts` | Compliant | Pure function, correct location per Q1 |
| Merge in `src/lib/merge.ts` | Compliant | Stateless utility, correct layer |
| `mergeFields` on all read paths | Compliant | `getBySlug()`, `listByUser()` (both map calls), `toDTOv2()` all verified |
| Convex return validators updated | Compliant | `getPromptBySlug`, `listPrompts`, `promptDtoV2Schema` all include `mergeFields` |
| Zod schemas updated | Compliant | `PromptDTOSchema`, `PromptDTOv2Schema` both include `mergeFields` |
| REST merge endpoint | Compliant | `POST /api/prompts/:slug/merge`, correct error codes (404, 400) |
| MCP merge_prompt tool | Compliant | Correct input schema (slug + values), correct response shape |
| Web UI merge mode | Compliant | Pre-processing approach, `{{braces}}` CSS decorators, dirty-state tracking |
| Line edit persistence fix | Compliant | `saveLineEdit` now persists to Convex via PUT, not Redis draft |
| Usage tracking (fire-and-forget) | Compliant | Both REST and MCP handlers use fire-and-forget pattern |
| Error response format | Compliant | `{ error: "message" }` matches existing codebase convention. No structured codes per tech design spec deviation note. |
| `parameters` field left inert | Compliant | No changes to `parameters` anywhere |

### Spec Deviations

1. **Error codes (documented):** Epic defines `PROMPT_NOT_FOUND` and `INVALID_VALUES` labels. Tech design explicitly states these are documentation labels only, not response fields. Implementation follows tech design. No issue.

2. **`mergeContent` extra guard:** Implementation adds a `value !== undefined` inner check not in the tech design interface. Functionally harmless (see m1).

3. **`extractMergeFields` loop style:** Uses `while(true) + break` instead of `while((match = ...) !== null)`. Functionally identical (see m2).

---

## Test Quality Assessment

### Coverage Depth

- **Parser tests (9 tests):** Excellent. Covers valid names, empty braces, whitespace, invalid chars, deduplication, ordering.
- **Merge engine tests (13 tests):** Excellent. Covers single/multi field, empty values, unfilled fields, no-op, recursive merge prevention, newline values, extra keys, prototype pollution safety (`{{constructor}}`).
- **REST endpoint tests (16 tests):** Excellent. Every TC from AC-2.1 through AC-2.8 plus auth check and non-string value validation.
- **MCP tool tests (4 merge-specific + 4 get_prompt):** Good. Covers full merge, partial merge, not-found, and mergeFields in get_prompt response.
- **UI merge mode tests (25 tests):** Excellent. Every TC from AC-3.1 through AC-3.12 plus a collision guard test for literal placeholder text.
- **Integration tests (7 tests):** Good. Covers GET mergeFields, full merge, partial merge, usage tracking, auth, validation, and 404.

### Test Fixtures

The `tests/fixtures/merge.ts` file provides shared fixtures (`twoFields`, `duplicateField`, `noFields`, `emptyContent`, `literalPlaceholder`, `edgeCases`) used consistently across parser, merge engine, and UI tests. Good DRY practice.

### Missing Test Cases (non-blocking)

1. **No cross-boundary parser comparison test** — See M1. The three regex copies could diverge without detection.
2. **No test for extremely large content** — Epic says 100k chars is fine (A4). No test verifies this, though the regex is O(n) and negligible.
3. **No negative test for `mergeContent` with undefined values in dict** — MergeRequestSchema prevents this at the boundary, but no unit test exercises the defensive `value !== undefined` check in merge.ts.

---

## Security Review

| Aspect | Status | Notes |
|--------|--------|-------|
| XSS in merge inputs | Safe | `safeHtml()` in merge-mode.js escapes all field names in `data-field` attributes and placeholder text. Input `type="text"` inherently does not render HTML. TC-3.11a verifies this. |
| Prototype pollution | Safe | `Object.hasOwn()` used instead of `in` operator. Test for `{{constructor}}` exists. |
| Recursive merge | Safe | Values substituted literally (single-pass replace via callback). No re-scanning of output. TC-2.7a verifies. |
| Auth on merge endpoint | Safe | `authMiddleware` preHandler on route. 401 test exists. |
| Auth on MCP tool | Safe | `extractMcpUserId` check. 401 test exists. |
| Body size | Acceptable | Fastify default 1MB limit. No custom limit needed for merge. |

---

## Overall Assessment

**Verdict: Ready to ship.**

The implementation is clean, well-tested, and faithfully follows the epic spec and tech design. The one major finding (M1 - regex sync) is a maintenance risk, not a correctness bug today. All three copies of the regex are identical. The minor findings are documentation-worthy but not blocking.

### Strengths

1. **Comprehensive AC/TC coverage:** Every acceptance criterion has at least one test, most have multiple layers (unit + service + integration).
2. **Clean architecture:** Parser in Convex model layer, merge utility in API layer, UI component isolated. No cross-cutting concerns leaked.
3. **Defensive coding:** `Object.hasOwn()` for prototype safety, `MERGE_FIELD_REGEX.lastIndex = 0` for global regex reset, `safeHtml()` for XSS prevention.
4. **Pre-processing approach for merge mode:** Elegant solution to the regex mismatch between `renderMarkdown` (loose) and merge parser (strict). Avoids ambiguity cleanly.
5. **Dirty-state management:** Complete coverage of all five AC-3.7 scenarios (untouched, filled-not-copied, post-copy, edited-after-copy, navigation).
6. **Fire-and-forget consistency:** Usage tracking pattern matches existing codebase convention. Both REST and MCP use identical approach.

### Action Items

| # | Severity | Action | Effort |
|---|----------|--------|--------|
| 1 | Major | Add regex sync test between convex/model/merge.ts and src/lib/merge.ts | 15 min |
| 2 | Minor | Consider removing dead `value !== undefined` check in merge.ts:49-51 | 2 min |
| 3 | Minor | Consider retry loop instead of sleep in integration test timing | 10 min |
