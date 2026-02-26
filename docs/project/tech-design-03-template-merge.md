# Tech Design: Epic 03 — Template Merge

**Epic:** [epic-03-template-merge.md](./epic-03-template-merge.md)
**Status:** Draft
**Author:** Tech Lead

---

## 0. Spec Validation

Answers to the epic's three tech design questions.

### Q1: Where does merge field extraction live?

**Convex model layer** (`convex/model/merge.ts`) — a pure function `extractMergeFields(content: string): string[]`.

Called by `toDTOv2()`, `getBySlug()`, and `listByUser()` in `convex/model/prompts.ts`, so every prompt read response includes `mergeFields` automatically. All surfaces (REST, MCP, Web UI) receive `mergeFields` from the Convex query response with zero post-processing.

Rationale: Single point of change. Parser runs in Convex's edge runtime (single regex pass, negligible cost at 100k chars). No surface-level code needs to know how fields are extracted.

### Q2: What happens to the existing `parameters` schema field?

**Leave inert.** No migration, no deprecation notice. The field is `v.optional(...)` in the schema and `z.optional()` in Zod — it costs nothing to keep. Removing it would require a Convex schema push and client-side schema changes for zero user value. If a future epic adds typed parameters, the field is already there.

### Q3: How should rendered view styling for merge fields differ from existing `rendered-var` styling?

The existing `renderMarkdown()` in `prompt-viewer.js` protects `{{vars}}` through markdown-it processing and outputs them as `<span class="rendered-var">fieldName</span>` — a passive inline highlight. In merge mode, these spans are replaced with interactive inputs styled as fill-in-the-blank slots:

- **Passive (`rendered-var`):** Inline span with muted background, shows field name. Not clickable.
- **Interactive (merge input):** Inline `<span class="merge-input-wrapper">` containing an `<input>`, with `{{` / `}}` brace decorators on the wrapper via CSS `::before` / `::after` (bare `<input>` elements are replaced elements and cannot have pseudo-elements). Placeholder shows field name. Visually larger/more prominent than the passive span, with a distinct border that changes when filled. Tab order is preserved — only the `<input>` inside the wrapper is focusable.

Implementation uses a **pre-processing** approach to avoid ambiguity between valid and invalid tokens. Merge-mode.js pre-processes raw content before rendering:

1. Scan raw content with the strict merge field regex (`/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g`)
2. Replace each valid `{{fieldName}}` with a unique placeholder (e.g., `%%%MERGE_0_name%%%`)
3. Call `renderMarkdown()` on the modified content — invalid tokens like `{{ name }}` still match `renderMarkdown`'s loose regex and become passive `.rendered-var` spans as normal
4. In the rendered HTML, replace each `%%%MERGE_N_field%%%` text node with the interactive `<span class="merge-input-wrapper"><input ...></span>` element

This avoids the ambiguity of post-processing `.rendered-var` spans. `renderMarkdown` uses a loose regex (`/\{\{([^}]+)\}\}/g`) that trims whitespace, so `{{ name }}` produces a span with textContent "name" — identical to a span from valid `{{name}}`. Pre-processing ensures only tokens matched by the strict regex become inputs, regardless of what `renderMarkdown` does with the remaining tokens.

**Regex mismatch (handled by pre-processing):** `renderMarkdown` uses `/\{\{([^}]+)\}\}/g` (anything inside braces) while the merge parser uses `/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g` (valid identifiers only). Because merge-mode.js replaces valid tokens before `renderMarkdown` runs, `renderMarkdown` only sees invalid tokens (which become passive `.rendered-var` spans) and the `%%%MERGE_N%%%` placeholders (which pass through as plain text). No ambiguity, even when content contains both `{{name}}` and `{{ name }}`.

---

## 1. High Altitude — System Context

### External Contract Changes

#### REST API

| Endpoint | Method | Change |
|----------|--------|--------|
| `GET /api/prompts` | GET | Response items gain `mergeFields: string[]` |
| `GET /api/prompts/:slug` | GET | Response gains `mergeFields: string[]` |
| `POST /api/prompts/:slug/merge` | POST | **New.** Merge operation |

**Error responses** follow the existing codebase convention: `{ error: "human-readable message" }`. No structured `code` field. Matches every other endpoint in `routes/prompts.ts`.

| Status | Response | When |
|--------|----------|------|
| 404 | `{ error: "Prompt not found" }` | No prompt with given slug |
| 400 | `{ error: "<Zod issue message>" }` | `values` missing or invalid type |

**Spec deviation — error codes:** The epic's error table ([epic-03-template-merge.md, Data Contracts § Error Responses](./epic-03-template-merge.md)) lists machine-readable codes (`PROMPT_NOT_FOUND`, `INVALID_VALUES`). This design intentionally omits a `code` field from the response body. No existing endpoint in the codebase returns structured error codes — every error is `{ error: "message" }`. Introducing a `code` field for one endpoint would create an API inconsistency. The HTTP status code (404/400) is sufficient for programmatic error handling. Epic error code column is treated as documentation labels.

#### MCP Tools

| Tool | Change |
|------|--------|
| `get_prompt` | Response gains `mergeFields` (automatic via Convex DTO) |
| `list_prompts` | Response items gain `mergeFields` (automatic via Convex DTO) |
| `search_prompts` | Response items gain `mergeFields` (automatic via Convex DTO) |
| `merge_prompt` | **New tool.** Accepts slug + values, returns merged content |

#### CLI (liminaldb-cli)

