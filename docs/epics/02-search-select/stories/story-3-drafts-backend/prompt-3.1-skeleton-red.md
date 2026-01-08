# Prompt 3.1: Skeleton + TDD Red

**Story:** Durable Drafts Backend (Story 3)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the Redis client and draft route handlers, then write tests that assert real behavior. Tests will ERROR (not pass) because stubs throw `NotImplementedError`.

**Note:** This story implements actual functionality for Redis (not just stubs) because the draft routes need a working Redis client. The route handlers remain as stubs until green phase.

## Prerequisites

Story 0 must be complete — these files exist:
- `src/lib/redis.ts` (stub — will be implemented in this story)
- `src/schemas/drafts.ts`
- `src/routes/drafts.ts` (stub routes registered)
- `tests/__mocks__/redis.ts` (mock for testing)
- All 300 tests PASS (278 + 13 + 9 from Stories 0-2)

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-34, AC-35, AC-38, AC-39, AC-41
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 4: Durable Drafts

---

## Deliverables

### 1. Implement Redis Client — `src/lib/redis.ts`

Replace the stub with actual implementation:

```typescript
import { RedisClient } from "bun";
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
  if (!config.redisUrl) {
    throw new Error("REDIS_URL not configured");
  }

  if (!client) {
    const raw = new RedisClient(config.redisUrl);
    client = {
      get: (key) => raw.get(key),
      set: async (key, value, ttlSeconds) => {
        if (ttlSeconds !== undefined) {
          return raw.set(key, value, "EX", ttlSeconds);
        }
        return raw.set(key, value);
      },
      del: (key) => raw.del(key),
      sadd: (key, ...members) => raw.sadd(key, ...members),
      smembers: (key) => raw.smembers(key),
      srem: (key, ...members) => raw.srem(key, ...members),
    };
  }

  return client;
};

// For testing - allows injecting a mock
export const setRedisClient = (mockClient: RedisWrapper | null) => {
  client = mockClient;
};
```

### 2. Update Draft Routes — `src/routes/drafts.ts`

Keep as stubs but add proper request/response types:

```typescript
import type { FastifyPluginAsync } from "fastify";
import { NotImplementedError } from "../lib/redis";
import {
  DraftDTOSchema,
  DraftUpsertRequestSchema,
  DraftSummarySchema,
  type DraftDTO,
  type DraftSummary,
} from "../schemas/drafts";
import { z } from "zod";

const DRAFT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const EXPIRY_WARNING_HOURS = 2;

export const draftsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/drafts - List user's drafts
  fastify.get<{ Reply: DraftDTO[] }>("/", async (request, reply) => {
    throw new NotImplementedError("listDrafts not implemented");
  });

  // GET /api/drafts/summary - Draft summary for indicator
  fastify.get<{ Reply: DraftSummary }>("/summary", async (request, reply) => {
    throw new NotImplementedError("getDraftSummary not implemented");
  });

  // PUT /api/drafts/:draftId - Create/update draft
  fastify.put<{
    Params: { draftId: string };
    Body: z.infer<typeof DraftUpsertRequestSchema>;
    Reply: DraftDTO;
  }>("/:draftId", async (request, reply) => {
    throw new NotImplementedError("upsertDraft not implemented");
  });

  // DELETE /api/drafts/:draftId - Remove draft
  fastify.delete<{
    Params: { draftId: string };
    Reply: { deleted: boolean };
  }>("/:draftId", async (request, reply) => {
    throw new NotImplementedError("deleteDraft not implemented");
  });
};
```

---

## Tests to Write

### `tests/service/drafts/drafts.test.ts` — 4 tests (NEW FILE)

**TC-32, TC-36, TC-37, TC-39**

Uses the Redis mock from Story 0 (`tests/__mocks__/redis.ts`).

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";
import { draftsRoutes } from "../../../src/routes/drafts";
import { createRedisMock } from "../../__mocks__/redis";
import { setRedisClient } from "../../../src/lib/redis";
import type { DraftDTO, DraftUpsertRequest } from "../../../src/schemas/drafts";

