# Phase 1: TDD Red Spec

## Overview

This spec defines the skeleton implementations and test conditions for Phase 1. All skeletons throw `NotImplementedError`. Tests assert expected behavior and fail due to not implemented.

**Goal:** Tests fail for the right reasons. When we implement (TDD Green), tests pass.

---

## Design Decisions

### User ID Type

Use `string` (external auth ID) not `Id<"users">`. This matches existing pattern in `convex/healthAuth.ts` where `userId` is passed from Fastify backend.

### Auth Pattern

Use existing apiKey pattern: mutations/queries receive `apiKey` and `userId` as args. Convex validates apiKey, trusts userId from the authenticated Fastify backend.

### Transaction Semantics

Batch operations are atomic. If any prompt in a batch fails validation, the entire batch fails. No partial inserts.

### DTO Mapping

- Storage: `tagNames: string[]` (denormalized field name)
- API: `tags: string[]` (clean interface)

This is intentional. Internal storage uses `tagNames` to be explicit about denormalization. External API uses `tags` for clean UX.

### Test Framework

Use `bun:test` with native Bun mocks (`mock()` from bun). No vitest dependency.

---

## File Structure

```
convex/
├── schema.ts                    # UPDATE - add prompts, tags, promptTags
├── errors.ts                    # NEW - NotImplementedError
├── model/
│   ├── prompts.ts               # NEW - skeleton business logic
│   └── tags.ts                  # NEW - skeleton tag helpers
└── prompts.ts                   # NEW - skeleton public mutations/queries

tests/
├── fixtures/
│   └── mockConvexCtx.ts         # NEW - ctx.db mock builder (bun mocks)
├── convex/
│   └── prompts/
│       ├── insertPrompts.test.ts    # Service mock tests
│       ├── getPromptBySlug.test.ts  # Service mock tests
│       ├── slugExists.test.ts       # Service mock tests
│       └── findOrCreateTag.test.ts  # Service mock tests
└── integration/
    └── convex/
        └── prompts.test.ts      # Integration tests (real Convex)
```

---

## Schema Definition

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
    userId: v.string(),      // External auth ID
    name: v.string(),
  }).index("by_user_name", ["userId", "name"]),

  promptTags: defineTable({
    promptId: v.id("prompts"),
    tagId: v.id("tags"),
  })
    .index("by_prompt", ["promptId"])
    .index("by_tag", ["tagId"]),

  prompts: defineTable({
    userId: v.string(),      // External auth ID
    slug: v.string(),
    name: v.string(),
    description: v.string(),
    content: v.string(),
    // Denormalized for fast queries. Sync via helper functions.
    tagNames: v.array(v.string()),
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
    .index("by_user", ["userId"]),
});
```

---

## Skeleton Implementations

### convex/errors.ts

```typescript
export class NotImplementedError extends Error {
  constructor(fn: string) {
    super(`${fn} not implemented`);
    this.name = "NotImplementedError";
  }
}
```

### convex/model/tags.ts

```typescript
import { NotImplementedError } from "../errors";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Find existing tag or create new one.
 * Returns tag ID.
 */
export async function findOrCreateTag(
  ctx: MutationCtx,
  userId: string,
  name: string
): Promise<Id<"tags">> {
  throw new NotImplementedError("findOrCreateTag");
}
```

### convex/model/prompts.ts

```typescript
import { NotImplementedError } from "../errors";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

// Slug validation: lowercase, numbers, dashes only. No colons (reserved for namespacing).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PromptInput {
  slug: string;
  name: string;
  description: string;
  content: string;
  tags: string[];
  parameters?: {
    name: string;
    type: "string" | "string[]" | "number" | "boolean";
    required: boolean;
    description?: string;
  }[];
}

export interface PromptDTO {
  slug: string;
  name: string;
  description: string;
  content: string;
  tags: string[];           // Maps from storage `tagNames`
  parameters?: {
    name: string;
    type: "string" | "string[]" | "number" | "boolean";
    required: boolean;
    description?: string;
  }[];
}

