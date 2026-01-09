# Prompt 1.2: TDD Green

**Story:** Search & Ranking Backend (Story 1)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the Convex queries/mutations and Fastify routes to make all Story 1 tests pass.

## Prerequisites

Prompt 1.1 must be complete — stubs and tests in place:
- `convex/prompts.ts` — query/mutation stubs
- `convex/model/prompts.ts` — model helper stubs
- `convex/model/ranking.ts` — `rerank()` stub
- `src/routes/prompts.ts` — route stubs
- `tests/convex/prompts/ranking.test.ts` — 7 tests (ERROR)
- `tests/convex/prompts/searchPrompts.test.ts` — 1 test (ERROR)
- `tests/convex/prompts/usageTracking.test.ts` — 2 tests (ERROR)
- `tests/service/prompts/listPrompts.test.ts` — 3 additional tests (ERROR)

## Reference Documents

- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 1, Flow 2
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-2..20

---

## Deliverables

### 1. Implement `convex/model/ranking.ts`

```typescript
import type { QueryCtx } from "../_generated/server";

export interface RankingWeights {
  usage: number;
  recency: number;
  favorite: number;
  pinned: number;
  halfLifeDays: number;
}

export interface RankingConfig {
  weights: RankingWeights;
  searchRerankLimit: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
  weights: {
    usage: 3,
    recency: 2,
    favorite: 1,
    pinned: 0.5,
    halfLifeDays: 14,
  },
  searchRerankLimit: 200,
};

export function computeRankScore(
  prompt: {
    usageCount?: number;
    lastUsedAt?: number;
    favorited?: boolean;
    pinned?: boolean;
  },
  now: number,
  weights: RankingWeights
): number {
  const usageCount = prompt.usageCount ?? 0;
  const lastUsedAt = prompt.lastUsedAt ?? 0;

  // Base usage score
  const usageScore = usageCount * weights.usage;

  // Recency decay (exponential)
  const daysSince = lastUsedAt > 0 ? (now - lastUsedAt) / (24 * 60 * 60 * 1000) : Infinity;
  const recencyMultiplier = daysSince === Infinity ? 0 : Math.exp(-daysSince / weights.halfLifeDays);
  const recencyScore = usageScore * recencyMultiplier * weights.recency;

  // Favorite boost
  const favoriteBoost = prompt.favorited ? weights.favorite * 100 : 0;

  // Pinned boost (very high to ensure pinned always at top)
  const pinnedBoost = prompt.pinned ? weights.pinned * 10000 : 0;

  return usageScore + recencyScore + favoriteBoost + pinnedBoost;
}

export function rerank<T extends {
  slug: string;
  usageCount?: number;
  lastUsedAt?: number;
  favorited?: boolean;
  pinned?: boolean
}>(
  prompts: T[],
  weights: RankingWeights,
  options: { mode: "list" | "search"; now: number }
): T[] {
  const { now } = options;

  return [...prompts].sort((a, b) => {
    const scoreA = computeRankScore(a, now, weights);
    const scoreB = computeRankScore(b, now, weights);
    return scoreB - scoreA;
  });
}

export async function getRankingConfig(ctx: QueryCtx): Promise<RankingConfig> {
  const stored = await ctx.db
    .query("rankingConfig")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();

  if (stored) {
    return {
      weights: stored.weights,
      searchRerankLimit: stored.searchRerankLimit,
    };
  }

  return DEFAULT_RANKING_CONFIG;
}
```

### 2. Implement `convex/model/prompts.ts` (new functions)

Add to existing file:

