# Prompt 1.1: Skeleton + TDD Red

**Story:** Search & Ranking Backend (Story 1)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Create Convex query/mutation stubs and Fastify route stubs, then write tests that assert real behavior. Tests will ERROR (not pass) because stubs throw `NotImplementedError`.

## Prerequisites

Story 0 must be complete — these files exist:
- `src/lib/redis.ts` (stub)
- `src/schemas/drafts.ts`
- `src/schemas/prompts.ts` (with new types)
- `convex/schema.ts` (with new fields)
- `convex/model/ranking.ts` (stub)
- `tests/fixtures/mockConvexCtx.ts` (with `withSearchIndex` mock)
- All 278 existing tests PASS

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-2..20
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 1, Flow 2

---

## Deliverables

### Stubs to Create/Modify

**Convex Prompts API** — Modify `convex/prompts.ts`:

Add these new query/mutation exports:

```typescript
import { v } from "convex/values";
import { query, mutation } from "./functions";

// Add to existing file:

export const listPromptsRanked = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    throw new Error("NotImplementedError: listPromptsRanked not implemented");
  },
});

export const searchPrompts = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    query: v.string(),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    throw new Error("NotImplementedError: searchPrompts not implemented");
  },
});

export const updatePromptFlags = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    slug: v.string(),
    pinned: v.optional(v.boolean()),
    favorited: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    throw new Error("NotImplementedError: updatePromptFlags not implemented");
  },
});

export const trackPromptUse = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    throw new Error("NotImplementedError: trackPromptUse not implemented");
  },
});

export const listTags = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    throw new Error("NotImplementedError: listTags not implemented");
  },
});
```

**Convex Model Helpers** — Modify `convex/model/prompts.ts`:

Add stubs for model-level helpers (used by Convex handlers and unit tests):

```typescript
import type { QueryCtx, MutationCtx } from "../_generated/server";

export async function listPromptsRanked(
  ctx: QueryCtx,
  userId: string,
  limit?: number
): Promise<unknown[]> {
  throw new Error("NotImplementedError: listPromptsRanked not implemented");
}

export async function searchPrompts(
  ctx: QueryCtx,
  userId: string,
  query: string,
  tags?: string[],
  limit?: number
): Promise<unknown[]> {
  throw new Error("NotImplementedError: searchPrompts not implemented");
}

export async function updatePromptFlags(
  ctx: MutationCtx,
  userId: string,
  slug: string,
  updates: { pinned?: boolean; favorited?: boolean }
): Promise<boolean> {
  throw new Error("NotImplementedError: updatePromptFlags not implemented");
}

export async function trackPromptUse(
  ctx: MutationCtx,
  userId: string,
  slug: string
): Promise<boolean> {
  throw new Error("NotImplementedError: trackPromptUse not implemented");
}

export async function listTags(
  ctx: QueryCtx,
  userId: string
): Promise<string[]> {
  throw new Error("NotImplementedError: listTags not implemented");
}
```

**Ranking Helpers** — Modify `convex/model/ranking.ts`:

Add a rerank stub used by tests:

```typescript
export function rerank<T extends { slug: string; usageCount?: number; lastUsedAt?: number; favorited?: boolean; pinned?: boolean }>(
  prompts: T[],
  weights: RankingWeights,
  options: { mode: "list" | "search"; now: number }
): T[] {
  throw new Error("NotImplementedError: rerank not implemented");
}
```

**Fastify Prompts Routes** — Modify `src/routes/prompts.ts`:

Add these new route handlers:

```typescript
// PATCH /api/prompts/:slug/flags - Update pin/favorite
fastify.patch("/:slug/flags", async (request, reply) => {
  throw new Error("NotImplementedError: patchPromptFlags not implemented");
});

// POST /api/prompts/:slug/usage - Track usage
fastify.post("/:slug/usage", async (request, reply) => {
  throw new Error("NotImplementedError: trackUsage not implemented");
});

// GET /api/prompts/tags - List unique tags
fastify.get("/tags", async (request, reply) => {
  throw new Error("NotImplementedError: listTags not implemented");
});
```