/**
 * Validate slug format.
 * Throws if invalid.
 */
export function validateSlug(slug: string): void {
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(`Invalid slug: "${slug}". Use lowercase letters, numbers, and dashes only.`);
  }
  if (slug.includes(":")) {
    throw new Error(`Slug cannot contain colons (reserved for namespacing)`);
  }
}

/**
 * Check if slug exists for user.
 */
export async function slugExists(
  ctx: QueryCtx,
  userId: string,
  slug: string
): Promise<boolean> {
  throw new NotImplementedError("slugExists");
}

/**
 * Insert multiple prompts for a user.
 * Creates tags as needed, creates junction records, sets denormalized tagNames.
 *
 * Atomic: If any prompt fails validation, entire batch fails.
 *
 * Returns array of prompt IDs.
 */
export async function insertMany(
  ctx: MutationCtx,
  userId: string,
  prompts: PromptInput[]
): Promise<Id<"prompts">[]> {
  throw new NotImplementedError("insertMany");
}

/**
 * Get prompt by slug for user.
 * Returns DTO or null if not found.
 */
export async function getBySlug(
  ctx: QueryCtx,
  userId: string,
  slug: string
): Promise<PromptDTO | null> {
  throw new NotImplementedError("getBySlug");
}

/**
 * Delete prompt by slug for user.
 * Also cleans up orphaned promptTags.
 * Returns true if deleted, false if not found.
 */
export async function deleteBySlug(
  ctx: MutationCtx,
  userId: string,
  slug: string
): Promise<boolean> {
  throw new NotImplementedError("deleteBySlug");
}
```

### convex/prompts.ts

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import * as Prompts from "./model/prompts";
import { validateApiKey, getApiKeyConfig } from "./auth/apiKey";

export const insertPrompts = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    prompts: v.array(v.object({
      slug: v.string(),
      name: v.string(),
      description: v.string(),
      content: v.string(),
      tags: v.array(v.string()),
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
    })),
  },
  returns: v.array(v.id("prompts")),
  handler: async (ctx, { apiKey, userId, prompts }) => {
    const config = await getApiKeyConfig(ctx);
    if (!validateApiKey(apiKey, config)) {
      throw new Error("Invalid API key");
    }
    return Prompts.insertMany(ctx, userId, prompts);
  },
});

export const getPromptBySlug = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    slug: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      slug: v.string(),
      name: v.string(),
      description: v.string(),
      content: v.string(),
      tags: v.array(v.string()),
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
  ),
  handler: async (ctx, { apiKey, userId, slug }) => {
    const config = await getApiKeyConfig(ctx);
    if (!validateApiKey(apiKey, config)) {
      throw new Error("Invalid API key");
    }
    return Prompts.getBySlug(ctx, userId, slug);
  },
});

export const deletePromptBySlug = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    slug: v.string(),
  },
  returns: v.boolean(),
  handler: async (ctx, { apiKey, userId, slug }) => {
    const config = await getApiKeyConfig(ctx);
    if (!validateApiKey(apiKey, config)) {
      throw new Error("Invalid API key");
    }
    return Prompts.deleteBySlug(ctx, userId, slug);
  },
});
```

---

## Mock Infrastructure

### tests/fixtures/mockConvexCtx.ts

Uses Bun's native mock utilities (no vitest).