```typescript
import { computeRankScore, getRankingConfig, rerank, type RankingWeights } from "./ranking";

export async function listPromptsRanked(
  ctx: QueryCtx,
  userId: string,
  limit?: number
): Promise<PromptDTO[]> {
  const config = await getRankingConfig(ctx);
  const now = Date.now();

  const prompts = await ctx.db
    .query("prompts")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  const ranked = rerank(prompts, config.weights, { mode: "list", now });
  const limited = limit ? ranked.slice(0, limit) : ranked;

  return limited.map((p) => toDTO(p));
}

export async function searchPrompts(
  ctx: QueryCtx,
  userId: string,
  query: string,
  tags?: string[],
  limit?: number
): Promise<PromptDTO[]> {
  const config = await getRankingConfig(ctx);
  const now = Date.now();
  const searchLimit = Math.min(limit ?? 50, config.searchRerankLimit);

  // Search with Convex full-text index
  let results = await ctx.db
    .query("prompts")
    .withSearchIndex("search_prompts", (q) =>
      q.search("searchText", query.toLowerCase()).eq("userId", userId)
    )
    .take(searchLimit);

  // Filter by tags (ANY-of)
  if (tags && tags.length > 0) {
    results = results.filter((p) =>
      tags.some((t) => p.tagNames.includes(t))
    );
  }

  // Re-rank by usage/recency
  const ranked = rerank(results, config.weights, { mode: "search", now });

  return ranked.map((p) => toDTO(p));
}

export async function updatePromptFlags(
  ctx: MutationCtx,
  userId: string,
  slug: string,
  updates: { pinned?: boolean; favorited?: boolean }
): Promise<boolean> {
  const prompt = await ctx.db
    .query("prompts")
    .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
    .unique();

  if (!prompt) return false;

  const patch: Partial<{ pinned: boolean; favorited: boolean }> = {};
  if (updates.pinned !== undefined) patch.pinned = updates.pinned;
  if (updates.favorited !== undefined) patch.favorited = updates.favorited;

  await ctx.db.patch(prompt._id, patch);
  return true;
}

export async function trackPromptUse(
  ctx: MutationCtx,
  userId: string,
  slug: string
): Promise<boolean> {
  const prompt = await ctx.db
    .query("prompts")
    .withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
    .unique();

  if (!prompt) return false;

  await ctx.db.patch(prompt._id, {
    usageCount: (prompt.usageCount ?? 0) + 1,
    lastUsedAt: Date.now(),
  });

  return true;
}

export async function listTags(
  ctx: QueryCtx,
  userId: string
): Promise<string[]> {
  const tags = await ctx.db
    .query("tags")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  return tags.map((t) => t.name).sort();
}

// Helper to convert storage format to DTO
function toDTO(prompt: Doc<"prompts">): PromptDTO {
  return {
    slug: prompt.slug,
    name: prompt.name,
    description: prompt.description,
    content: prompt.content,
    tags: prompt.tagNames,
    parameters: prompt.parameters,
    pinned: prompt.pinned ?? false,
    favorited: prompt.favorited ?? false,
    usageCount: prompt.usageCount ?? 0,
    lastUsedAt: prompt.lastUsedAt,
  };
}
```

### 3. Implement `convex/prompts.ts` (new exports)

Wire the model helpers to Convex queries/mutations:

```typescript
export const listPromptsRanked = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { apiKey, userId, limit }) => {
    await authenticateApiKey(ctx, apiKey);
    return PromptsModel.listPromptsRanked(ctx, userId, limit);
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
  handler: async (ctx, { apiKey, userId, query, tags, limit }) => {
    await authenticateApiKey(ctx, apiKey);
    return PromptsModel.searchPrompts(ctx, userId, query, tags ?? undefined, limit);
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
  handler: async (ctx, { apiKey, userId, slug, pinned, favorited }) => {
    await authenticateApiKey(ctx, apiKey);
    return PromptsModel.updatePromptFlags(ctx, userId, slug, { pinned, favorited });
  },
});

export const trackPromptUse = mutation({
  args: {
    apiKey: v.string(),
    userId: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, { apiKey, userId, slug }) => {
    await authenticateApiKey(ctx, apiKey);
    return PromptsModel.trackPromptUse(ctx, userId, slug);
  },
});

export const listTags = query({
  args: {
    apiKey: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, { apiKey, userId }) => {
    await authenticateApiKey(ctx, apiKey);
    return PromptsModel.listTags(ctx, userId);
  },
});
```

