# Epic 01: PromptDB Insert + Get (Thin Slice v1)

## Overview

Walking skeleton for PromptDB - save and retrieve prompts across all tiers. This is horizontal-first (by tier) to establish the pipe, then vertical slices for features after.

**Target:** 8 days to MVP submission

---

## Phases

| Phase | Tier | Deliverable |
|-------|------|-------------|
| 1 | Schema + Convex | `insertPrompts`, `getPromptBySlug` mutations/queries |
| 2 | API | `POST /prompts`, `GET /prompts/:slug` endpoints |
| 3 | Web | Insert form, Get form |
| 4 | MCP + Widget | `save_prompt`, `get_prompt` tools |
| 5 | Search | Typeahead on slug across Web + MCP |

Within each phase: **Skeleton → TDD-Red → TDD-Green**

---

## Prompt Data Model

### Prompt Interface

```typescript
interface Prompt {
  slug: string;           // unique per user, URL-safe, no colons (reserved for namespacing)
  name: string;           // human-readable title
  category: string;       // broad bucket (string for MVP, could normalize later)
  tags: string[];         // for filtering
  description: string;    // for vector search - written for "when to use this"
  parameters?: Parameter[]; // optional template variables
  content: string;        // the actual prompt text (handlebars notation)
}

interface Parameter {
  name: string;
  type: 'string' | 'string[]' | 'number' | 'boolean';
  required: boolean;
  description?: string;
}
```

### Slug Convention

- Personal: `ai-meta-cognitive-check` (words-with-dashes, unique per user)
- Team (future): `acme:ai-meta-cognitive-check` (colon prefix reserved)
- Validation regex: `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`

---

## Convex Schema

### Design Decisions

1. **Relational for tags** - Separate `tags` table + `promptTags` junction for management/autocomplete
2. **Denormalized `tagNames`** - On prompt for fast reads, synced via triggers
3. **Folder path optional** - Materialized path string (e.g., `/work/agents/debugging`) for future hierarchy
4. **Parameters embedded** - Intrinsic to prompt, no separate table
5. **Composite indexes** - Avoid redundant indexes (use `by_user_slug` not separate `by_user` + `by_slug`)