```typescript
import { mock } from "bun:test";
import type { Id } from "../../convex/_generated/dataModel";

type TableName = "users" | "tags" | "promptTags" | "prompts";

interface MockDoc {
  _id: string;
  [key: string]: unknown;
}

interface MockQueryBuilder {
  withIndex: ReturnType<typeof mock>;
  filter: ReturnType<typeof mock>;
  unique: ReturnType<typeof mock>;
  collect: ReturnType<typeof mock>;
  first: ReturnType<typeof mock>;
}

export interface MockDb {
  query: ReturnType<typeof mock>;
  insert: ReturnType<typeof mock>;
  get: ReturnType<typeof mock>;
  patch: ReturnType<typeof mock>;
  delete: ReturnType<typeof mock>;
}

export interface MockCtx {
  db: MockDb;
}

/**
 * Create a chainable query builder mock.
 */
function createQueryBuilder(): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    withIndex: mock(() => builder),
    filter: mock(() => builder),
    unique: mock(() => Promise.resolve(null)),
    collect: mock(() => Promise.resolve([])),
    first: mock(() => Promise.resolve(null)),
  };
  return builder;
}

/**
 * Create a mock Convex context for testing.
 */
export function createMockCtx(): MockCtx {
  const queryBuilders = new Map<TableName, MockQueryBuilder>();

  const db: MockDb = {
    query: mock((table: TableName) => {
      if (!queryBuilders.has(table)) {
        queryBuilders.set(table, createQueryBuilder());
      }
      return queryBuilders.get(table)!;
    }),
    insert: mock(() => Promise.resolve("mock_id" as Id<"prompts">)),
    get: mock(() => Promise.resolve(null)),
    patch: mock(() => Promise.resolve()),
    delete: mock(() => Promise.resolve()),
  };

  return { db };
}

/**
 * Get the query builder for a table to configure mocks.
 */
export function getQueryBuilder(ctx: MockCtx, table: TableName): MockQueryBuilder {
  return ctx.db.query(table) as unknown as MockQueryBuilder;
}

/**
 * Helper to configure sequential return values for a mock.
 * Useful for batch operations where the same query is called multiple times.
 */
export function mockSequentialReturns<T>(
  mockFn: ReturnType<typeof mock>,
  values: T[]
): void {
  let callIndex = 0;
  mockFn.mockImplementation(() => {
    const value = values[callIndex] ?? values[values.length - 1];
    callIndex++;
    return Promise.resolve(value);
  });
}

/**
 * Helper to set up mock returns for insert, tracking IDs.
 */
export function mockInsertSequence(ctx: MockCtx, ids: string[]): void {
  mockSequentialReturns(ctx.db.insert, ids.map(id => id as Id<"prompts">));
}
```

---

## Test Conditions

### Service Mock Tests: findOrCreateTag

**File:** `tests/convex/prompts/findOrCreateTag.test.ts`

```typescript
import { describe, test, expect, beforeEach } from "bun:test";
import { createMockCtx, getQueryBuilder, mockSequentialReturns } from "../../fixtures/mockConvexCtx";
import { findOrCreateTag } from "../../../convex/model/tags";

describe("findOrCreateTag", () => {
  test("returns existing tag ID when tag exists", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    const existingTag = { _id: "tag_existing", userId, name: "debug" };
    getQueryBuilder(ctx, "tags").unique.mockResolvedValue(existingTag);

    const result = await findOrCreateTag(ctx as any, userId, "debug");

    expect(result).toBe("tag_existing");
    expect(ctx.db.insert).not.toHaveBeenCalled();
  });

  test("creates new tag and returns ID when tag doesn't exist", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("tag_new");

    const result = await findOrCreateTag(ctx as any, userId, "new-tag");

    expect(result).toBe("tag_new");
    expect(ctx.db.insert).toHaveBeenCalledWith("tags", {
      userId: "user_123",
      name: "new-tag",
    });
  });

  test("uses correct index for lookup", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
    ctx.db.insert.mockResolvedValue("tag_new");

    await findOrCreateTag(ctx as any, userId, "test-tag");

    const builder = getQueryBuilder(ctx, "tags");
    expect(builder.withIndex).toHaveBeenCalledWith(
      "by_user_name",
      expect.any(Function)
    );
  });
});
```

### Service Mock Tests: slugExists