| Command | Change |
|---------|--------|
| `liminaldb get <slug>` | Output includes `mergeFields` (automatic via API) |
| `liminaldb merge <slug>` | **New command.** `--<field> <value>` flags |

**Handoff artifact:** The `POST /api/prompts/:slug/merge` contract (`MergeRequestSchema` / `MergeResponseSchema`) is the API surface the CLI consumes. CLI implementation and tests live in the `liminaldb-cli` repo.

#### Web UI

| Surface | Change |
|---------|--------|
| Prompt viewer | Merge button visible when `mergeFields.length > 0` |
| Merge mode | Rendered (markdown) view with interactive `{{field}}` inputs, dirty-state confirmation, mode exclusion with line edit |
| Line edit | Persistence fix (bead `promptdb-utq`): save to Convex immediately instead of Redis draft. Bundled into Story 2. |

### Data Flow

```
                    ┌──────────────────────────────────────┐
                    │  Convex (Query Layer)                  │
                    │                                        │
                    │  getBySlug() ─┐                        │
                    │  listByUser() ─┤                       │
                    │  listPromptsRanked() ─┤                │
                    │  searchPrompts() ─┤   ▼                │
                    │                   toDTOv2() / toDTO()  │
                    │                       │                │
                    │                       ▼                │
                    │               extractMergeFields()     │
                    │               (convex/model/merge.ts)  │
                    │                       │                │
                    │                       ▼                │
                    │              { ...dto, mergeFields }   │
                    └───────────────────┬──────────────────┘
                                        │
             ┌──────────────────────────┼──────────────────────────┐
             │                          │                          │
     ┌───────▼───────┐        ┌────────▼────────┐       ┌────────▼────────┐
     │  REST Routes   │        │  MCP Tools       │       │  Web UI          │
     │                │        │                  │       │                  │
     │ GET /prompts   │        │ get_prompt       │       │ View mode:       │
     │ GET /:slug     │        │ list_prompts     │       │   shows merge    │
     │ POST /:slug/   │        │ search_prompts   │       │   button if      │
     │   merge        │        │ merge_prompt     │       │   mergeFields>0  │
     └────────────────┘        └─────────────────┘       └─────────────────┘
```

Merge operation (stateless):

```
  Client                    Fastify                      Convex
    │                          │                            │
    │  POST /:slug/merge       │                            │
    │  { values: {...} }       │                            │
    │─────────────────────────▶│                            │
    │                          │  getPromptBySlug(slug)     │
    │                          │───────────────────────────▶│
    │                          │◀───────────────────────────│
    │                          │  { content, mergeFields }  │
    │                          │                            │
    │                          │  mergeContent(content, values)
    │                          │  (src/lib/merge.ts)        │
    │                          │                            │
    │                          │  trackPromptUse(slug)      │
    │                          │───────────────────────────▶│
    │                          │◀───────────────────────────│
    │                          │                            │
    │  { content, mergeFields, │                            │
    │    unfilledFields }      │                            │
    │◀─────────────────────────│                            │
```

---

## 2. Medium Altitude — Module Architecture

### File Map

#### New Files

| File | Purpose | Layer |
|------|---------|-------|
| `convex/model/merge.ts` | `extractMergeFields()` — parser | Convex model |
| `src/lib/merge.ts` | `mergeContent()` — string replacement | API utility |
| `public/js/components/merge-mode.js` | Merge mode UI component | Web UI |

#### Modified Files

| File | Change | Impact |
|------|--------|--------|
| `convex/model/prompts.ts` | Import `extractMergeFields`, add to `toDTOv2()`, `getBySlug()`, and `listByUser()` | All read paths |
| `convex/prompts.ts` | Add `mergeFields` to all return type validators (`promptDtoV2Schema`, `getPromptBySlug.returns`, `listPrompts.returns`) | Convex type safety |
| `src/schemas/prompts.ts` | Add `mergeFields: z.array(z.string())` to `PromptDTOSchema` and `PromptDTOv2Schema` | Zod validation |
| `src/routes/prompts.ts` | Register `POST /api/prompts/:slug/merge` handler | New endpoint |
| `src/lib/mcp.ts` | Register `merge_prompt` tool | New MCP tool |
| `src/ui/templates/prompts.html` | Merge toggle, mode state machine (enter/exit/dirty/confirm), hide authoring controls, save-before-switch, prompt navigation guard | Web UI — significant |
| `public/js/components/prompt-viewer.js` | Expose `renderMarkdown` via `window.promptViewer.renderMarkdown` for merge-mode.js access (currently file-scoped; CommonJS export only works in Node/test context). `saveCurrentLineEdit()` is defined in `prompts.html` script scope where merge-mode.js also runs — accessible at call time, no export needed. | Moderate |
| `public/shared/prompt-viewer.css` | Merge input styles scoped under `.merge-mode` class on the viewer container: `.merge-input-wrapper` with `{{`/`}}` brace decorators via `::before`/`::after`, `.merge-input-wrapper input` for filled/unfilled distinction and sizing. Class added on enter, removed on exit to prevent style bleed. | CSS |

#### New Test Files

| File | Tests | Count |
|------|-------|-------|
| `tests/convex/prompts/mergeFields.test.ts` | Parser unit tests (TC-1.1*, TC-1.2*, TC-1.4*) | ~8 |
| `tests/service/lib/merge.test.ts` | `mergeContent` unit tests (direct, not through endpoint) | ~11 |
| `tests/service/prompts/mergePrompt.test.ts` | Merge endpoint service tests (TC-2.*) | ~16 |
| `tests/service/mcp/mergePromptTool.test.ts` | MCP merge tool tests (TC-5.*) | ~4 |
| `tests/service/ui/merge-mode.test.ts` | Web UI merge mode tests (TC-3.*) | ~25 |
| `tests/integration/merge.test.ts` | End-to-end merge integration tests | ~7 |

