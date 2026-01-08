# Prompt 0.1: Infrastructure Setup

**Story:** Infrastructure (Story 0)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Create shared infrastructure files (types, schemas, stubs, migrations, test utilities) that all subsequent stories depend on. No features are implemented - only scaffolding.

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`

---

## Deliverables

### 1. Config Addition — `src/lib/config.ts`

Add Redis URL using the existing config pattern (no Zod schema here):

```typescript
// Add to exported config object:
redisUrl: optionalEnv("REDIS_URL"),
```

### 2. Redis Client Stub — `src/lib/redis.ts` (NEW FILE)

```typescript
import { config } from "./config";

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotImplementedError";
  }
}

export interface RedisWrapper {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<"OK" | null>;
  del(key: string): Promise<number>;
  sadd(key: string, ...members: string[]): Promise<number>;
  smembers(key: string): Promise<string[]>;
  srem(key: string, ...members: string[]): Promise<number>;
}

let client: RedisWrapper | null = null;

export const getRedis = (): RedisWrapper => {
  throw new NotImplementedError("Redis client not implemented");
};
```

### 3. Draft Schemas — `src/schemas/drafts.ts` (NEW FILE)

```typescript
import { z } from "zod";

export const DraftTypeSchema = z.enum(["edit", "new", "line"]);
export type DraftType = z.infer<typeof DraftTypeSchema>;

export const DraftDataSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
});

export const DraftDTOSchema = z.object({
  draftId: z.string(),
  type: DraftTypeSchema,
  promptSlug: z.string().optional(),
  data: DraftDataSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  expiresAt: z.number(),
});

export type DraftDTO = z.infer<typeof DraftDTOSchema>;

export const DraftUpsertRequestSchema = z.object({
  type: DraftTypeSchema,
  promptSlug: z.string().optional(),
  data: DraftDataSchema,
});

export type DraftUpsertRequest = z.infer<typeof DraftUpsertRequestSchema>;

export const DraftSummarySchema = z.object({
  count: z.number(),
  latestDraftId: z.string().optional(),
  nextExpiryAt: z.number().optional(),
  hasExpiringSoon: z.boolean(),
});

export type DraftSummary = z.infer<typeof DraftSummarySchema>;
```

### 4. Prompt Schema Additions — `src/schemas/prompts.ts`

Add to existing file:

```typescript
// Add these new schemas:

export const PromptMetaSchema = z.object({
  pinned: z.boolean(),
  favorited: z.boolean(),
  usageCount: z.number(),
  lastUsedAt: z.number().optional(),
});

export type PromptMeta = z.infer<typeof PromptMetaSchema>;

export const PromptDTOv2Schema = PromptInputSchema.extend({
  pinned: z.boolean(),
  favorited: z.boolean(),
  usageCount: z.number(),
  lastUsedAt: z.number().optional(),
});

export type PromptDTOv2 = z.infer<typeof PromptDTOv2Schema>;

export const RankingWeightsSchema = z.object({
  usage: z.number(),
  recency: z.number(),
  favorite: z.number(),
  pinned: z.number(),
  halfLifeDays: z.number(),
});

export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const RankingConfigSchema = z.object({
  weights: RankingWeightsSchema,
  searchRerankLimit: z.number(),
});

export type RankingConfig = z.infer<typeof RankingConfigSchema>;

export const FlagsPatchSchema = z.object({
  pinned: z.boolean().optional(),
  favorited: z.boolean().optional(),
});

export type FlagsPatch = z.infer<typeof FlagsPatchSchema>;
```

### 5. Draft Routes Stub — `src/routes/drafts.ts` (NEW FILE)

```typescript
import type { FastifyPluginAsync } from "fastify";
import { NotImplementedError } from "../lib/redis";

export const draftsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/drafts - List user's drafts
  fastify.get("/", async () => {
    throw new NotImplementedError("listDrafts not implemented");
  });

  // GET /api/drafts/summary - Draft summary for indicator
  fastify.get("/summary", async () => {
    throw new NotImplementedError("getDraftSummary not implemented");
  });

  // PUT /api/drafts/:draftId - Create/update draft
  fastify.put("/:draftId", async () => {
    throw new NotImplementedError("upsertDraft not implemented");
  });

  // DELETE /api/drafts/:draftId - Remove draft
  fastify.delete("/:draftId", async () => {
    throw new NotImplementedError("deleteDraft not implemented");
  });
};
```

### 6. Register Draft Routes — `src/index.ts`

Add to existing route registrations:

```typescript
import { draftsRoutes } from "./routes/drafts";

// In the route registration section:
fastify.register(draftsRoutes, { prefix: "/api/drafts" });
```

### 7. Convex Schema Changes — `convex/schema.ts`

Modify the prompts table definition (add new fields as optional for migration):

```typescript
prompts: defineTable({
  // Existing fields
  userId: v.string(),
  slug: v.string(),
  name: v.string(),
  description: v.string(),
  content: v.string(),
  tagNames: v.array(v.string()),
  parameters: v.optional(parameterSchema),
  // NEW fields (optional during migration)
  searchText: v.optional(v.string()),
  pinned: v.optional(v.boolean()),
  favorited: v.optional(v.boolean()),
  usageCount: v.optional(v.number()),
  lastUsedAt: v.optional(v.number()),
})
  .index("by_user_slug", ["userId", "slug"])
  .index("by_user", ["userId"])
  .searchIndex("search_prompts", {
    searchField: "searchText",
    filterFields: ["userId"],
    staged: false,
  }),