**File:** `tests/convex/prompts/slugExists.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { createMockCtx, getQueryBuilder } from "../../fixtures/mockConvexCtx";
import { slugExists } from "../../../convex/model/prompts";

describe("slugExists", () => {
  test("returns true when slug exists for user", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
      _id: "prompt_1",
      userId,
      slug: "existing-slug",
    });

    const result = await slugExists(ctx as any, userId, "existing-slug");

    expect(result).toBe(true);
  });

  test("returns false when slug does not exist", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

    const result = await slugExists(ctx as any, userId, "non-existent");

    expect(result).toBe(false);
  });

  test("uses by_user_slug index", async () => {
    const ctx = createMockCtx();
    const userId = "user_123";

    getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

    await slugExists(ctx as any, userId, "test-slug");

    const builder = getQueryBuilder(ctx, "prompts");
    expect(builder.withIndex).toHaveBeenCalledWith(
      "by_user_slug",
      expect.any(Function)
    );
  });
});
```

### Service Mock Tests: insertPrompts

**File:** `tests/convex/prompts/insertPrompts.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { createMockCtx, getQueryBuilder, mockSequentialReturns, mockInsertSequence } from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";

describe("insertPrompts", () => {
  describe("slug validation (pure function)", () => {
    test("validateSlug accepts valid slug", () => {
      expect(() => Prompts.validateSlug("ai-meta-check")).not.toThrow();
    });

    test("validateSlug accepts slug with numbers", () => {
      expect(() => Prompts.validateSlug("prompt-v2-test")).not.toThrow();
    });

    test("validateSlug accepts single word", () => {
      expect(() => Prompts.validateSlug("debug")).not.toThrow();
    });

    test("validateSlug rejects uppercase", () => {
      expect(() => Prompts.validateSlug("AI-Meta-Check")).toThrow(/Invalid slug/);
    });

    test("validateSlug rejects colons", () => {
      expect(() => Prompts.validateSlug("team:prompt")).toThrow(/colons/);
    });

    test("validateSlug rejects spaces", () => {
      expect(() => Prompts.validateSlug("has spaces")).toThrow(/Invalid slug/);
    });

    test("validateSlug rejects empty string", () => {
      expect(() => Prompts.validateSlug("")).toThrow(/Invalid slug/);
    });

    test("validateSlug rejects leading dash", () => {
      expect(() => Prompts.validateSlug("-leading")).toThrow(/Invalid slug/);
    });

    test("validateSlug rejects trailing dash", () => {
      expect(() => Prompts.validateSlug("trailing-")).toThrow(/Invalid slug/);
    });
  });

  describe("single prompt with new tags", () => {
    test("creates tags that don't exist", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      // No existing tags
      getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
      // No existing prompt with this slug
      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

      // Sequence: tag1, tag2, prompt, promptTag1, promptTag2
      mockInsertSequence(ctx, ["tag_1", "tag_2", "prompt_1", "pt_1", "pt_2"]);

      const input: Prompts.PromptInput[] = [{
        slug: "ai-meta-check",
        name: "Meta Cognitive Check",
        description: "Use when you want AI to introspect",
        content: "As you process this...",
        tags: ["introspection", "claude"],
      }];

      const result = await Prompts.insertMany(ctx as any, userId, input);

      // Should create 2 tags
      expect(ctx.db.insert).toHaveBeenCalledWith("tags", { userId, name: "introspection" });
      expect(ctx.db.insert).toHaveBeenCalledWith("tags", { userId, name: "claude" });

      // Should create prompt with denormalized tagNames
      expect(ctx.db.insert).toHaveBeenCalledWith("prompts", expect.objectContaining({
        slug: "ai-meta-check",
        tagNames: ["introspection", "claude"],
      }));

      // Should create junction records
      expect(ctx.db.insert).toHaveBeenCalledWith("promptTags", expect.objectContaining({
        promptId: "prompt_1",
        tagId: "tag_1",
      }));
      expect(ctx.db.insert).toHaveBeenCalledWith("promptTags", expect.objectContaining({
        promptId: "prompt_1",
        tagId: "tag_2",
      }));

      expect(result).toEqual(["prompt_1"]);
    });
  });

  describe("single prompt with existing tags", () => {
    test("reuses existing tags without creating duplicates", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      // Tag already exists
      getQueryBuilder(ctx, "tags").unique.mockResolvedValue({
        _id: "existing_tag",
        userId,
        name: "claude",
      });
      // No existing prompt with this slug
      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

      mockInsertSequence(ctx, ["prompt_1", "pt_1"]);

      const input: Prompts.PromptInput[] = [{
        slug: "debug-helper",
        name: "Debug Helper",
        description: "...",
        content: "...",
        tags: ["claude"],
      }];

      const result = await Prompts.insertMany(ctx as any, userId, input);

      // Should NOT insert new tag (only prompt and promptTags)
      const insertCalls = ctx.db.insert.mock.calls;
      const tagInserts = insertCalls.filter((call: unknown[]) => call[0] === "tags");
      expect(tagInserts).toHaveLength(0);

      // Should create junction with existing tag
      expect(ctx.db.insert).toHaveBeenCalledWith("promptTags", expect.objectContaining({
        tagId: "existing_tag",
      }));

      expect(result).toEqual(["prompt_1"]);
    });
  });

  describe("batch insert", () => {
    test("creates shared tag only once across batch", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      // Track created tags to simulate real behavior
      const createdTags = new Map<string, string>();

      getQueryBuilder(ctx, "tags").unique.mockImplementation(() => {
        // This mock doesn't know which tag was queried, so we need different approach
        // The implementation should track tags it creates during the batch
        return Promise.resolve(null);
      });

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
      mockInsertSequence(ctx, ["shared_tag", "unique_tag", "prompt_a", "prompt_b", "pt_1", "pt_2", "pt_3"]);

      const input: Prompts.PromptInput[] = [
        { slug: "prompt-a", name: "A", description: "...", content: "...", tags: ["shared"] },
        { slug: "prompt-b", name: "B", description: "...", content: "...", tags: ["shared", "unique"] },
      ];

      const result = await Prompts.insertMany(ctx as any, userId, input);

      // Count tag inserts - "shared" should only be inserted once
      const insertCalls = ctx.db.insert.mock.calls;
      const tagInserts = insertCalls.filter((call: unknown[]) => call[0] === "tags");
      const sharedTagInserts = tagInserts.filter((call: unknown[]) =>
        (call[1] as { name: string }).name === "shared"
      );
      expect(sharedTagInserts).toHaveLength(1);

      expect(result).toHaveLength(2);
    });
  });

  describe("duplicate slug", () => {
    test("throws error if slug already exists for user", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      // Slug exists
      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
        _id: "existing_prompt",
        slug: "ai-meta-check",
      });

      const input: Prompts.PromptInput[] = [{
        slug: "ai-meta-check",
        name: "...",
        description: "...",
        content: "...",
        tags: [],
      }];

      await expect(Prompts.insertMany(ctx as any, userId, input))
        .rejects.toThrow(/already exists/);

      // Should not insert anything
      expect(ctx.db.insert).not.toHaveBeenCalled();
    });

    test("batch fails entirely if any slug is duplicate", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      // Second slug exists
      mockSequentialReturns(getQueryBuilder(ctx, "prompts").unique, [
        null, // first slug doesn't exist
        { _id: "existing", slug: "duplicate-slug" }, // second slug exists
      ]);

      const input: Prompts.PromptInput[] = [
        { slug: "new-slug", name: "A", description: "...", content: "...", tags: [] },
        { slug: "duplicate-slug", name: "B", description: "...", content: "...", tags: [] },
      ];

      await expect(Prompts.insertMany(ctx as any, userId, input))
        .rejects.toThrow(/already exists/);

      // Atomic: nothing should be inserted
      expect(ctx.db.insert).not.toHaveBeenCalled();
    });
  });

  describe("empty tags", () => {
    test("inserts prompt with empty tagNames array", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
      mockInsertSequence(ctx, ["prompt_1"]);

      const input: Prompts.PromptInput[] = [{
        slug: "no-tags",
        name: "No Tags",
        description: "...",
        content: "...",
        tags: [],
      }];

      const result = await Prompts.insertMany(ctx as any, userId, input);

      // Should create prompt with empty tagNames
      expect(ctx.db.insert).toHaveBeenCalledWith("prompts", expect.objectContaining({
        tagNames: [],
      }));

      // Should not create any promptTags
      const insertCalls = ctx.db.insert.mock.calls;
      const promptTagInserts = insertCalls.filter((call: unknown[]) => call[0] === "promptTags");
      expect(promptTagInserts).toHaveLength(0);

      expect(result).toEqual(["prompt_1"]);
    });
  });

  describe("with parameters", () => {
    test("inserts prompt with parameters", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
      mockInsertSequence(ctx, ["prompt_1"]);

      const input: Prompts.PromptInput[] = [{
        slug: "template-prompt",
        name: "Template",
        description: "...",
        content: "Hello {{name}}",
        tags: [],
        parameters: [{
          name: "name",
          type: "string",
          required: true,
          description: "The name to greet",
        }],
      }];

      const result = await Prompts.insertMany(ctx as any, userId, input);

      expect(ctx.db.insert).toHaveBeenCalledWith("prompts", expect.objectContaining({
        parameters: [{
          name: "name",
          type: "string",
          required: true,
          description: "The name to greet",
        }],
      }));

      expect(result).toEqual(["prompt_1"]);
    });
  });
});
```