**Note:** The existing `GET /api/prompts` route will be modified to support `q`, `tags`, and `limit` query params in the green phase.

---

## Tests to Write

### `tests/convex/prompts/ranking.test.ts` — 7 tests (NEW FILE)

**TC-7 to TC-13**

Use the pure ranking helpers (no Convex runtime):

```typescript
import { describe, it, expect } from "vitest";
import { rerank, type RankingWeights } from "../../../convex/model/ranking";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 8);
const weights: RankingWeights = {
  usage: 3,
  recency: 2,
  favorite: 1,
  pinned: 0.5,
  halfLifeDays: 14,
};

describe("Ranking", () => {
  it("TC-7: prompts sorted by ranking score by default", () => {
    const ranked = rerank(
      [
        { slug: "low", usageCount: 1, lastUsedAt: now - 10 * DAY },
        { slug: "high", usageCount: 50, lastUsedAt: now - 10 * DAY },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked.map((p) => p.slug)).toEqual(["high", "low"]);
  });

  it("TC-8: pinned prompt appears above high-usage unpinned prompt", () => {
    const ranked = rerank(
      [
        { slug: "high", usageCount: 50, pinned: false },
        { slug: "pinned", usageCount: 1, pinned: true },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked[0]?.slug).toBe("pinned");
  });

  it("TC-9: multiple pinned prompts sorted by score among themselves", () => {
    const ranked = rerank(
      [
        { slug: "p1", usageCount: 5, pinned: true },
        { slug: "p2", usageCount: 50, pinned: true },
      ],
      weights,
      { mode: "list", now }
    );
    const pinned = ranked.filter((p) => p.pinned);
    expect(pinned.map((p) => p.slug)).toEqual(["p2", "p1"]);
  });

  it("TC-10: favorited prompt ranks higher than non-favorited with similar usage", () => {
    const ranked = rerank(
      [
        { slug: "fav", usageCount: 10, favorited: true },
        { slug: "plain", usageCount: 10, favorited: false },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked.map((p) => p.slug)).toEqual(["fav", "plain"]);
  });

  it("TC-11: high-usage prompt ranks higher than low-usage", () => {
    const ranked = rerank(
      [
        { slug: "low", usageCount: 1 },
        { slug: "high", usageCount: 100 },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked.map((p) => p.slug)).toEqual(["high", "low"]);
  });

  it("TC-12: recently-used prompt ranks higher than stale prompt", () => {
    const ranked = rerank(
      [
        { slug: "stale", usageCount: 5, lastUsedAt: now - 30 * DAY },
        { slug: "recent", usageCount: 5, lastUsedAt: now - DAY },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked.map((p) => p.slug)).toEqual(["recent", "stale"]);
  });

  it("TC-13: never-used prompt appears below used prompts", () => {
    const ranked = rerank(
      [
        { slug: "used", usageCount: 1, lastUsedAt: now - DAY },
        { slug: "never", usageCount: 0, lastUsedAt: undefined },
      ],
      weights,
      { mode: "list", now }
    );
    expect(ranked.map((p) => p.slug)).toEqual(["used", "never"]);
  });
});
```

### `tests/convex/prompts/searchPrompts.test.ts` — 1 test (NEW FILE)

**TC-2**

Test the model helper so we can inspect the search index call:

```typescript
import { describe, it, expect, vi } from "vitest";
import { createMockCtx, getQueryBuilder, asConvexCtx } from "../../fixtures/mockConvexCtx";
import { searchPrompts } from "../../../convex/model/prompts";

describe("searchPrompts", () => {
  it("TC-2: search is case-insensitive", async () => {
    const ctx = createMockCtx();
    const builder = getQueryBuilder(ctx, "prompts");

    const q = {
      search: vi.fn(() => q),
      eq: vi.fn(() => q),
    };

    builder.withSearchIndex.mockImplementation((_index, cb) => {
      cb(q as unknown as { search: () => void; eq: () => void });
      return builder;
    });

    builder.take.mockResolvedValue([]);

    await searchPrompts(asConvexCtx(ctx), "user_123", "SQL", undefined, 20);

    expect(builder.withSearchIndex).toHaveBeenCalledWith(
      "search_prompts",
      expect.any(Function)
    );
    expect(q.search).toHaveBeenCalledWith("searchText", "sql");
    expect(q.eq).toHaveBeenCalledWith("userId", "user_123");
  });
});
```