### 4. Implement Fastify Routes — `src/routes/prompts.ts`

Update `GET /api/prompts` to support search params and add new routes:

```typescript
// Modify existing GET /api/prompts handler
fastify.get("/", async (request, reply) => {
  const user = await getAuthenticatedUser(request);
  const { q, tags, limit } = request.query as {
    q?: string;
    tags?: string;
    limit?: string;
  };

  const parsedTags = tags
    ? tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    : undefined;
  const parsedLimit = limit ? parseInt(limit, 10) : undefined;

  if (q && q.trim().length > 0) {
    // Search mode
    let results = await convex.query(api.prompts.searchPrompts, {
      apiKey: config.convexApiKey,
      userId: user.sub,
      query: q.trim(),
      tags: parsedTags,
      limit: parsedLimit,
    });

    // Defensive: if tag filtering isn't pushed into Convex yet, enforce ANY-of tags here.
    if (parsedTags && parsedTags.length > 0) {
      results = results.filter((p) => parsedTags.some((t) => p.tags.includes(t)));
    }

    return reply.send(results);
  }

  // List mode (ranked) — tags-only filtering should still work without q
  let results = await convex.query(api.prompts.listPromptsRanked, {
    apiKey: config.convexApiKey,
    userId: user.sub,
    limit: parsedLimit,
  });

  if (parsedTags && parsedTags.length > 0) {
    results = results.filter((p) => parsedTags.some((t) => p.tags.includes(t)));
  }

  return reply.send(results);
});

// PATCH /api/prompts/:slug/flags
fastify.patch("/:slug/flags", async (request, reply) => {
  const user = await getAuthenticatedUser(request);
  const { slug } = request.params as { slug: string };
  const body = FlagsPatchSchema.parse(request.body);

  const success = await convex.mutation(api.prompts.updatePromptFlags, {
    apiKey: config.convexApiKey,
    userId: user.sub,
    slug,
    pinned: body.pinned,
    favorited: body.favorited,
  });

  if (!success) {
    return reply.status(404).send({ error: "Prompt not found" });
  }

  return reply.send({ updated: true });
});

// POST /api/prompts/:slug/usage
fastify.post("/:slug/usage", async (request, reply) => {
  const user = await getAuthenticatedUser(request);
  const { slug } = request.params as { slug: string };

  // Fire-and-forget style - don't wait
  convex.mutation(api.prompts.trackPromptUse, {
    apiKey: config.convexApiKey,
    userId: user.sub,
    slug,
  }).catch(() => {}); // Ignore failures

  return reply.status(204).send();
});

// GET /api/prompts/tags
fastify.get("/tags", async (request, reply) => {
  const user = await getAuthenticatedUser(request);

  const tags = await convex.query(api.prompts.listTags, {
    apiKey: config.convexApiKey,
    userId: user.sub,
  });

  return reply.send(tags);
});
```

---

## Constraints

- Do not implement MCP tools (Story 2)
- Do not implement draft routes (Story 3)
- Do not modify UI files (Stories 4-5)
- Follow existing code patterns in the repository

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # All 298 tests should PASS
```

### Manual Verification

1. Start Convex: `bunx convex dev`
2. Start server: `bun run dev`
3. Test ranking: `GET /api/prompts` returns prompts sorted by usage/recency
4. Test search: `GET /api/prompts?q=test` returns matching prompts
5. Test flags: `PATCH /api/prompts/:slug/flags` updates pin/favorite
6. Test usage: `POST /api/prompts/:slug/usage` returns 204

## Done When

- [ ] All 298 tests PASS (278 + 20)
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] Convex schema deploys successfully

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