### Service Mock Tests: getPromptBySlug

**File:** `tests/convex/prompts/getPromptBySlug.test.ts`

```typescript
import { describe, test, expect } from "bun:test";
import { createMockCtx, getQueryBuilder } from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";

describe("getPromptBySlug", () => {
  describe("existing prompt", () => {
    test("returns prompt DTO with tags mapped from tagNames", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
        _id: "prompt_1",
        userId,
        slug: "ai-meta-check",
        name: "Meta Cognitive Check",
        description: "Use when you want AI to introspect",
        content: "As you process this...",
        tagNames: ["introspection", "claude"],  // Storage field
        parameters: undefined,
      });

      const result = await Prompts.getBySlug(ctx as any, userId, "ai-meta-check");

      expect(result).toEqual({
        slug: "ai-meta-check",
        name: "Meta Cognitive Check",
        description: "Use when you want AI to introspect",
        content: "As you process this...",
        tags: ["introspection", "claude"],  // DTO field (mapped)
        parameters: undefined,
      });
    });
  });

  describe("prompt with parameters", () => {
    test("returns prompt DTO with parameters", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
        _id: "prompt_1",
        userId,
        slug: "template-prompt",
        name: "Template",
        description: "...",
        content: "Hello {{name}}",
        tagNames: [],
        parameters: [{
          name: "name",
          type: "string",
          required: true,
        }],
      });

      const result = await Prompts.getBySlug(ctx as any, userId, "template-prompt");

      expect(result?.parameters).toEqual([{
        name: "name",
        type: "string",
        required: true,
      }]);
    });
  });

  describe("not found", () => {
    test("returns null for non-existent slug", async () => {
      const ctx = createMockCtx();
      const userId = "user_123";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

      const result = await Prompts.getBySlug(ctx as any, userId, "does-not-exist");

      expect(result).toBeNull();
    });
  });

  describe("user isolation", () => {
    test("query uses userId in index filter", async () => {
      const ctx = createMockCtx();
      const userId = "user_456";

      getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

      await Prompts.getBySlug(ctx as any, userId, "some-slug");

      const builder = getQueryBuilder(ctx, "prompts");
      expect(builder.withIndex).toHaveBeenCalledWith(
        "by_user_slug",
        expect.any(Function)
      );
    });
  });
});
```

