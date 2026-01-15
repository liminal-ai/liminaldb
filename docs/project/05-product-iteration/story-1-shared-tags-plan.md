# Plan: Shared Tags Foundation

Replace freeform per-user tags with 19 fixed global shared tags.

## Decisions Made
- **Storage**: Global tags (single shared table, no userId)
- **UI Layout**: Vertical sections with headers (Purpose, Domain, Task)
- **Placement**: Below content field in editor
- **Shell Filter**: Same grouped layout as editor
- **MCP Validation**: Strict - reject unknown tags with error
- **Development**: Skeleton → TDD Red → TDD Green

## The 19 Tags

| Dimension | Tags |
|-----------|------|
| Purpose (5) | instruction, reference, persona, workflow, snippet |
| Domain (7) | code, writing, analysis, planning, design, data, communication |
| Task (7) | review, summarize, explain, debug, transform, extract, translate |

---

## Development Approach: Skeleton → Red → Green

### Phase A: Skeleton (Interfaces Only)

Create file structure with types, signatures, and stub implementations that throw or return 501.

**Goal**: All layers exist, imports resolve, but nothing works yet.

### Phase B: Red (Write Failing Tests)

Write comprehensive tests for each layer. All tests fail initially.

**Goal**: Tests define the contract. Running `bun test` shows red.

### Phase C: Green (Implement Until Tests Pass)

Implement each function/component until tests pass.

**Goal**: Running `bun test` shows green.

---

## Phase A: Skeleton

### A1. Tag Constants
**New file**: `convex/model/tagConstants.ts`

```typescript
export const TAG_DIMENSIONS = ['purpose', 'domain', 'task'] as const;
export type TagDimension = typeof TAG_DIMENSIONS[number];

export const GLOBAL_TAGS = {
  purpose: ['instruction', 'reference', 'persona', 'workflow', 'snippet'],
  domain: ['code', 'writing', 'analysis', 'planning', 'design', 'data', 'communication'],
  task: ['review', 'summarize', 'explain', 'debug', 'transform', 'extract', 'translate'],
} as const;

export const ALL_TAG_NAMES = [
  ...GLOBAL_TAGS.purpose,
  ...GLOBAL_TAGS.domain,
  ...GLOBAL_TAGS.task,
] as const;

export type TagName = typeof ALL_TAG_NAMES[number];
```

### A2. Schema Change
**Modify**: `convex/schema.ts`

```typescript
// BEFORE
tags: defineTable({
  userId: v.string(),
  name: v.string(),
}).index("by_user_name", ["userId", "name"]),

// AFTER
tags: defineTable({
  name: v.string(),
  dimension: v.string(), // 'purpose' | 'domain' | 'task'
}).index("by_name", ["name"])
  .index("by_dimension", ["dimension"]),
```

### A3. Tag Model Stubs
**Modify**: `convex/model/tags.ts`

```typescript
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { ALL_TAG_NAMES, type TagName } from "./tagConstants";

export function validateGlobalTag(name: string): TagName {
  throw new Error("Not implemented");
}

export async function getTagId(ctx: QueryCtx | MutationCtx, name: string): Promise<Id<"tags">> {
  throw new Error("Not implemented");
}

export async function getTagsByDimension(ctx: QueryCtx): Promise<Record<string, string[]>> {
  throw new Error("Not implemented");
}
```

### A4. Seed Migration Stub
**New file**: `convex/migrations/seedGlobalTags.ts`

```typescript
import { internalMutation } from "../_generated/server";

export const seedGlobalTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    throw new Error("Not implemented");
  },
});
```

### A5. Tag Selector Component Stub
**New file**: `public/js/components/tag-selector.js`

```javascript
const tagSelector = (() => {
  function render(tags, selectedTags = []) {
    throw new Error("Not implemented");
  }

  function attachHandlers(container, onToggle) {
    throw new Error("Not implemented");
  }

  return { render, attachHandlers };
})();

if (typeof window !== "undefined") {
  window.tagSelector = tagSelector;
}
```

---

## Phase B: Red Tests

### B1. Tag Constants Tests
**New file**: `tests/convex/tagConstants.test.ts`

