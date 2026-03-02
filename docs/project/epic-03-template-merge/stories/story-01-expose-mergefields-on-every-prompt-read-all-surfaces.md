# Story 1: Expose `mergeFields` On Every Prompt Read (All Surfaces)

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Every prompt read response (list/search/single fetch) includes a deduplicated
`mergeFields: string[]` derived from content, with first-occurrence ordering.

## Scope

### In Scope
- Derive `mergeFields` from content on every prompt read operation
- Ensure list/search endpoints include `mergeFields` for each returned prompt
- Ensure the value is consistent across REST, MCP, and web UI (because all read through the same Convex DTO)

### Out of Scope
- Merge endpoint or merge UI behavior (Stories 2+)
- Persisting any merge-related metadata (explicitly out of scope in the epic)

## Dependencies / Prerequisites

- Story 0 complete

## Acceptance Criteria

**AC-1.1:** Every prompt response includes a `mergeFields` string array

- **TC-1.1a: Prompt with merge fields**
  - Given: A prompt with content containing `{{language}}` and `{{code}}`
  - When: The prompt is fetched via any surface (API, CLI, MCP, web UI)
  - Then: Response includes `mergeFields: ["language", "code"]`
- **TC-1.1b: Prompt with no merge fields**
  - Given: A prompt with content containing no `{{...}}` tokens
  - When: The prompt is fetched
  - Then: Response includes `mergeFields: []`
- **TC-1.1c: Prompt with duplicate field names**
  - Given: A prompt with `{{language}}` appearing three times in content
  - When: The prompt is fetched
  - Then: `mergeFields` contains `"language"` once

**AC-1.2:** Merge field order matches first-occurrence order in content

- **TC-1.2a: Field ordering**
  - Given: Content is `"Write {{code}} in {{language}} using {{framework}}"`
  - When: The prompt is fetched
  - Then: `mergeFields` is `["code", "language", "framework"]`

**AC-1.3:** Merge fields are extracted from all prompt read operations

- **TC-1.3a: List/search endpoints**
  - Given: Prompts with merge fields exist
  - When: Prompts are returned via list or search
  - Then: Each prompt in the response includes its `mergeFields` array
- **TC-1.3b: Single prompt fetch**
  - Given: A prompt with merge fields exists
  - When: Fetched by slug via API, CLI, MCP, or web UI
  - Then: Response includes `mergeFields` array

**AC-1.4:** Parser only matches valid field name syntax (see A3)

- **TC-1.4a: Valid field names extracted**
  - Given: Content contains `{{language}}`, `{{my_var}}`, `{{_private}}`
  - When: The prompt is fetched
  - Then: `mergeFields` is `["language", "my_var", "_private"]`
- **TC-1.4b: Empty braces ignored**
  - Given: Content contains `{{}}`
  - When: The prompt is fetched
  - Then: `mergeFields` is `[]`
- **TC-1.4c: Whitespace inside braces not trimmed**
  - Given: Content contains `{{ name }}` (spaces inside braces)
  - When: The prompt is fetched
  - Then: `mergeFields` is `[]` - `{{ name }}` is not a valid merge field
- **TC-1.4d: Invalid characters in field name**
  - Given: Content contains `{{my field}}` (space in name) and `{{foo.bar}}` (dot in name)
  - When: The prompt is fetched
  - Then: Neither appears in `mergeFields`

## Definition of Done

- [ ] `mergeFields` appears on every prompt DTO returned from Convex reads
- [ ] REST list/search/single fetch responses include `mergeFields`
- [ ] MCP `get_prompt`, `list_prompts`, and `search_prompts` payloads include `mergeFields`

## Technical Implementation

### Architecture Context

This story is a read-path DTO enrichment. Every prompt read response gains a `mergeFields: string[]` field, derived from content at query time using `extractMergeFields()` from Story 0. No new endpoints, no new UI behavior — just DTO shape changes across all read paths.

**Read Path Flow:**

```
  Convex Query Handler
       |
       v
  model/prompts.ts
  +-- getBySlug()         -> calls extractMergeFields(content), adds to return
  +-- listByUser()        -> calls extractMergeFields(content) in .map()
  +-- listPromptsRanked() -> via toDTOv2(), which calls extractMergeFields
  +-- searchPrompts()     -> via toDTOv2(), which calls extractMergeFields
       |
       v
  extractMergeFields(content)  [convex/model/merge.ts]
  +-- Regex: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
  +-- Deduplicate by Set, preserve first-occurrence order
  +-- Return string[]
```