### Flow-by-Flow Design

#### Flow 1: Merge Field Extraction (Read Path)

Every prompt read now includes `mergeFields`. No new endpoints — this is a DTO enrichment.

```
  Convex Query Handler
       │
       ▼
  model/prompts.ts
  ├── getBySlug()         → calls extractMergeFields(content), adds to return
  ├── listByUser()        → calls extractMergeFields(content) in .map()
  ├── listPromptsRanked() → via toDTOv2(), which calls extractMergeFields
  └── searchPrompts()     → via toDTOv2(), which calls extractMergeFields
       │
       ▼
  extractMergeFields(content)  [convex/model/merge.ts]
  ├── Regex: /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g
  ├── Deduplicate by Set, preserve first-occurrence order
  └── Return string[]
```

All read paths — including the legacy `listPrompts` query — return `mergeFields`. No exceptions. Note: `listPromptsRanked()` and `searchPrompts()` go through `toDTOv2()` (automatic), while `getBySlug()` and `listByUser()` (used by legacy `listPrompts`) add `extractMergeFields` directly in their return objects. Both paths must be updated in Chunk 1.

#### Flow 2: Merge Operation (POST /:slug/merge)

Stateless: fetch prompt, replace fields, return result. Does not modify stored content.

```typescript
// src/routes/prompts.ts — mergePromptHandler

1. Validate auth (userId from JWT) → 401 if missing
2. Validate slug param (SlugSchema) → 400 if invalid
3. Parse body with MergeRequestSchema → 400 if values missing/invalid
4. Fetch prompt via Convex getPromptBySlug → 404 { error: "Prompt not found" }
5. Call mergeContent(prompt.content, values) → { content, mergeFields, unfilledFields }
6. Fire-and-forget trackPromptUse(slug)
7. Return 200 { content, mergeFields, unfilledFields }
```

**Usage tracking semantics:** Step 6 uses fire-and-forget, matching the existing `POST /:slug/usage` handler pattern (`routes/prompts.ts:231`). AC-2.8 and AC-3.9 (usage count increment) are **best-effort eventual** — the increment fires asynchronously and is not guaranteed to complete before the merge response returns. This matches how all usage tracking works in this codebase. In practice, Convex mutations complete in single-digit ms; integration tests verify the count after a round-trip, which provides sufficient delay. Both the REST merge handler and MCP merge tool follow this same pattern — the duplication is intentional (each is ~10 lines, not worth extracting a shared function for).

#### Flow 3: Web UI Merge Mode

Three mutually exclusive viewer states: **normal view** (semantic, with optional line edit), **merge mode** (rendered/markdown), and **full editor**. State machine: `home | view | merge | edit | new`.

```
  View Mode (semantic, ± line edit)
       │
       │  [Click merge toggle]
       │  ├── If editingLineIndex !== null (active textarea open)
       │  │   └── Call saveCurrentLineEdit() (AC-3.8)
       │  │       ├── Save succeeds → continue
       │  │       └── Save fails → abort, show error, stay in view
       │  └── Store preMergeLineEdit = lineEditEnabled
       ▼
  Merge Mode (rendered/markdown view)
       ├── Line Edit toggle: hidden (AC-3.5)
       ├── Edit button: hidden (AC-3.5)
       ├── Content: pre-process raw content (strict regex → placeholders),
       │   renderMarkdown(), replace placeholders with <input> wrappers
       ├── mergeDirty = false
       ├── On any field input event → mergeDirty = true
       ├── On copy → POST /api/prompts/:slug/merge
       │   ├── If unfilledFields.length > 0 → show toast listing unfilled field names (non-blocking)
       │   ├── Write response.content to clipboard
       │   └── mergeDirty = false (AC-3.7c)
       │
       │  [Click merge toggle / navigate to another prompt]
       │  ├── If mergeDirty → confirm("Discard entered values?") (AC-3.7)
       │  │   ├── Confirm → exit merge
       │  │   └── Cancel → stay in merge
       │  └── If !mergeDirty → exit immediately
       ▼
  View Mode restored (AC-3.6)
       ├── If preMergeLineEdit → re-enable line edit, setup handlers
       ├── If !preMergeLineEdit → plain semantic view
       ├── localStorage lineEditEnabled: unchanged
       └── Merge field values: discarded (AC-3.12)
```

**Rendering approach:** Merge-mode.js pre-processes the raw content: replace valid `{{fieldName}}` tokens (strict regex) with `%%%MERGE_N_field%%%` placeholders, then call `renderMarkdown()` on the modified content. `renderMarkdown` is unchanged — it processes the remaining invalid tokens (like `{{ name }}`) into passive `.rendered-var` spans and passes the `%%%MERGE%%%` placeholders through as plain text. After rendering, merge-mode.js replaces each placeholder text node with an interactive `<span class="merge-input-wrapper"><input ...></span>` element. This pre-processing approach eliminates ambiguity between valid and invalid tokens that share the same trimmed name (see Q3 for details).

**Dirty-state tracking:** A single boolean `mergeDirty` in merge-mode.js. Set `true` on any field `input` event. Reset `false` after successful copy. Checked at two exit points: the merge toggle click handler, and the `selectPrompt()` navigation guard in `prompts.html`.