```typescript
describe("tagConstants", () => {
  it("ALL_TAG_NAMES contains exactly 19 tags", () => {});
  it("GLOBAL_TAGS.purpose has 5 tags", () => {});
  it("GLOBAL_TAGS.domain has 7 tags", () => {});
  it("GLOBAL_TAGS.task has 7 tags", () => {});
  it("all tag names are lowercase alphanumeric", () => {});
  it("no duplicate tags across dimensions", () => {});
});
```

### B2. Tag Model Tests
**New file**: `tests/convex/tags.test.ts`

```typescript
describe("validateGlobalTag", () => {
  it("accepts valid tag 'code'", () => {});
  it("accepts valid tag 'instruction'", () => {});
  it("rejects invalid tag 'foobar'", () => {});
  it("error message lists valid tags", () => {});
  it("is case-insensitive (accepts 'CODE')", () => {});
});

describe("getTagId", () => {
  it("returns ID for seeded tag", () => {});
  it("throws if tag not seeded", () => {});
});

describe("getTagsByDimension", () => {
  it("returns object with purpose, domain, task keys", () => {});
  it("each dimension contains correct tags", () => {});
});
```

### B3. Seed Migration Tests
**New file**: `tests/convex/seedGlobalTags.test.ts`

```typescript
describe("seedGlobalTags", () => {
  it("inserts 19 tags on first run", () => {});
  it("is idempotent (no duplicates on re-run)", () => {});
  it("each tag has correct dimension", () => {});
});
```

### B4. API Tests
**Modify**: `tests/integration/prompts.test.ts` (or new file)

```typescript
describe("GET /api/prompts/tags", () => {
  it("returns grouped structure { purpose, domain, task }", () => {});
  it("purpose array has 5 tags", () => {});
  it("domain array has 7 tags", () => {});
  it("task array has 7 tags", () => {});
});

describe("POST /api/prompts with tags", () => {
  it("accepts valid tags", () => {});
  it("rejects invalid tag with 400", () => {});
  it("error message lists valid tags", () => {});
});
```

### B5. MCP Tests
**Modify**: `tests/service/mcp.test.ts` (or new file)

```typescript
describe("MCP save_prompts tag validation", () => {
  it("accepts prompts with valid tags", () => {});
  it("rejects prompts with invalid tags", () => {});
  it("error includes list of valid tags", () => {});
});

describe("MCP search_prompts tag validation", () => {
  it("accepts valid tag filter", () => {});
  it("rejects invalid tag filter", () => {});
});
```

### B6. UI Component Tests
**New file**: `tests/service/ui/tag-selector.test.ts`

```typescript
describe("tagSelector.render", () => {
  it("renders 3 sections (purpose, domain, task)", () => {});
  it("each section has header label", () => {});
  it("renders chips for each tag", () => {});
  it("selected tags have .selected class", () => {});
});

describe("tagSelector.attachHandlers", () => {
  it("clicking chip calls onToggle with tag name", () => {});
  it("clicking toggles .selected class", () => {});
  it("updates aria-pressed attribute", () => {});
});
```

### B7. Prompt Editor Tests
**Modify**: `tests/service/ui/prompt-editor.test.ts`

```typescript
describe("prompt-editor tag selector", () => {
  it("renders tag selector below content field", () => {});
  it("fetches tags from /api/prompts/tags on init", () => {});
  it("getFormData() returns selected tag names", () => {});
  it("shows loading state while fetching tags", () => {});
  it("handles fetch error gracefully", () => {});
});
```

### B8. Shell Filter Tests
**Modify**: `tests/service/ui/shell.test.ts` (or new file)

```typescript
describe("shell tag filter", () => {
  it("dropdown shows grouped tags", () => {});
  it("sections have Purpose, Domain, Task headers", () => {});
  it("selecting tag adds to filter pills", () => {});
});
```

---

## Phase C: Green Implementation

### C1. Implement Tag Constants
File already complete from skeleton (constants are the implementation).

### C2. Implement Seed Migration
**Modify**: `convex/migrations/seedGlobalTags.ts`

- Check if tags exist (idempotent)
- Insert all 19 tags with dimensions
- Run: `npx convex run migrations/seedGlobalTags:seedGlobalTags`

### C3. Implement Tag Model
**Modify**: `convex/model/tags.ts`

- `validateGlobalTag`: Check against ALL_TAG_NAMES, throw with helpful error
- `getTagId`: Query by name index, throw if not found with "run migration" message
- `getTagsByDimension`: Query all tags, group by dimension field