All read paths — including the legacy `listPrompts` query — return `mergeFields`. No exceptions. `listPromptsRanked()` and `searchPrompts()` go through `toDTOv2()` (automatic), while `getBySlug()` and `listByUser()` (used by legacy `listPrompts`) add `extractMergeFields` directly in their return objects. Both paths must be updated.

**Surface impact:**

| Surface | How it receives mergeFields | Notes |
|---------|---------------------------|-------|
| REST API | Pass-through from Convex DTO — Zod schemas must accept the new field | `GET /api/prompts`, `GET /api/prompts/:slug` |
| MCP | `get_prompt`, `list_prompts`, `search_prompts` all serialize Convex DTOs — `mergeFields` appears automatically | No MCP handler code changes needed |
| Web UI | `prompts.html` uses REST list results — prompt objects gain `mergeFields` for merge-mode gating (Story 6) | No UI code changes in this story |

### Interfaces & Contracts

**Updates to `convex/model/prompts.ts`:**

```typescript
// Updated PromptDTO interface
export interface PromptDTO {
  slug: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  mergeFields: string[];  // NEW
  parameters?: { ... }[];
}

// Updated PromptDTOv2 (extends PromptDTO)
export interface PromptDTOv2 extends PromptDTO, PromptMeta {}

// Updated toDTOv2()
function toDTOv2(prompt: { ... }): PromptDTOv2 {
  return {
    slug: prompt.slug,
    name: prompt.name,
    description: prompt.description,
    content: prompt.content,
    tags: prompt.tagNames,
    mergeFields: extractMergeFields(prompt.content),  // NEW
    parameters: prompt.parameters,
    pinned: prompt.pinned ?? false,
    favorited: prompt.favorited ?? false,
    usageCount: prompt.usageCount ?? 0,
    lastUsedAt: prompt.lastUsedAt,
  };
}

// Updated getBySlug() return
return {
  slug: prompt.slug,
  name: prompt.name,
  description: prompt.description,
  content: prompt.content,
  tags: prompt.tagNames,
  mergeFields: extractMergeFields(prompt.content),  // NEW
  parameters: prompt.parameters,
};

// Updated listByUser() — both map() calls in the function
return prompts.map((prompt) => ({
  slug: prompt.slug,
  name: prompt.name,
  description: prompt.description,
  content: prompt.content,
  tags: prompt.tagNames,
  mergeFields: extractMergeFields(prompt.content),  // NEW
  parameters: prompt.parameters,
}));
```

**Updates to `convex/prompts.ts` — Convex return type validators:**

```typescript
// Add mergeFields to ALL prompt return schemas:

// getPromptBySlug.returns
v.union(
  v.null(),
  v.object({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    mergeFields: v.array(v.string()),  // NEW
    parameters: v.optional(parameterSchema),
  }),
)

// listPrompts.returns
v.array(
  v.object({
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    mergeFields: v.array(v.string()),  // NEW
    parameters: v.optional(parameterSchema),
  }),
)

// promptDtoV2Schema (used by listPromptsRanked + searchPrompts)
const promptDtoV2Schema = v.object({
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  content: v.string(),
  tags: v.array(v.string()),
  mergeFields: v.array(v.string()),  // NEW
  parameters: v.optional(parameterSchema),
  pinned: v.boolean(),
  favorited: v.boolean(),
  usageCount: v.number(),
  lastUsedAt: v.optional(v.number()),
});
```

**Updates to `src/schemas/prompts.ts` — Zod schemas:**

```typescript
// Add to PromptDTOSchema
export const PromptDTOSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  mergeFields: z.array(z.string()),  // NEW
  parameters: z.array(ParameterSchema).optional(),
});

// PromptDTOv2Schema — mergeFields added explicitly
// (PromptDTOv2Schema extends PromptInputSchema, not PromptDTOSchema)
export const PromptDTOv2Schema = PromptInputSchema.extend({
  mergeFields: z.array(z.string()),  // NEW
  pinned: z.boolean(),
  favorited: z.boolean(),
  usageCount: z.number(),
  lastUsedAt: z.number().optional(),
});
```

### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-1.1a | tests/service/prompts/getPrompt.test.ts | `GET /api/prompts/:slug > response includes mergeFields array` | Mock Convex `getPromptBySlug` return including `mergeFields: ["language", "code"]`, assert response JSON includes it |
| TC-1.1b | tests/service/prompts/getPrompt.test.ts | `GET /api/prompts/:slug > response includes mergeFields: [] when none` | Mock Convex return with `mergeFields: []`, assert response JSON includes empty array |
| TC-1.1c | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > deduplicates repeated field names` | Pure function unit test (Story 0 test file) |
| TC-1.2a | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > preserves first-occurrence order` | Pure function unit test (Story 0 test file) |
| TC-1.3a | tests/service/prompts/listPrompts.test.ts | `GET /api/prompts > list response items include mergeFields array` | Mock Convex list/search returns including mergeFields; assert response includes it per item |
| TC-1.3b | tests/service/prompts/getPrompt.test.ts | `GET /api/prompts/:slug > single fetch includes mergeFields` | Covered by TC-1.1a path |
| TC-1.4a | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > extracts valid field names (letters, underscores, digits)` | Pure function unit test (Story 0 test file) |
| TC-1.4b | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > ignores empty braces {{}}` | Pure function unit test (Story 0 test file) |
| TC-1.4c | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > ignores whitespace inside braces {{ name }}` | Pure function unit test (Story 0 test file) |
| TC-1.4d | tests/convex/prompts/mergeFields.test.ts | `extractMergeFields > ignores invalid characters in field names` | Pure function unit test (Story 0 test file) |

Note: TC-1.1c, TC-1.2a, TC-1.4a-d are parser tests that live in Story 0's test file. They verify the parser contract that this story's DTO enrichment depends on.

### Non-TC Decided Tests

| Test File | Test Description | Source |
|-----------|------------------|--------|
| tests/service/prompts/listPrompts.test.ts | `GET /api/prompts?q=... > search response items include mergeFields array` | Tech Design §4. TC-to-Test Mapping — List/Search DTO |

This is the search variant of TC-1.3a. The tech design maps it separately because list and search exercise different Convex query paths (`listPromptsRanked` vs `searchPrompts`), both going through `toDTOv2()`.

### Risks & Constraints

- **Test churn (~15-20 existing tests):** Every mock that returns a prompt DTO needs `mergeFields` added (often `mergeFields: []`). This is mechanical but is the most likely source of "many tests red." Expect to spend most of this story's time updating existing mocks/assertions.
- **Convex validator completeness:** Forgetting a `returns:` validator update in `convex/prompts.ts` causes runtime/schema mismatch failures at Convex deploy time. Update ALL `v.object()` validators — including the legacy `listPrompts.returns`.
- **Legacy read paths:** `getBySlug()` and `listByUser()` add `extractMergeFields` directly in their return objects (not through `toDTOv2()`). Both must be updated independently.

### Spec Deviation

None. Checked against Tech Design: §1. High Altitude — External Contract Changes (REST API, MCP Tools), §2. Medium Altitude — Flow 1: Merge Field Extraction (Read Path), §3. Low Altitude — DTO Changes: `convex/model/prompts.ts`, §3. Low Altitude — Convex Return Type Changes: `convex/prompts.ts`, §3. Low Altitude — Zod Schema Changes: `src/schemas/prompts.ts`.

## Technical Checklist

- [ ] Import `extractMergeFields` in `convex/model/prompts.ts`.
- [ ] Add `mergeFields: extractMergeFields(prompt.content)` to `toDTOv2()`, `getBySlug()`, and both `listByUser()` map paths.
- [ ] Add `mergeFields: v.array(v.string())` to ALL Convex return validators in `convex/prompts.ts`: `getPromptBySlug.returns`, `listPrompts.returns`, `promptDtoV2Schema`.
- [ ] Add `mergeFields: z.array(z.string())` to `PromptDTOSchema` and `PromptDTOv2Schema` in `src/schemas/prompts.ts`.
- [ ] Update all existing service test mocks that return prompt DTOs to include `mergeFields` (expect ~15-20 files).
- [ ] Add new assertions for `mergeFields` presence in `getPrompt.test.ts` and `listPrompts.test.ts`.
- [ ] Verify: `bun run typecheck && bun run test`.

---