### Integration Tests

**File:** `tests/integration/convex/prompts.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterAll, afterEach } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

/**
 * Integration tests for prompt mutations/queries.
 * These run against the deployed Convex backend to verify our mental model.
 *
 * Prerequisites:
 * - CONVEX_URL set to staging deployment
 * - CONVEX_API_KEY set
 * - Test user exists
 */

function getConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error("CONVEX_URL not configured");
  }
  return new ConvexHttpClient(convexUrl);
}

function getApiKey(): string {
  const apiKey = process.env.CONVEX_API_KEY;
  if (!apiKey) {
    throw new Error("CONVEX_API_KEY not configured");
  }
  return apiKey;
}

describe("Convex Prompts Integration", () => {
  let client: ConvexHttpClient;
  let apiKey: string;
  const testUserId = "integration_test_user";
  const createdSlugs: string[] = [];

  beforeAll(() => {
    client = getConvexClient();
    apiKey = getApiKey();
  });

  afterEach(async () => {
    // Cleanup: delete all prompts created during tests
    for (const slug of createdSlugs) {
      try {
        await client.mutation(api.prompts.deletePromptBySlug, {
          apiKey,
          userId: testUserId,
          slug,
        });
      } catch {
        // Ignore errors - prompt may not exist if test failed
      }
    }
    createdSlugs.length = 0;
  });

  function trackSlug(slug: string): string {
    createdSlugs.push(slug);
    return slug;
  }

  describe("insertPrompts → getPromptBySlug round trip", () => {
    test("insert and retrieve prompt", async () => {
      const testSlug = trackSlug(`test-prompt-${Date.now()}`);

      // Insert
      const ids = await client.mutation(api.prompts.insertPrompts, {
        apiKey,
        userId: testUserId,
        prompts: [{
          slug: testSlug,
          name: "Integration Test Prompt",
          description: "Created by integration test",
          content: "Test content",
          tags: ["integration-test"],
        }],
      });

      expect(ids).toHaveLength(1);

      // Retrieve
      const prompt = await client.query(api.prompts.getPromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: testSlug,
      });

      expect(prompt).not.toBeNull();
      expect(prompt?.slug).toBe(testSlug);
      expect(prompt?.name).toBe("Integration Test Prompt");
      expect(prompt?.tags).toContain("integration-test");
    });

    test("insert prompt with parameters", async () => {
      const testSlug = trackSlug(`param-prompt-${Date.now()}`);

      await client.mutation(api.prompts.insertPrompts, {
        apiKey,
        userId: testUserId,
        prompts: [{
          slug: testSlug,
          name: "Param Test",
          description: "Has parameters",
          content: "Hello {{name}}",
          tags: [],
          parameters: [{
            name: "name",
            type: "string",
            required: true,
            description: "Name to greet",
          }],
        }],
      });

      const prompt = await client.query(api.prompts.getPromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: testSlug,
      });

      expect(prompt?.parameters).toHaveLength(1);
      expect(prompt?.parameters?.[0].name).toBe("name");
    });
  });

  describe("duplicate slug rejection", () => {
    test("rejects duplicate slug for same user", async () => {
      const testSlug = trackSlug(`duplicate-test-${Date.now()}`);

      // First insert should succeed
      await client.mutation(api.prompts.insertPrompts, {
        apiKey,
        userId: testUserId,
        prompts: [{
          slug: testSlug,
          name: "First",
          description: "...",
          content: "...",
          tags: [],
        }],
      });

      // Second insert with same slug should fail
      await expect(
        client.mutation(api.prompts.insertPrompts, {
          apiKey,
          userId: testUserId,
          prompts: [{
            slug: testSlug,
            name: "Duplicate",
            description: "...",
            content: "...",
            tags: [],
          }],
        })
      ).rejects.toThrow(/already exists/);
    });
  });

  describe("slug validation", () => {
    test("rejects invalid slug format", async () => {
      await expect(
        client.mutation(api.prompts.insertPrompts, {
          apiKey,
          userId: testUserId,
          prompts: [{
            slug: "Invalid:Slug",
            name: "...",
            description: "...",
            content: "...",
            tags: [],
          }],
        })
      ).rejects.toThrow(/Invalid slug|colons/);
    });
  });

  describe("non-existent slug", () => {
    test("returns null for slug that doesn't exist", async () => {
      const result = await client.query(api.prompts.getPromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: "definitely-does-not-exist-12345",
      });

      expect(result).toBeNull();
    });
  });

  describe("user isolation", () => {
    test("cannot retrieve another user's prompt", async () => {
      const testSlug = trackSlug(`isolation-test-${Date.now()}`);

      // Create prompt as testUserId
      await client.mutation(api.prompts.insertPrompts, {
        apiKey,
        userId: testUserId,
        prompts: [{
          slug: testSlug,
          name: "Private",
          description: "...",
          content: "...",
          tags: [],
        }],
      });

      // Try to retrieve as different user
      const result = await client.query(api.prompts.getPromptBySlug, {
        apiKey,
        userId: "different_user",
        slug: testSlug,
      });

      expect(result).toBeNull();
    });
  });

  describe("delete prompt", () => {
    test("deletes existing prompt", async () => {
      const testSlug = trackSlug(`delete-test-${Date.now()}`);

      // Create
      await client.mutation(api.prompts.insertPrompts, {
        apiKey,
        userId: testUserId,
        prompts: [{
          slug: testSlug,
          name: "To Delete",
          description: "...",
          content: "...",
          tags: [],
        }],
      });

      // Delete
      const deleted = await client.mutation(api.prompts.deletePromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: testSlug,
      });

      expect(deleted).toBe(true);

      // Verify gone
      const prompt = await client.query(api.prompts.getPromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: testSlug,
      });

      expect(prompt).toBeNull();

      // Remove from cleanup list since we already deleted it
      const idx = createdSlugs.indexOf(testSlug);
      if (idx > -1) createdSlugs.splice(idx, 1);
    });

    test("returns false for non-existent prompt", async () => {
      const deleted = await client.mutation(api.prompts.deletePromptBySlug, {
        apiKey,
        userId: testUserId,
        slug: "does-not-exist-12345",
      });

      expect(deleted).toBe(false);
    });
  });
});
```