### Schema Definition

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    userId: v.string(),
    email: v.string(),
  }).index("by_userId", ["userId"]),

  tags: defineTable({
    userId: v.id("users"),
    name: v.string(),
  }).index("by_user_name", ["userId", "name"]),

  promptTags: defineTable({
    promptId: v.id("prompts"),
    tagId: v.id("tags"),
    userId: v.id("users"),  // tagger's userId, not prompt owner
  })
    .index("by_prompt", ["promptId"])
    .index("by_tag", ["tagId"])
    .index("by_user", ["userId"]),

  prompts: defineTable({
    userId: v.id("users"),
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    tagNames: v.array(v.string()),        // denormalized for reads
    folderPath: v.optional(v.string()),   // materialized path, optional
    parameters: v.optional(v.array(v.object({
      name: v.string(),
      type: v.union(
        v.literal("string"),
        v.literal("string[]"),
        v.literal("number"),
        v.literal("boolean")
      ),
      required: v.boolean(),
      description: v.optional(v.string()),
    }))),
  })
    .index("by_user_slug", ["userId", "slug"])
    .index("by_user_tags", ["userId", "tagNames"]),
});
```

---

## Convex Functions Structure

### Directory Layout

```
convex/
├── schema.ts
├── functions.ts          # Trigger setup, wrapped mutation/internalMutation
├── model/
│   ├── users.ts          # User helpers
│   ├── prompts.ts        # Prompt business logic
│   └── tags.ts           # Tag helpers (findOrCreate, etc.)
├── prompts.ts            # Public API (thin wrappers)
└── _generated/
```

### Trigger Setup (convex/functions.ts)

```typescript
/* eslint-disable no-restricted-imports */
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation
} from "./_generated/server";
/* eslint-enable no-restricted-imports */
import { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import { customCtx, customMutation } from "convex-helpers/server/customFunctions";

const triggers = new Triggers<DataModel>();

// Sync tagNames when promptTags change
triggers.register("promptTags", async (ctx, change) => {
  if (change.newDoc || change.oldDoc) {
    const promptId = change.newDoc?.promptId ?? change.oldDoc?.promptId;
    const junctions = await ctx.db.query("promptTags")
      .withIndex("by_prompt", q => q.eq("promptId", promptId))
      .collect();
    const tags = await Promise.all(junctions.map(j => ctx.db.get(j.tagId)));
    const tagNames = tags.filter(Boolean).map(t => t!.name);
    await ctx.db.patch(promptId, { tagNames });
  }
});

export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(rawInternalMutation, customCtx(triggers.wrapDB));
```

### Mutations (Phase 1)

**insertPrompts**
```typescript
// Input: array of prompts (without userId - get from auth)
// For each prompt:
//   1. Validate slug format (no colons, lowercase, dashes)
//   2. Check slug uniqueness for user
//   3. Find or create tags
//   4. Insert prompt
//   5. Create promptTags junction records
//   6. Trigger syncs tagNames
// Output: array of prompt IDs
```

**getPromptBySlug**
```typescript
// Input: slug
// Get userId from auth
// Query prompts by userId + slug using by_user_slug index
// Output: prompt with tagNames (denormalized) or null
```

---

## Best Practices (from Convex research)

### Must Follow

1. **Await all promises** - Use `no-floating-promises` eslint rule
2. **Avoid `.filter()` on queries** - Use `.withIndex()` or filter in code
3. **Use `.collect()` only for small results** - <1000 docs, use pagination/indexes otherwise
4. **Argument validators on all public functions** - `v.id()`, `v.string()`, etc.
5. **Access control via `ctx.auth`** - Never trust spoofable args
6. **Internal functions for scheduled/run* calls** - Use `internal.x.y` not `api.x.y`
7. **Helper functions in `convex/model/`** - Thin mutation wrappers calling business logic

### Index Best Practices

- Composite indexes eliminate redundancy (`by_user_slug` not `by_user` + `by_slug`)
- Indexes automatically include `_creationTime` as final column
- Limit of 32 indexes per table

### Trigger Best Practices

- Use `convex-helpers` Triggers for denormalization
- Always use wrapped `mutation` from `functions.ts`
- ESLint rule to enforce correct imports
- Check for infinite recursion (patch only if value changed)
- Triggers run atomically with the mutation

---

## Phase 1 Test Conditions

| Test | Condition |
|------|-----------|
| Insert single prompt | Returns ID, prompt exists in DB |
| Insert with new tags | Tags created, junction records created, tagNames denormalized |
| Insert with existing tags | Reuses existing tags, no duplicates |
| Insert duplicate slug | Fails with error (not upsert for MVP) |
| Insert invalid slug (has colon) | Fails validation |
| Get existing prompt | Returns full prompt with tagNames |
| Get non-existent slug | Returns null |
| Get another user's prompt | Returns null (userId scoped) |
| Unauthenticated insert | Fails with unauthorized |
| Unauthenticated get | Fails with unauthorized |

---

## API Endpoints (Phase 2)

```
POST /prompts
  Body: { prompts: Prompt[] }
  Response: { ids: string[] }

GET /prompts/:slug
  Response: Prompt | 404
```

---

## Future Considerations (Not MVP)

### Teams
- Team = special kind of user (`users.type = "team"`)
- `teamMembers` table for access
- Team prompts have `tagNames = []`, members add own tags
- Slug namespacing: `teamname:slug`

### Sharing
- `isPublished: boolean` on prompts
- `sourcePromptId`, `sourceUserId` for copy tracking

### Search
- Vector search on `description` field
- Redis layer for typeahead caching
- Event-driven cache warming on login

### Template Resolution
- Handlebars syntax for parameters
- `{{paramName}}` with optional blocks `{{#if param}}...{{/if}}`