**Line edit save-before-switch (AC-3.8):** When merge toggle is clicked and `editingLineIndex !== null`, the handler calls the existing `saveCurrentLineEdit()` function. Currently this saves to Redis draft (bead `promptdb-utq` bug). The line edit persistence fix — changing `saveLineEdit()` to persist to Convex immediately instead of Redis draft — is bundled into this story and must be implemented before the save-before-switch wiring.

**Copy latency trade-off:** Copy waits on a network round-trip (merge API call). The alternative — client-side string replacement + fire-and-forget `POST /:slug/usage` — would be perceptually instant. Current design is simpler (one call does merge + tracking) at the cost of slight delay on copy. Acceptable for v1; optimize if user feedback warrants.

#### Flow 4: MCP merge_prompt Tool

```
  Model calls merge_prompt({ slug, values })
       │
       ▼
  src/lib/mcp.ts — merge_prompt handler
  1. Extract userId from authInfo
  2. Fetch prompt via Convex getPromptBySlug
  3. Call mergeContent(content, values)
  4. Fire-and-forget trackPromptUse(slug)
  5. Return { content, mergeFields, unfilledFields }
```

#### Flow 5: CLI merge Command

```
  liminaldb merge <slug> --language python --code "def foo(): pass"
       │
       ▼
  CLI parses flags into values dict
  POST /api/prompts/:slug/merge { values }
       │
       ├── stdout: response.content
       └── stderr: "Warning: unfilled fields: ..." (if unfilledFields.length > 0)
```

CLI implementation lives in the `liminaldb-cli` repo — this design covers the API contract only.

---

## 3. Low Altitude — Interface Definitions

### Parser: `convex/model/merge.ts`

```typescript
/**
 * Regex for valid merge field syntax.
 * Matches {{fieldName}} where fieldName starts with [a-zA-Z_]
 * and contains only [a-zA-Z0-9_].
 * Does NOT match: {{}}, {{ name }}, {{foo.bar}}, {{my field}}
 *
 * NOTE: Duplicated in src/lib/merge.ts — Convex edge runtime boundary
 * prevents sharing imports between convex/ and src/ at runtime.
 */
const MERGE_FIELD_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Extract merge field names from prompt content.
 * Returns deduplicated array in first-occurrence order.
 *
 * @param content - Prompt content string (up to 100k chars)
 * @returns Deduplicated field names in first-occurrence order
 */
export function extractMergeFields(content: string): string[] {
  const seen = new Set<string>();
  const fields: string[] = [];
  let match: RegExpExecArray | null;

  // Reset lastIndex for safety (global regex)
  MERGE_FIELD_REGEX.lastIndex = 0;

  while ((match = MERGE_FIELD_REGEX.exec(content)) !== null) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      fields.push(name);
    }
  }

  return fields;
}
```

### Merge Utility: `src/lib/merge.ts`

```typescript
/**
 * NOTE: MERGE_FIELD_REGEX is duplicated from convex/model/merge.ts —
 * Convex edge runtime boundary prevents sharing imports between
 * convex/ and src/ at runtime.
 */
const MERGE_FIELD_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

export interface MergeResult {
  /** Merged content with values substituted */
  content: string;
  /** All merge fields found in the template (first-occurrence order) */
  mergeFields: string[];
  /** Fields with no matching value in the dictionary (first-occurrence order) */
  unfilledFields: string[];
}

/**
 * Replace {{fieldName}} tokens in content with values from dictionary.
 * Unfilled fields remain as {{fieldName}} in the output.
 * Values are substituted literally — no recursive processing.
 *
 * @param content - Template content with {{field}} tokens
 * @param values - Dictionary of field name → replacement value
 * @returns Merged content, all fields, and unfilled fields
 */
export function mergeContent(
  content: string,
  values: Record<string, string>,
): MergeResult {
  const seen = new Set<string>();
  const mergeFields: string[] = [];
  const unfilledFields: string[] = [];

  // Single pass: replace fields and collect metadata simultaneously.
  // Use replace callback to avoid issues with special replacement patterns ($1, etc.)
  // Use Object.hasOwn() instead of `in` to avoid prototype pollution
  // (e.g., {{constructor}} would match Object.prototype with `in`).
  const merged = content.replace(
    MERGE_FIELD_REGEX,
    (fullMatch, fieldName: string) => {
      if (!seen.has(fieldName)) {
        seen.add(fieldName);
        mergeFields.push(fieldName);
        if (!Object.hasOwn(values, fieldName)) {
          unfilledFields.push(fieldName);
        }
      }
      if (Object.hasOwn(values, fieldName)) {
        return values[fieldName];
      }
      return fullMatch; // Leave unfilled fields as-is
    },
  );

  return { content: merged, mergeFields, unfilledFields };
}
```

### DTO Changes: `convex/model/prompts.ts`

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

### Convex Return Type Changes: `convex/prompts.ts`

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

### Zod Schema Changes: `src/schemas/prompts.ts`

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

// New: Merge request/response schemas
export const MergeRequestSchema = z.object({
  values: z.record(z.string(), z.string()),
});

export type MergeRequest = z.infer<typeof MergeRequestSchema>;

export const MergeResponseSchema = z.object({
  content: z.string(),
  mergeFields: z.array(z.string()),
  unfilledFields: z.array(z.string()),
});