### C4. Update Prompts Model
**Modify**: `convex/model/prompts.ts`

- Replace `findOrCreateTag` calls with `getTagId`
- Remove orphan tag cleanup (global tags never deleted)
- Update `listTags()` to call `getTagsByDimension()`

### C5. Verify Trigger Logic
**Review**: `convex/triggers.ts`

- Confirm trigger queries promptTags → tags by ID (not userId)
- No changes expected, but verify tests pass

### C6. Update Convex Query Export
**Modify**: `convex/prompts.ts`

- Update `listTags` return type to grouped structure

### C7. Update API Layer
**Modify**: `src/routes/prompts.ts`

- Handler returns grouped tags directly from Convex

### C8. Update Zod Schema
**Modify**: `src/schemas/prompts.ts`

- Add enum validation for tags using ALL_TAG_NAMES

### C9. Update MCP Validation
**Modify**: `src/lib/mcp.ts`

- Add strict enum validation in save_prompts, update_prompt, search_prompts
- Error: "Invalid tag: 'foo'. Valid tags: instruction, reference, ..."

### C10. Implement Tag Selector Component
**Modify**: `public/js/components/tag-selector.js`

- `render()`: Return HTML with 3 sections, headers, chips
- `attachHandlers()`: Toggle selected class, call onToggle

### C11. Update Prompt Editor
**Modify**: `public/js/prompt-editor.js`

- Replace text input (lines 109-115) with chip selector container
- Add `initTagSelector()` async function
- Show loading state, handle errors
- Update `getFormData()` to read selected chips

### C12. Update Shell Filter
**Modify**: `src/ui/templates/shell.html`

- Update `renderTagPicker()` to use tagSelector component
- Handle grouped tags response

### C13. Add CSS
**Modify**: `public/shared/themes/base.css`

- `.tag-selector`, `.tag-section`, `.tag-section-header`
- `.tag-chips`, `.tag-chip`, `.tag-chip.selected`
- `.tag-chip:hover` states

---

## Files Summary

### New Files
| File | Purpose |
|------|---------|
| `convex/model/tagConstants.ts` | Tag definitions and types |
| `convex/migrations/seedGlobalTags.ts` | Seed 19 tags on deploy |
| `public/js/components/tag-selector.js` | Reusable chip component |
| `tests/convex/tagConstants.test.ts` | Constants tests |
| `tests/convex/tags.test.ts` | Model tests |
| `tests/convex/seedGlobalTags.test.ts` | Migration tests |
| `tests/service/ui/tag-selector.test.ts` | UI component tests |

### Modified Files
| File | Change |
|------|--------|
| `convex/schema.ts` | Remove userId from tags, add dimension |
| `convex/model/tags.ts` | Replace findOrCreateTag with new functions |
| `convex/model/prompts.ts` | Use new tag lookup, remove orphan cleanup |
| `convex/prompts.ts` | Update listTags return type |
| `src/routes/prompts.ts` | Return grouped tags |
| `src/schemas/prompts.ts` | Add enum validation |
| `src/lib/mcp.ts` | Strict tag validation |
| `public/js/prompt-editor.js` | Chip selector UI |
| `src/ui/templates/shell.html` | Grouped filter dropdown |
| `public/shared/themes/base.css` | Tag selector styles |

---

## Verification Checklist

1. [ ] Seed migration: `npx convex run migrations/seedGlobalTags:seedGlobalTags`
2. [ ] Convex dashboard shows 19 tags with dimensions
3. [ ] `bun run test` - all tests pass
4. [ ] `GET /api/prompts/tags` returns `{ purpose: [...], domain: [...], task: [...] }`
5. [ ] Editor: Create prompt, select tags via chips, save
6. [ ] Shell: Dropdown shows grouped tags, filtering works
7. [ ] MCP: `save_prompts` with invalid tag returns error
8. [ ] `bun run check` - format, lint, typecheck, tests all pass

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Migration not run | `getTagId` throws helpful error: "Run seedGlobalTags migration" |
| Editor async load | Show loading state, handle fetch errors gracefully |
| Breaking API change | Tests verify new shape before implementation |
| Trigger compatibility | Review trigger queries tags by ID, not userId |
