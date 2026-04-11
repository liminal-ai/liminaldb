# Story 3: MCP `merge_prompt` Tool

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Expose a first-class MCP tool that merges a prompt template using a values
dictionary and returns the merged content plus metadata.

## Scope

### In Scope
- New MCP tool `merge_prompt`
- Uses the same merge semantics as the REST merge endpoint

### Out of Scope
- UI behaviors (Story 6)
- CLI behaviors (Story 4)

## Dependencies / Prerequisites

- Story 0 complete
- Story 1 complete (so `get_prompt` already includes `mergeFields` discovery)

## Acceptance Criteria

**AC-5.1:** MCP merge tool accepts slug and values dictionary

- **TC-5.1a: Full merge via MCP**
  - Given: A prompt with merge fields
  - When: Model calls merge tool with all values
  - Then: Tool returns merged content with `unfilledFields: []`
- **TC-5.1b: Partial merge via MCP**
  - Given: A prompt with merge fields
  - When: Model calls merge tool with partial values
  - Then: Tool returns partially merged content and `unfilledFields` lists the missing fields
- **TC-5.1c: Prompt not found via MCP**
  - Given: No prompt exists with the given slug
  - When: Model calls merge tool
  - Then: Tool returns an error indicating the prompt was not found

**AC-5.2:** `get_prompt` response includes `mergeFields` array

- **TC-5.2a: MCP get_prompt includes fields**
  - Given: A prompt with `{{language}}` and `{{code}}` in content
  - When: Model calls `get_prompt`
  - Then: Response includes `mergeFields: ["language", "code"]`

## Definition of Done

- [ ] `merge_prompt` is registered and authenticated
- [ ] Tool returns `{ content, mergeFields, unfilledFields }` consistently with REST merge

## Technical Implementation

### Architecture Context

This story adds a `merge_prompt` tool to the MCP server (`src/lib/mcp.ts`). The tool follows the same pattern as the existing `get_prompt`, `save_prompts`, and other MCP tools: authenticate via `extra.authInfo`, fetch prompt via Convex, perform operation, return result as JSON text content.

**MCP merge_prompt flow:**

```
  Model calls merge_prompt({ slug, values })
       |
       v
  src/lib/mcp.ts — merge_prompt handler
  1. Extract userId from authInfo
  2. Fetch prompt via Convex getPromptBySlug
  3. Call mergeContent(content, values)
  4. Fire-and-forget trackPromptUse(slug)
  5. Return { content, mergeFields, unfilledFields }
```

**Usage tracking:** Same fire-and-forget pattern as the REST merge endpoint (Story 2). The duplication is intentional — each handler is ~10 lines, not worth extracting a shared function for.

**Error signaling:** For not-found, the handler sets `isError: true` and returns a stable message. Existing tools use `"Prompt not found"` for this case.

### Interfaces & Contracts

**Creates:**

```typescript
// New tool registration in src/lib/mcp.ts:
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

Tool contract:
- **Input:** `{ slug: string; values: Record<string, string> }`
- **Success output:** MCP text content containing JSON: `{ content: string; mergeFields: string[]; unfilledFields: string[] }`
- **Error output:** `isError: true` with message `"Prompt not found"` for missing slug

**Consumes (from Story 0):**

```typescript
// src/lib/merge.ts
import { mergeContent } from "./merge";
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
| TC-5.1a | tests/service/prompts/mcpTools.test.ts | `merge_prompt tool > full merge returns merged content` | HTTP JSON-RPC call to `/mcp`; mock Convex `getPromptBySlug` to return fixture content; mock `trackPromptUse`; assert parsed tool result has `unfilledFields: []` and merged content |
| TC-5.1b | tests/service/prompts/mcpTools.test.ts | `merge_prompt tool > partial merge returns unfilledFields` | Same approach; partial values; assert `unfilledFields` lists missing fields |
| TC-5.1c | tests/service/prompts/mcpTools.test.ts | `merge_prompt tool > prompt not found returns error` | Mock Convex `getPromptBySlug` returns null; assert `isError: true` response with "Prompt not found" message |
| TC-5.2a | tests/service/prompts/mcpTools.test.ts | `get_prompt tool > response includes mergeFields array` | Update existing `get_prompt` tests to assert `mergeFields` present in response payload (Story 1's DTO enrichment makes this automatic) |

### Non-TC Decided Tests

None. Tech Design §4. TC-to-Test Mapping — MCP Merge Tool reviewed — all 4 MCP merge tests are 1:1 with TCs.

### Risks & Constraints

- **Tool output format:** Current MCP tools return JSON via `text: JSON.stringify(...)`. `merge_prompt` must follow the same convention — don't use a different serialization approach.
- **Error signaling:** For not-found, set `isError: true` and return a stable message string (`"Prompt not found"`), not a JSON error body. This matches how existing MCP tools handle errors.
- **Zod schema in inputSchema:** The MCP SDK expects Zod schemas in `inputSchema`. Use `z.record(z.string(), z.string())` for the values dict, matching `MergeRequestSchema`'s `values` field.

### Spec Deviation

None. Checked against Tech Design: §1. High Altitude — External Contract Changes (MCP Tools), §2. Medium Altitude — Flow 4: MCP merge_prompt Tool, §3. Low Altitude — MCP Tool: `src/lib/mcp.ts`, §4. TC-to-Test Mapping — MCP Merge Tool.

## Technical Checklist

- [ ] Register `merge_prompt` tool in `src/lib/mcp.ts` with Zod input schema (`slug` + `values`).
- [ ] Implement handler: auth extraction, Convex fetch, `mergeContent`, fire-and-forget `trackPromptUse`, return JSON text content.
- [ ] Handle not-found: `isError: true`, message `"Prompt not found"`.
- [ ] Add merge_prompt tests to `tests/service/prompts/mcpTools.test.ts` (~3 new tests: TC-5.1a, TC-5.1b, TC-5.1c).
- [ ] Update existing `get_prompt` tests for `mergeFields` assertion (~1 test: TC-5.2a).
- [ ] Verify: `bun run typecheck && bun run test:service`.

---