export type MergeResponse = z.infer<typeof MergeResponseSchema>;
```

### REST Endpoint: `src/routes/prompts.ts`

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

### MCP Tool: `src/lib/mcp.ts`

```typescript
// New tool registration:
server.registerTool(
  "merge_prompt",
  {
    title: "Merge Prompt",
    description:
      "Fill {{fieldName}} merge fields in a prompt template with provided values. " +
      "Call get_prompt first to discover available mergeFields, then provide a " +
      "values dictionary mapping field names to replacement strings. Returns the " +
      "merged content, all merge fields, and any unfilled fields.",
    inputSchema: {
      slug: SlugSchema.describe("The prompt slug"),
      values: z.record(z.string(), z.string())
        .describe("Dictionary of field name to value"),
    },
  },
  async (args, extra) => { ... }
);
```

### Web UI Component: `public/js/components/merge-mode.js`

```javascript
/**
 * Merge Mode Component
 *
 * Pre-processes raw content: replaces valid {{fieldName}} tokens (strict
 * regex) with %%%MERGE_N_field%%% placeholders, renders via
 * window.promptViewer.renderMarkdown(), then replaces placeholder text
 * nodes with interactive <span class="merge-input-wrapper"><input></span>
 * elements. Inputs for the same field name are synchronized.
 * Copy produces merged content via POST /api/prompts/:slug/merge.
 *
 * DOM notes:
 * - Each merge input is an <input> inside a <span class="merge-input-wrapper">
 *   (required for ::before/::after brace decorators — bare <input> elements
 *   are replaced elements and cannot have pseudo-elements).
 * - Tab order is preserved: only <input> elements are focusable, wrappers
 *   are not tab stops. Natural DOM order provides Tab navigation (TC-3.10a).
 * - The viewer container gets a .merge-mode class for CSS scoping.
 *
 * State:
 * - mergeDirty: boolean — true if user has typed since last copy
 *
 * Exports:
 * - enterMergeMode(slug, content, mergeFields) → renders merge UI
 * - exitMergeMode() → tears down merge UI, clears values
 * - getMergeValues() → current field values as Record<string, string>
 * - isMergeDirty() → whether user has unsaved field entries
 * - resetMergeDirty() → called after successful copy
 */
```

### Line Edit Persistence Fix (bead `promptdb-utq`)

Bundled into Story 2. The current `saveLineEdit()` in `prompts.html:1478` calls `handleLineEdit('content', newContent)` which saves to a Redis draft with no Convex commit path. The fix:

```javascript
// Before (current — saves to Redis draft only):
handleLineEdit('content', newContent);