---

## TDD Red Checklist

When skeleton and tests are in place, run tests and verify:

| Test | Expected Failure |
|------|------------------|
| **Slug validation (pure)** | ✅ Should pass - implemented in skeleton |
| findOrCreateTag returns existing | ❌ NotImplementedError |
| findOrCreateTag creates new | ❌ NotImplementedError |
| slugExists returns true | ❌ NotImplementedError |
| slugExists returns false | ❌ NotImplementedError |
| insertMany creates tags | ❌ NotImplementedError |
| insertMany reuses tags | ❌ NotImplementedError |
| insertMany batch shared tag | ❌ NotImplementedError |
| insertMany duplicate slug | ❌ NotImplementedError |
| insertMany empty tags | ❌ NotImplementedError |
| insertMany with parameters | ❌ NotImplementedError |
| getBySlug returns DTO | ❌ NotImplementedError |
| getBySlug not found | ❌ NotImplementedError |
| deleteBySlug (integration) | ❌ NotImplementedError |

**validateSlug is implemented in skeleton** because it's a pure function with no DB dependency. This lets us verify the test infrastructure works.

---

## Execution Order

1. Create `convex/errors.ts`
2. Update `convex/schema.ts` with new tables
3. **Run `npx convex dev` to regenerate types**
4. Create `convex/model/tags.ts` skeleton
5. Create `convex/model/prompts.ts` skeleton
6. Create `convex/prompts.ts` skeleton
7. Create `tests/fixtures/mockConvexCtx.ts`
8. Create `tests/convex/prompts/findOrCreateTag.test.ts`
9. Create `tests/convex/prompts/slugExists.test.ts`
10. Create `tests/convex/prompts/insertPrompts.test.ts`
11. Create `tests/convex/prompts/getPromptBySlug.test.ts`
12. Create `tests/integration/convex/prompts.test.ts`
13. Run tests, verify failures match expected

---

## Notes

- Integration tests use unique slugs with timestamps to avoid collision
- Integration tests clean up after each test via `afterEach`
- Service mock tests use `bun:test` with native Bun mocks (no vitest)
- Pure functions (validateSlug) are tested directly without mocks
- Auth uses existing apiKey pattern from `convex/auth/apiKey.ts`
- `userId` is `string` (external auth ID), not `Id<"users">`
- Batch operations are atomic - any failure rolls back all
- `tags` in DTO maps from `tagNames` in storage
