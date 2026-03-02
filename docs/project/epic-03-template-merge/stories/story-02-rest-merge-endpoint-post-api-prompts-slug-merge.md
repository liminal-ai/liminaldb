# Story 2: REST Merge Endpoint (`POST /api/prompts/:slug/merge`)

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Provide a stateless merge operation over REST that replaces `{{fieldName}}`
tokens using a provided values dictionary and returns merged content plus
unfilled fields.

## Scope

### In Scope
- New REST endpoint `POST /api/prompts/:slug/merge`
- Merge semantics and response shape per the epic
- Usage count increment on successful merge (best-effort is acceptable)

### Out of Scope
- Any UI changes (Story 6)
- MCP merge tool (Story 3)
- CLI command implementation (external repo; Story 4)

## Dependencies / Prerequisites

- Story 0 complete (merge primitive)
- Story 1 is not a prerequisite (merge endpoint derives mergeFields from content via mergeContent)

## Acceptance Criteria

**AC-2.1:** Merge replaces all occurrences of each field with the supplied value

- **TC-2.1a: Single field, single occurrence**
  - Given: Content `"Write in {{language}}"` and values `{"language": "Python"}`
  - When: Merge is executed
  - Then: Result is `"Write in Python"`
- **TC-2.1b: Single field, multiple occurrences**
  - Given: Content with `{{language}}` appearing three times and values `{"language": "Python"}`
  - When: Merge is executed
  - Then: All three occurrences are replaced with `"Python"`
- **TC-2.1c: Multiple fields**
  - Given: Content with `{{language}}` and `{{code}}` and values for both
  - When: Merge is executed
  - Then: Both fields are replaced with their respective values
- **TC-2.1d: Empty string value**
  - Given: Content `"Write in {{language}}"` and values `{"language": ""}`
  - When: Merge is executed
  - Then: Result is `"Write in "` and `language` is not in `unfilledFields` (empty string counts as filled)

**AC-2.2:** Merge response includes the list of unfilled fields in first-occurrence order

- **TC-2.2a: All fields filled**
  - Given: Content has `{{a}}` and `{{b}}`, values has both
  - When: Merge is executed
  - Then: `unfilledFields` is `[]`
- **TC-2.2b: Some fields unfilled**
  - Given: Content has `{{a}}` and `{{b}}`, values has only `{"a": "value"}`
  - When: Merge is executed
  - Then: `unfilledFields` is `["b"]`
- **TC-2.2c: No values supplied**
  - Given: Content has `{{a}}` and `{{b}}`, values is empty `{}`
  - When: Merge is executed
  - Then: `unfilledFields` is `["a", "b"]`

**AC-2.3:** Unfilled fields remain as `{{fieldName}}` in the merged content

- **TC-2.3a: Partial merge**
  - Given: Content `"{{greeting}} in {{language}}"` and values `{"greeting": "Hello"}`
  - When: Merge is executed
  - Then: Result is `"Hello in {{language}}"`

**AC-2.4:** Merge with no merge fields in content returns content unchanged

- **TC-2.4a: No-op merge**
  - Given: Content `"Just a plain prompt"` and values `{"anything": "value"}`
  - When: Merge is executed
  - Then: Result is `"Just a plain prompt"` and `unfilledFields` is `[]`
- **TC-2.4b: Empty content**
  - Given: Content is `""` (empty string) and values is `{"anything": "value"}`
  - When: Merge is executed
  - Then: Result is `""` and `mergeFields` is `[]` and `unfilledFields` is `[]`

**AC-2.5:** Merge does not modify the stored prompt

- **TC-2.5a: Original prompt unchanged**
  - Given: A prompt is merged with values
  - When: The same prompt is fetched again
  - Then: Content still contains the original `{{fieldName}}` tokens

**AC-2.6:** Extra dictionary keys not matching any merge field are ignored

- **TC-2.6a: Extra values**
  - Given: Content has `{{a}}` only, values has `{"a": "1", "b": "2"}`
  - When: Merge is executed
  - Then: Merge succeeds, `{{a}}` replaced, `"b"` ignored silently

**AC-2.7:** Merge values are substituted literally with no recursive processing (see A7)

- **TC-2.7a: Value containing merge field syntax**
  - Given: Content `"Hello {{name}}"` and values `{"name": "{{other}}"}`
  - When: Merge is executed
  - Then: Result is `"Hello {{other}}"` - the `{{other}}` in the output is literal text, not processed as a merge field
- **TC-2.7b: Value containing newlines**
  - Given: Content `"Code: {{code}}"` and values `{"code": "line1\nline2\nline3"}`
  - When: Merge is executed
  - Then: Result is `"Code: line1\nline2\nline3"` - newlines preserved literally

**AC-2.8:** Successful merge increments the prompt's usage count

- **TC-2.8a: Usage tracked on merge**
  - Given: A prompt with usage count N
  - When: Merge completes successfully
  - Then: Usage count is N+1
- **TC-2.8b: Failed merge (404) does not increment usage**
  - Given: A merge request for a nonexistent slug
  - When: Merge returns 404
  - Then: No usage count is modified