describe("Drafts API", () => {
  let app: ReturnType<typeof Fastify>;
  let redisMock: ReturnType<typeof createRedisMock>;

  beforeEach(async () => {
    redisMock = createRedisMock();
    setRedisClient(redisMock);

    app = Fastify();
    await app.register(draftsRoutes, { prefix: "/api/drafts" });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
    setRedisClient(null);
  });

  it("TC-32: draft survives browser refresh (persists in Redis)", async () => {
    const draftData: DraftUpsertRequest = {
      type: "edit",
      promptSlug: "test-prompt",
      data: {
        slug: "test-prompt",
        name: "Test Prompt",
        description: "A test",
        content: "Hello {{name}}",
        tags: ["test"],
      },
    };

    // Create draft
    const createResponse = await app.inject({
      method: "PUT",
      url: "/api/drafts/edit:test-prompt",
      payload: draftData,
      headers: { "Content-Type": "application/json" },
    });

    // Simulate "refresh" by fetching drafts
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/drafts",
    });

    expect(listResponse.statusCode).toBe(200);
    const drafts = JSON.parse(listResponse.body) as DraftDTO[];
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts[0].promptSlug).toBe("test-prompt");
  });

  it("TC-36: save endpoint provides draft data for Convex update", async () => {
    const draftData: DraftUpsertRequest = {
      type: "edit",
      promptSlug: "test-prompt",
      data: {
        slug: "test-prompt",
        name: "Updated Name",
        description: "Updated description",
        content: "Updated content",
        tags: ["updated"],
      },
    };

    // Create draft
    const response = await app.inject({
      method: "PUT",
      url: "/api/drafts/edit:test-prompt",
      payload: draftData,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.statusCode).toBe(200);
    const draft = JSON.parse(response.body) as DraftDTO;

    // Draft data should be usable for Convex update
    expect(draft.data.name).toBe("Updated Name");
    expect(draft.data.content).toBe("Updated content");
    expect(draft.draftId).toBe("edit:test-prompt");
  });

  it("TC-37: delete endpoint clears draft from Redis", async () => {
    // First create a draft
    const draftData: DraftUpsertRequest = {
      type: "edit",
      promptSlug: "test-prompt",
      data: {
        slug: "test-prompt",
        name: "Test",
        description: "Test",
        content: "Test",
        tags: [],
      },
    };

    await app.inject({
      method: "PUT",
      url: "/api/drafts/edit:test-prompt",
      payload: draftData,
      headers: { "Content-Type": "application/json" },
    });

    // Delete the draft
    const deleteResponse = await app.inject({
      method: "DELETE",
      url: "/api/drafts/edit:test-prompt",
    });

    expect(deleteResponse.statusCode).toBe(200);
    const result = JSON.parse(deleteResponse.body);
    expect(result.deleted).toBe(true);

    // Verify draft is gone
    const listResponse = await app.inject({
      method: "GET",
      url: "/api/drafts",
    });

    const drafts = JSON.parse(listResponse.body) as DraftDTO[];
    expect(drafts.find((d) => d.draftId === "edit:test-prompt")).toBeUndefined();
  });

  it("TC-39: draft expires after 24 hours (TTL)", async () => {
    const draftData: DraftUpsertRequest = {
      type: "new",
      data: {
        slug: "new-prompt",
        name: "New Prompt",
        description: "Test",
        content: "Content",
        tags: [],
      },
    };

    const response = await app.inject({
      method: "PUT",
      url: "/api/drafts/new:abc123",
      payload: draftData,
      headers: { "Content-Type": "application/json" },
    });

    expect(response.statusCode).toBe(200);
    const draft = JSON.parse(response.body) as DraftDTO;

    // Verify expiresAt is approximately 24 hours from now
    const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
    expect(draft.expiresAt).toBeGreaterThan(Date.now());
    expect(draft.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000); // 1s tolerance
  });
});
```

---

## Constraints

- Implement Redis client (not a stub)
- Route handlers remain stubs until green phase
- Use Redis mock from Story 0 for testing
- Tests assert real behavior
- Existing 300 tests must continue to pass

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # 300 existing PASS, 4 new ERROR
```

## Done When

- [ ] Redis client implemented in `src/lib/redis.ts`
- [ ] Draft routes updated with proper types
- [ ] 1 new test file created with 4 tests
- [ ] Tests use Redis mock from Story 0
- [ ] New tests ERROR with NotImplementedError (from route stubs)
- [ ] Existing 300 tests still PASS
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (300 PASS, 4 ERROR).