// Add new table for ranking config:
rankingConfig: defineTable({
  key: v.string(),
  weights: v.object({
    usage: v.number(),
    recency: v.number(),
    favorite: v.number(),
    pinned: v.number(),
    halfLifeDays: v.number(),
  }),
  searchRerankLimit: v.number(),
}).index("by_key", ["key"]),
```

### 8. Ranking Model Stub — `convex/model/ranking.ts` (NEW FILE)

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
  throw new Error("NotImplementedError: computeRankScore not implemented");
}

export async function getRankingConfig(ctx: QueryCtx): Promise<RankingConfig> {
  throw new Error("NotImplementedError: getRankingConfig not implemented");
}
```

### 9. Migration Files — `convex/migrations/backfillSearchText.ts` (NEW FILE)

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const backfillSearchText = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, { cursor, batchSize = 100 }) => {
    throw new Error("NotImplementedError: backfillSearchText not implemented");
  },
});

export function buildSearchText(prompt: {
  slug: string;
  name: string;
  description: string;
  content: string;
}): string {
  return `${prompt.slug} ${prompt.name} ${prompt.description} ${prompt.content}`.toLowerCase();
}
```

### 10. Seed Ranking Config — `convex/migrations/seedRankingConfig.ts` (NEW FILE)

Add a one-time seed migration to ensure the default `rankingConfig` row exists:

```typescript
import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { DEFAULT_RANKING_CONFIG } from "../model/ranking";

export const seedRankingConfig = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query("rankingConfig")
      .withIndex("by_key", (q) => q.eq("key", "global"))
      .unique();

    if (existing) return { seeded: false };

    await ctx.db.insert("rankingConfig", {
      key: "global",
      weights: DEFAULT_RANKING_CONFIG.weights,
      searchRerankLimit: DEFAULT_RANKING_CONFIG.searchRerankLimit,
    });

    return { seeded: true };
  },
});
```

### 11. Migration Status Query — `convex/migrations/migrationStatus.ts` (NEW FILE)

```typescript
import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const migrationStatus = internalQuery({
  args: {},
  returns: v.object({
    totalPrompts: v.number(),
    missingSearchText: v.number(),
    missingPinned: v.number(),
    missingFavorited: v.number(),
    missingUsageCount: v.number(),
  }),
  handler: async (ctx) => {
    throw new Error("NotImplementedError: migrationStatus not implemented");
  },
});
```

### 12. Update Mock Convex Context — `tests/fixtures/mockConvexCtx.ts`

Add `withSearchIndex` to the query builder so search tests can assert query normalization:

```typescript
interface MockQueryBuilder {
  withIndex: MockFn;
  withSearchIndex: MockFn;
  filter: MockFn;
  unique: MockFn;
  collect: MockFn;
  take: MockFn;
  first: MockFn;
}

function createQueryBuilder(): MockQueryBuilder {
  const builder: MockQueryBuilder = {
    withIndex: vi.fn(() => builder),
    withSearchIndex: vi.fn(() => builder),
    filter: vi.fn(() => builder),
    unique: vi.fn(() => Promise.resolve(null)),
    collect: vi.fn(() => Promise.resolve([])),
    take: vi.fn(() => Promise.resolve([])),
    first: vi.fn(() => Promise.resolve(null)),
  };
  return builder;
}
```

### 13. Redis Mock — `tests/__mocks__/redis.ts` (NEW FILE)

```typescript
import type { RedisWrapper } from "../../src/lib/redis";

export function createRedisMock(): RedisWrapper & { _store: Map<string, string>; _sets: Map<string, Set<string>> } {
  const store = new Map<string, string>();
  const sets = new Map<string, Set<string>>();

  return {
    _store: store,
    _sets: sets,

    async get(key: string) {
      return store.get(key) ?? null;
    },

    async set(key: string, value: string, _ttlSeconds?: number) {
      store.set(key, value);
      return "OK";
    },

    async del(key: string) {
      const existed = store.has(key) || sets.has(key);
      store.delete(key);
      sets.delete(key);
      return existed ? 1 : 0;
    },

    async sadd(key: string, ...members: string[]) {
      if (!sets.has(key)) {
        sets.set(key, new Set());
      }
      const set = sets.get(key)!;
      let added = 0;
      for (const member of members) {
        if (!set.has(member)) {
          set.add(member);
          added++;
        }
      }
      return added;
    },

    async smembers(key: string) {
      return Array.from(sets.get(key) ?? []);
    },

    async srem(key: string, ...members: string[]) {
      const set = sets.get(key);
      if (!set) return 0;
      let removed = 0;
      for (const member of members) {
        if (set.delete(member)) removed++;
      }
      return removed;
    },
  };
}
```

---

## Constraints

- Do not implement any actual functionality - stubs only
- Do not add tests (infrastructure only)
- Preserve all existing functionality
- Use existing code patterns from the codebase

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # Existing 278 tests should pass
```

## Done When

- [ ] All new files created
- [ ] All modifications made to existing files
- [ ] TypeScript compiles without errors
- [ ] Existing 278 tests still pass
- [ ] Convex schema deploys (run `bunx convex dev` to verify)

After completion, summarize: which files were created/modified and confirm TypeScript compiles and existing tests pass.