### `tests/convex/prompts/usageTracking.test.ts` — 2 tests (NEW FILE)

**TC-15, TC-16**

```typescript
import { describe, it, expect, vi } from "vitest";
import { createMockCtx, getQueryBuilder, asConvexCtx } from "../../fixtures/mockConvexCtx";
import { trackPromptUse } from "../../../convex/model/prompts";

describe("trackPromptUse", () => {
  it("TC-15: tracking usage increments usage count", async () => {
    const ctx = createMockCtx();
    const builder = getQueryBuilder(ctx, "prompts");

    builder.unique.mockResolvedValue({
      _id: "prompt_1",
      userId: "user_123",
      slug: "test-prompt",
      usageCount: 2,
      lastUsedAt: 1000,
    });

    const now = Date.UTC(2026, 0, 8);
    vi.spyOn(Date, "now").mockReturnValue(now);

    await trackPromptUse(asConvexCtx(ctx), "user_123", "test-prompt");

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "prompt_1",
      expect.objectContaining({ usageCount: 3 })
    );
  });

  it("TC-16: tracking usage updates lastUsedAt timestamp", async () => {
    const ctx = createMockCtx();
    const builder = getQueryBuilder(ctx, "prompts");

    builder.unique.mockResolvedValue({
      _id: "prompt_2",
      userId: "user_123",
      slug: "test-prompt",
      usageCount: 0,
      lastUsedAt: undefined,
    });

    const now = Date.UTC(2026, 0, 8);
    vi.spyOn(Date, "now").mockReturnValue(now);

    await trackPromptUse(asConvexCtx(ctx), "user_123", "test-prompt");

    expect(ctx.db.patch).toHaveBeenCalledWith(
      "prompt_2",
      expect.objectContaining({ lastUsedAt: now })
    );
  });
});
```

### `tests/service/prompts/listPrompts.test.ts` — 3 additional tests (MODIFY)

**TC-5, TC-17, TC-18**

Add to existing test file:

```typescript
describe("Search & Ranking", () => {
  test("TC-5: tag filter uses ANY-of semantics", async () => {
    mockConvex.query.mockResolvedValue([]);

    await app.inject({
      method: "GET",
      url: "/api/prompts?tags=sql,python",
      headers: { authorization: `Bearer ${createTestJwt()}` },
    });

    expect(mockConvex.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tags: ["sql", "python"] })
    );
  });

  test("TC-17: listing prompts does not increment usage", async () => {
    mockConvex.query.mockResolvedValue([]);

    await app.inject({
      method: "GET",
      url: "/api/prompts",
      headers: { authorization: `Bearer ${createTestJwt()}` },
    });

    expect(mockConvex.mutation).not.toHaveBeenCalled();
  });

  test("TC-18: searching prompts does not increment usage", async () => {
    mockConvex.query.mockResolvedValue([]);

    await app.inject({
      method: "GET",
      url: "/api/prompts?q=test",
      headers: { authorization: `Bearer ${createTestJwt()}` },
    });

    expect(mockConvex.mutation).not.toHaveBeenCalled();
  });
});
```

---

## Constraints

- Do not implement actual functionality - stubs throw errors
- Only modify Story 0 stubs explicitly listed above (model/ranking + model/prompts)
- Tests assert real behavior, not that NotImplementedError is thrown
- Existing 278 tests must continue to pass

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # 278 existing PASS, 13 new ERROR
```

## Done When

- [ ] All stub functions added to `convex/prompts.ts`
- [ ] All model stubs added to `convex/model/prompts.ts`
- [ ] `rerank()` stub added to `convex/model/ranking.ts`
- [ ] All stub routes added to `src/routes/prompts.ts`
- [ ] 3 new test files created
- [ ] 3 additional tests added to existing file
- [ ] New tests ERROR with NotImplementedError
- [ ] Existing 278 tests still PASS
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (278 PASS, 13 ERROR).