- **TC-2.8c: Validation failure (400) does not increment usage**
  - Given: A merge request with missing or invalid `values` key
  - When: Merge returns 400
  - Then: No usage count is modified

## Error Paths

| Scenario | Expected Response |
|----------|------------------|
| Prompt slug not found | 404 `{ error: "Prompt not found" }` |
| Invalid/missing values dictionary | 400 `{ error: "<validation message>" }` |

## Definition of Done

- [ ] Endpoint exists and matches request/response contract
- [ ] Usage tracking is triggered only on successful merges
- [ ] Error semantics match existing codebase patterns (`{ error: "..." }`)

## Technical Implementation

### Architecture Context

This story adds a stateless merge endpoint to the REST API. The endpoint fetches a prompt, runs `mergeContent()` on it, and returns the merged result. It does not modify the stored prompt.

**Handler Flow:**

```typescript
// src/routes/prompts.ts — mergePromptHandler

1. Validate auth (userId from JWT) -> 401 if missing
2. Validate slug param (SlugSchema) -> 400 if invalid
3. Parse body with MergeRequestSchema -> 400 if values missing/invalid
4. Fetch prompt via Convex getPromptBySlug -> 404 { error: "Prompt not found" }
5. Call mergeContent(prompt.content, values) -> { content, mergeFields, unfilledFields }
6. Fire-and-forget trackPromptUse(slug)
7. Return 200 { content, mergeFields, unfilledFields }
```

**Usage tracking semantics:** Step 6 uses fire-and-forget, matching the existing `POST /:slug/usage` handler pattern in `routes/prompts.ts`. AC-2.8 (usage count increment) is **best-effort eventual** — the increment fires asynchronously and is not guaranteed to complete before the merge response returns. This matches how all usage tracking works in this codebase. In practice, Convex mutations complete in single-digit ms; integration tests verify the count after a round-trip, which provides sufficient delay.

**Error responses** follow the existing codebase convention: `{ error: "human-readable message" }`. No structured `code` field in the response body. This matches every other endpoint in `routes/prompts.ts`.

| Status | Response | When |
|--------|----------|------|
| 404 | `{ error: "Prompt not found" }` | No prompt with given slug |
| 400 | `{ error: "<Zod issue message>" }` | `values` missing or invalid type |

**Merge operation sequence:**

```
  Client                    Fastify                      Convex
    |                          |                            |
    |  POST /:slug/merge       |                            |
    |  { values: {...} }       |                            |
    |-------------------------->|                            |
    |                          |  getPromptBySlug(slug)     |
    |                          |---------------------------->|
    |                          |<----------------------------|
    |                          |  { content, mergeFields }  |
    |                          |                            |
    |                          |  mergeContent(content, values)
    |                          |  (src/lib/merge.ts)        |
    |                          |                            |
    |                          |  trackPromptUse(slug)      |
    |                          |---------------------------->|
    |                          |<----------------------------|
    |                          |                            |
    |  { content, mergeFields, |                            |
    |    unfilledFields }      |                            |
    |<--------------------------|                            |
```

### Interfaces & Contracts

**Creates:**

```typescript
// New route registration in registerPromptRoutes():
fastify.post(
  "/api/prompts/:slug/merge",
  { preHandler: authMiddleware },
  mergePromptHandler,
);

// Handler signature:
async function mergePromptHandler(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void>
```

REST endpoint contract:
- **Method:** `POST`
- **Path:** `/api/prompts/:slug/merge`
- **Auth:** Required (JWT via `authMiddleware`)
- **Request body:** `{ values: Record<string, string> }` — validated by `MergeRequestSchema`
- **Success response (200):** `{ content: string; mergeFields: string[]; unfilledFields: string[] }`
- **Error responses:** 404 `{ error: "Prompt not found" }`, 400 `{ error: "<Zod message>" }`

**Consumes (from Story 0):**

```typescript
// src/lib/merge.ts
import { mergeContent } from "./merge";
// mergeContent(content: string, values: Record<string, string>): MergeResult

// src/schemas/prompts.ts
import { MergeRequestSchema, MergeResponseSchema } from "../schemas/prompts";
```

**Consumes (existing):**

```typescript
// convex/_generated/api
api.prompts.getPromptBySlug  // fetch prompt content
api.prompts.trackPromptUse   // fire-and-forget usage increment
```

### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-2.1a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > replaces single field single occurrence` | Fastify inject; mock Convex `getPromptBySlug` to return fixture content; assert response `content` has value substituted |
| TC-2.1b | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > replaces single field multiple occurrences` | Same approach; fixture with 3x `{{language}}`; assert all replaced |
| TC-2.1c | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > replaces multiple fields` | Same approach; two-field fixture; assert both replaced |
| TC-2.1d | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > empty string counts as filled` | Values `{"language": ""}`; assert `language` NOT in `unfilledFields` |
| TC-2.2a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > unfilledFields empty when all filled` | Provide all values; assert `unfilledFields: []` |
| TC-2.2b | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > unfilledFields lists missing fields` | Omit one value; assert `unfilledFields` contains it |
| TC-2.2c | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > unfilledFields lists all when values empty` | Values `{}`; assert `unfilledFields` matches all `mergeFields` |
| TC-2.3a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > unfilled fields remain as {{fieldName}}` | Partial values; assert `{{fieldName}}` tokens remain literally in content |
| TC-2.4a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > no-op merge returns content unchanged` | No-field content; assert content unchanged + `mergeFields: []` + `unfilledFields: []` |
| TC-2.4b | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > empty content returns empty unchanged` | Empty string content; assert all fields empty |
| TC-2.5a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > original prompt unchanged after merge` | Assert handler does not call any content-modifying Convex mutation (`updatePromptBySlug`); usage tracking via `trackPromptUse` is allowed and expected |
| TC-2.6a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > extra values are ignored` | Extra keys in values dict; assert merge succeeds, extras ignored |
| TC-2.7a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > value containing merge syntax is literal` | Value is `"{{other}}"`; assert output contains literal `{{other}}`, not processed |
| TC-2.7b | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > value containing newlines is preserved` | Value with `\n`; assert newlines in response content |
| TC-2.8a | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > successful merge increments usage count` | Assert Convex `trackPromptUse` called once on 200 response |
| TC-2.8b | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > 404 merge does not increment usage` | Mock `getPromptBySlug` returns null; assert `trackPromptUse` not called |
| TC-2.8c | tests/service/prompts/mergePrompt.test.ts | `POST /api/prompts/:slug/merge > 400 validation failure does not increment usage` | Invalid body; assert `trackPromptUse` not called |

### Non-TC Decided Tests

| Test File | Test Description | Source |
|-----------|------------------|--------|
| tests/integration/merge.test.ts | `GET prompt via real API returns mergeFields` | Tech Design §4. Integration — TC-1.1a + TC-1.3b |
| tests/integration/merge.test.ts | `Full merge via real API returns correct content` | Tech Design §4. Integration — TC-2.1c + TC-2.2a |
| tests/integration/merge.test.ts | `Partial merge preserves unfilled fields` | Tech Design §4. Integration — TC-2.3a + TC-2.2b |
| tests/integration/merge.test.ts | `Usage count incremented after merge` | Tech Design §4. Integration — TC-2.8a |
| tests/integration/merge.test.ts | `401 without auth token` | Tech Design §4. Integration |
| tests/integration/merge.test.ts | `400 with missing values key` | Tech Design §4. Integration |
| tests/integration/merge.test.ts | `404 with nonexistent slug` | Tech Design §4. Integration |

These integration tests run against the real server via `bun run check:local` (requires local server running). They are Layer 2 verification — not CI-scoped, but high-signal for catching issues that mocked service tests miss.

### Risks & Constraints

- **Request validation:** `MergeRequestSchema` (`z.record(z.string(), z.string())`) must reject non-object and non-string values. A body like `{ values: { a: 123 } }` must return 400, not produce a surprising merge.
- **Security:** Merge values are substituted as plain strings by `mergeContent`. The endpoint must not interpret values as HTML, template syntax, or anything else. This is handled by the merge utility's literal substitution, not by the route handler.
- **Usage tracking ordering:** `trackPromptUse` must fire only after a successful merge (step 6, after step 5 succeeds). It must NOT fire on 404 (step 4 failure) or 400 (step 2/3 failure). The fire-and-forget pattern means the handler doesn't await the result.
- **No content mutation:** The handler fetches content, merges in memory, and returns the result. It never calls `updatePromptBySlug` or any content-modifying mutation. TC-2.5a verifies this invariant.

### Spec Deviation

Checked against Tech Design: §1. High Altitude — External Contract Changes (REST API, Error Responses), §2. Medium Altitude — Flow 2: Merge Operation, §3. Low Altitude — REST Endpoint: `src/routes/prompts.ts`, §4. TC-to-Test Mapping — Merge Endpoint, §4. TC-to-Test Mapping — Integration.

**Deviation — error codes:** The epic's error table lists machine-readable codes (`PROMPT_NOT_FOUND`, `INVALID_VALUES`). The tech design intentionally omits a `code` field from the response body. No existing endpoint in the codebase returns structured error codes — every error is `{ error: "message" }`. Introducing a `code` field for one endpoint would create an API inconsistency. The HTTP status code (404/400) is sufficient for programmatic error handling. The epic's error code column is treated as documentation labels, not response fields.

## Technical Checklist

- [ ] Schemas already created in Story 0 (`MergeRequestSchema`, `MergeResponseSchema`). Verify they're importable.
- [ ] Add `mergePromptHandler` to `src/routes/prompts.ts`: auth check, slug validation, body parse, Convex fetch, merge, fire-and-forget tracking, response.
- [ ] Register route: `fastify.post("/api/prompts/:slug/merge", { preHandler: authMiddleware }, mergePromptHandler)`.
- [ ] Add service tests in `tests/service/prompts/mergePrompt.test.ts` (~17 tests covering all TC-2.* mappings).
- [ ] Add integration tests in `tests/integration/merge.test.ts` (~7 tests).
- [ ] Verify: `bun run typecheck && bun run test`.
- [ ] Optional: `bun run check:local` (integration tests against local server).

---