// After (fix — persist to Convex immediately):
// Call PUT /api/prompts/:slug with updated content
// On success: update local state, clear draft
// On failure: show error, revert line content
```

This changes `saveLineEdit()` from fire-and-forget-to-draft to an async operation that persists to Convex. The save-before-switch logic in AC-3.8 depends on this being a real save that can succeed or fail.

---

## 4. TC-to-Test Mapping

### Parser Tests — `tests/convex/prompts/mergeFields.test.ts`

| TC | Test Name |
|----|-----------|
| TC-1.1a | `extractMergeFields > returns fields from content with merge fields` |
| TC-1.1b | `extractMergeFields > returns empty array for content without merge fields` |
| TC-1.1c | `extractMergeFields > deduplicates repeated field names` |
| TC-1.2a | `extractMergeFields > preserves first-occurrence order` |
| TC-1.4a | `extractMergeFields > extracts valid field names (letters, underscores, digits)` |
| TC-1.4b | `extractMergeFields > ignores empty braces {{}}` |
| TC-1.4c | `extractMergeFields > ignores whitespace inside braces {{ name }}` |
| TC-1.4d | `extractMergeFields > ignores invalid characters in field names` |

### Merge Utility — `tests/service/lib/merge.test.ts`

Direct unit tests for `mergeContent()` — faster to run and debug than endpoint tests.

| Coverage | Test Name |
|----------|-----------|
| Single replacement | `mergeContent > replaces single field` |
| Multi-occurrence | `mergeContent > replaces all occurrences of same field` |
| Multi-field | `mergeContent > replaces multiple distinct fields` |
| Empty value | `mergeContent > empty string counts as filled` |
| Unfilled tracking | `mergeContent > tracks unfilled fields in order` |
| No-op | `mergeContent > no fields returns content unchanged` |
| Empty content | `mergeContent > empty content returns empty string` |
| Literal substitution | `mergeContent > value with {{syntax}} is not recursively processed` |
| Newlines | `mergeContent > value with newlines preserved` |
| Extra keys | `mergeContent > extra values ignored` |
| Prototype safety | `mergeContent > prototype keys (constructor, toString) do not pollute` |

### DTO Integration — `tests/service/prompts/getPrompt.test.ts` (amended)

| TC | Test Name |
|----|-----------|
| TC-1.3b | `GET /api/prompts/:slug > response includes mergeFields array` |

### List/Search DTO — `tests/service/prompts/listPrompts.test.ts` (amended)

| TC | Test Name |
|----|-----------|
| TC-1.3a (list) | `GET /api/prompts > list response items include mergeFields array` |
| TC-1.3a (search) | `GET /api/prompts?q=... > search response items include mergeFields array` |

### Merge Endpoint — `tests/service/prompts/mergePrompt.test.ts`

| TC | Test Name |
|----|-----------|
| TC-2.1a | `POST /api/prompts/:slug/merge > replaces single field single occurrence` |
| TC-2.1b | `POST /api/prompts/:slug/merge > replaces single field multiple occurrences` |
| TC-2.1c | `POST /api/prompts/:slug/merge > replaces multiple fields` |
| TC-2.1d | `POST /api/prompts/:slug/merge > empty string counts as filled` |
| TC-2.2a | `POST /api/prompts/:slug/merge > unfilledFields empty when all filled` |
| TC-2.2b | `POST /api/prompts/:slug/merge > unfilledFields lists missing fields` |
| TC-2.2c | `POST /api/prompts/:slug/merge > unfilledFields lists all when values empty` |
| TC-2.3a | `POST /api/prompts/:slug/merge > unfilled fields remain as {{fieldName}}` |
| TC-2.4a | `POST /api/prompts/:slug/merge > no-op merge returns content unchanged` |
| TC-2.4b | `POST /api/prompts/:slug/merge > empty content returns empty unchanged` |
| TC-2.5a | `POST /api/prompts/:slug/merge > original prompt unchanged after merge` |
| TC-2.6a | `POST /api/prompts/:slug/merge > extra values are ignored` |
| TC-2.7a | `POST /api/prompts/:slug/merge > value containing merge syntax is literal` |
| TC-2.7b | `POST /api/prompts/:slug/merge > value containing newlines is preserved` |
| TC-2.8a | `POST /api/prompts/:slug/merge > successful merge increments usage count` |
| TC-2.8b | `POST /api/prompts/:slug/merge > 404 merge does not increment usage` |
| TC-2.8c | `POST /api/prompts/:slug/merge > 400 validation failure does not increment usage` |

### Web UI Merge Mode — `tests/service/ui/merge-mode.test.ts`

| TC | Test Name |
|----|-----------|
| TC-3.1a | `merge mode > merge button visible for prompts with merge fields` |
| TC-3.1b | `merge mode > merge button hidden for prompts without merge fields` |
| TC-3.2a | `merge mode > content renders as markdown` |
| TC-3.2b | `merge mode > fields become prominent inputs with braces` |
| TC-3.2c | `merge mode > duplicate fields synchronize values` |
| TC-3.2d | `merge mode > filled fields are visually distinct` |
| TC-3.3a | `merge mode > copy produces fully merged content` |
| TC-3.3b | `merge mode > partial copy preserves unfilled fields` |
| TC-3.4a | `merge mode > unfilled field warning on copy` |
| TC-3.4b | `merge mode > warning does not block copy` |
| TC-3.5a | `merge mode > authoring controls hidden in merge mode` |
| TC-3.5b | `merge mode > authoring controls restored on exit` |
| TC-3.6a | `merge mode > line edit resumes if it was on` |
| TC-3.6b | `merge mode > plain view if line edit was off` |
| TC-3.6c | `merge mode > line edit localStorage preference unchanged` |
| TC-3.7a | `merge mode > confirm when fields filled but not copied` |
| TC-3.7b | `merge mode > no confirm when no fields touched` |
| TC-3.7c | `merge mode > no confirm after successful copy` |
| TC-3.7d | `merge mode > confirm if fields edited after copy` |
| TC-3.7e | `merge mode > confirm on prompt navigation with dirty fields` |
| TC-3.8a | `merge mode > active line edit saved before mode switch` |
| TC-3.8b | `merge mode > line edit save failure blocks mode switch` |
| TC-3.9a | `merge mode > full copy increments usage count` |
| TC-3.9b | `merge mode > partial copy increments usage count` |
| TC-3.9c | `merge mode > repeated copies increment each time` |
| TC-3.10a | `merge mode > tab navigates between field inputs` |
| TC-3.11a | `merge mode > HTML in value displays as literal text` |
| TC-3.12a | `merge mode > values cleared on re-entry` |
| — | `merge mode > literal %%%MERGE_N%%% text in content is not replaced` |

### CLI — Deferred to `liminaldb-cli` repo

| TC | Owner | Notes |
|----|-------|-------|
| TC-4.1a | liminaldb-cli | Basic merge via CLI. Consumes `POST /api/prompts/:slug/merge`. |
| TC-4.1b | liminaldb-cli | Prompt not found error handling. |
| TC-4.2a | liminaldb-cli | Partial merge warning to stderr. |
| TC-4.2b | liminaldb-cli | Stdout stays clean when piped. |

### MCP Merge Tool — `tests/service/mcp/mergePromptTool.test.ts`

| TC | Test Name |
|----|-----------|
| TC-5.1a | `merge_prompt tool > full merge returns merged content` |
| TC-5.1b | `merge_prompt tool > partial merge returns unfilledFields` |
| TC-5.1c | `merge_prompt tool > prompt not found returns error` |
| TC-5.2a | `get_prompt tool > response includes mergeFields array` |

### Integration — `tests/integration/merge.test.ts`

| TC | Coverage |
|----|----------|
| TC-1.1a + TC-1.3b | GET prompt via real API returns mergeFields |
| TC-2.1c + TC-2.2a | Full merge via real API returns correct content |
| TC-2.3a + TC-2.2b | Partial merge preserves unfilled fields |
| TC-2.8a | Usage count incremented after merge |
| — | 401 without auth token |
| — | 400 with missing values key |
| — | 404 with nonexistent slug |

---

## 5. Testing Strategy

### Mock Boundaries

| Layer | Mocked | Real |
|-------|--------|------|
| `tests/convex/` | Nothing (pure functions) | `extractMergeFields` logic |
| `tests/service/lib/` | Nothing (pure functions) | `mergeContent` logic |
| `tests/service/prompts/` | `convex` client, `auth/jwtValidator`, `config` | Fastify routing, Zod validation |
| `tests/service/mcp/` | `convex` client, `config` | MCP tool registration, handler logic |
| `tests/service/ui/` | `fetch` (mock API responses) | JSDOM rendering, event handling |
| `tests/integration/` | Nothing | Full stack (requires local server) |

### Test Fixtures

Shared merge test data in `tests/fixtures/merge.ts`:

```typescript
export const MERGE_FIXTURES = {
  /** Content with two distinct fields */
  twoFields: {
    content: "Write {{code}} in {{language}}",
    mergeFields: ["code", "language"],
  },
  /** Content with duplicate field */
  duplicateField: {
    content: "{{language}} is great. I love {{language}}.",
    mergeFields: ["language"],
  },
  /** Content with no fields */
  noFields: {
    content: "Just a plain prompt with no merge fields.",
    mergeFields: [],
  },
  /** Empty content */
  emptyContent: {
    content: "",
    mergeFields: [],
  },
  /** Content with literal placeholder-like text (collision guard) */
  literalPlaceholder: {
    content: "Do not replace %%%MERGE_0_name%%% in output. Field: {{name}}",
    mergeFields: ["name"],
  },
  /** Content with edge cases */
  edgeCases: {
    content: "Valid: {{a}}, {{_b}}, {{c_1}}. Invalid: {{}}, {{ x }}, {{foo.bar}}",
    mergeFields: ["a", "_b", "c_1"],
  },
} as const;
```

**Cross-function consistency:** Both `extractMergeFields()` (Convex) and `mergeContent()` (API) use the same regex pattern (duplicated due to Convex runtime boundary) and return `mergeFields` in first-occurrence order. The parser tests and merge utility tests use the same `MERGE_FIXTURES` data, which implicitly verifies both functions produce identical `mergeFields` for the same content. If either regex is modified, both test suites will catch the drift.

### Verification Script

```bash
# Full local verification (same as pre-push)
bun run check          # format + lint + typecheck + unit/service tests
bun run check:local    # above + integration tests against local server
```

No new scripts or CI changes needed — existing pipeline covers all test files via glob patterns.

**TDD phase guidance:** During TDD Red, stubs throw `NotImplementedError` so `bun run check` (which includes tests) will fail. Use `bun run format:check && bun run lint && bun run typecheck` as the Red-phase gate. During TDD Green, run full `bun run check` and verify no test files were modified. Consider adding `red-verify` and `green-verify` scripts to `package.json` in Chunk 0 if the team adopts this pattern.

---

## 6. Work Breakdown

Aligned with the epic's recommended story breakdown, subdivided into implementation chunks.

**Story-to-chunk mapping:**

| Epic Story | Tech Design Chunks | Scope |
|---|---|---|
| Story 1: Merge Engine + API / CLI / MCP | Chunks 0, 1, 2 | Parser, DTOs, endpoint, MCP tool |
| Story 2: Web UI Merge Mode | Chunk 3 | Line edit fix, merge mode UI |

### Chunk 0: Infrastructure (Foundation) — ~19 tests

**Delivers:** Types, parser, merge utility, test fixtures. No behavioral changes.

| Task | File | Description |
|------|------|-------------|
| 0.1 | `convex/model/merge.ts` | `extractMergeFields()` pure function |
| 0.2 | `src/lib/merge.ts` | `mergeContent()` utility |
| 0.3 | `src/schemas/prompts.ts` | `MergeRequestSchema`, `MergeResponseSchema` |
| 0.4 | `tests/fixtures/merge.ts` | Shared test data |
| 0.5 | `tests/convex/prompts/mergeFields.test.ts` | Parser unit tests (TC-1.1*, TC-1.2*, TC-1.4*) |
| 0.6 | `tests/service/lib/merge.test.ts` | `mergeContent` unit tests |

**ACs verified:** AC-1.4 (parser syntax rules — tested directly at this layer)

**Verification:** `bun run check` passes. Parser + merge utility tests green.

### Chunk 1: Merge Fields on All Reads (Story 1, Part A) — ~15-20 existing tests updated

**Delivers:** `mergeFields` in every prompt response. All existing read surfaces gain the field for free.

| Task | File | Description |
|------|------|-------------|
| 1.1 | `convex/model/prompts.ts` | Add `mergeFields` to `PromptDTO`, `PromptDTOv2`, `getBySlug()`, `listByUser()`, `toDTOv2()` |
| 1.2 | `convex/prompts.ts` | Add `mergeFields: v.array(v.string())` to all return type validators (including `listPrompts.returns`) |
| 1.3 | `src/schemas/prompts.ts` | Add `mergeFields` to `PromptDTOSchema`, `PromptDTOv2Schema` |
| 1.4 | Existing tests | Update mocks/assertions to expect `mergeFields` |

**Test churn note:** Task 1.4 touches ~15-20 existing test files. Every mock that returns a prompt DTO needs `mergeFields: []` (or a value matching the mock content). This is mechanical but is the most likely source of "why are many tests red." Expect to spend most of Chunk 1's time here.

**ACs covered:** AC-1.1, AC-1.2, AC-1.3

**Verification:** `bun run check` passes. All existing tests updated and green.

### Chunk 2: Merge Endpoint + MCP Tool (Story 1, Part B) — ~27 new tests

**Delivers:** `POST /api/prompts/:slug/merge` endpoint and `merge_prompt` MCP tool.

| Task | File | Description |
|------|------|-------------|
| 2.1 | `src/routes/prompts.ts` | `mergePromptHandler` + route registration |
| 2.2 | `src/lib/mcp.ts` | `merge_prompt` tool registration |
| 2.3 | `tests/service/prompts/mergePrompt.test.ts` | Merge endpoint service tests (TC-2.*) |
| 2.4 | `tests/service/mcp/mergePromptTool.test.ts` | MCP merge tool tests (TC-5.*) |
| 2.5 | `tests/integration/merge.test.ts` | Integration tests (happy + error paths) |

**ACs covered:** AC-2.1–AC-2.8, AC-5.1, AC-5.2

**CLI note:** AC-4.1, AC-4.2 (CLI merge command) are implemented in `liminaldb-cli` repo. This chunk delivers the API contract the CLI consumes.

**Verification:** `bun run check:local` passes (unit + integration).

### Chunk 3: Web UI Merge Mode (Story 2) — ~28 new tests

**Delivers:** Line edit persistence fix (bead `promptdb-utq`), interactive merge mode in the prompt viewer with rendered markdown view, dirty-state confirmation, mode exclusion with line edit, save-before-switch.

| Task | File | Description |
|------|------|-------------|
| 3.1 | `src/ui/templates/prompts.html` | **Line edit persistence fix** — change `saveLineEdit()` from Redis draft to Convex PUT. Async with error handling. (bead `promptdb-utq`) |
| 3.2 | `public/js/components/merge-mode.js` | Merge mode component: rendered view with input replacement, field sync, dirty tracking, copy via API |
| 3.3 | `public/shared/prompt-viewer.css` | Merge input styles: `{{`/`}}` brace decorators, filled/unfilled distinction, input sizing |
| 3.4 | `src/ui/templates/prompts.html` | Merge toggle, mode state machine (enter/exit/dirty/confirm), hide authoring controls, save-before-switch guard, prompt navigation guard |
| 3.5 | `public/js/components/prompt-viewer.js` | Expose `renderMarkdown` via `window.promptViewer.renderMarkdown`; `saveCurrentLineEdit()` already accessible from shared script scope |
| 3.6 | `tests/service/ui/merge-mode.test.ts` | UI tests (TC-3.1* through TC-3.12*) |

**Sequencing within chunk:** Task 3.1 (line edit persistence fix) must land first — task 3.4's save-before-switch depends on `saveLineEdit()` being a real async Convex save that can succeed or fail. Implement 3.1, verify existing line edit tests pass, then proceed to 3.2-3.6.

**ACs covered:** AC-3.1–AC-3.12

**Prerequisites:** Chunk 2 (merge endpoint must exist for copy-to-clipboard).

**Verification:** `bun run check` passes. JSDOM tests confirm merge mode, dirty-state, mode exclusion, and save-before-switch behavior.

### Chunk Dependency Graph

```
  Chunk 0 (Infrastructure, ~19 tests)
     │
     ├──▶ Chunk 1 (mergeFields on reads, ~15-20 test updates)
     │       │
     │       ├──▶ Chunk 2 (merge endpoint + MCP, ~27 tests)
     │       │       │
     │       │       └──▶ Chunk 3 (Web UI merge mode + line edit fix, ~28 tests)
     │       │               ├── 3.1: line edit persistence fix (promptdb-utq)
     │       │               └── 3.2-3.6: merge mode (depends on 3.1)
     │       │
     │       └──▶ [CLI merge command — liminaldb-cli repo]
     │
     └──────────────────────────────────────────────────────
```

---

## 7. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Parser regex edge cases (Unicode, nested braces) | Low | Low | Spec constrains field names to `[a-zA-Z_][a-zA-Z0-9_]*`. Edge cases are explicitly out of scope (A3). Comprehensive parser tests cover boundaries. |
| Existing tests break from mergeFields addition | High | Low | Chunk 1 explicitly budgets for ~15-20 mock updates. Run `bun run check` after each file. |
| Convex return type validator mismatch | Medium | Medium | Update ALL `v.object()` validators in `convex/prompts.ts` (including legacy `listPrompts.returns`) before pushing model changes. Convex will reject mismatches at deploy time. |
| String.replace special patterns ($1, $&) in values | Low | Medium | Use callback form of `replace()` instead of string replacement pattern. Already in design. |
| Prototype pollution via `in` operator | Low | Medium | Use `Object.hasOwn()` instead of `in` for value lookups in `mergeContent`. Already in design. |
| Line edit persistence fix breaks existing behavior | Medium | Medium | Task 3.1 changes `saveLineEdit()` from Redis draft to Convex PUT — changes save semantics. Run existing line edit tests after this change before proceeding to merge mode tasks. |
| Dirty-state confirmation on prompt navigation | Medium | Low | Navigation guard must intercept `selectPrompt()` — the main prompt switching function. Must not accidentally block initial page load or history-based navigation. Test TC-3.7e covers this path. |
| Merge mode + rendered view interaction with existing CSS | Low | Low | Merge mode renders markdown (not semantic view). Existing `prompt-viewer.css` styles for semantic view must not bleed into merge mode. Use a `.merge-mode` class on the viewer to scope styles. |

---

## 8. Out of Scope (Deferred)

Items explicitly excluded per the epic:

- Field metadata (type, required, description) — `parameters` field remains inert. `parameters` and `mergeFields` coexist in the DTO but are unrelated: `mergeFields` is derived from content parsing, `parameters` is stored metadata.
- Template validation/linting (malformed `{{`)
- Nested/conditional merge syntax
- Recursive merging
- Merge field auto-complete
- Persisting filled values or merge history
- Rename of staging Fly app (`promptdb-staging`)
