# Prompt 3.2: TDD Green

**Story:** Durable Drafts Backend (Story 3)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the draft route handlers to make all Story 3 tests pass.

## Prerequisites

Prompt 3.1 must be complete:
- `src/lib/redis.ts` — Redis client implemented
- `src/routes/drafts.ts` — route stubs with types
- `tests/service/drafts/drafts.test.ts` — 4 tests (ERROR)
- `tests/__mocks__/redis.ts` — Redis mock exists

## Reference Documents

- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 4: Durable Drafts
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-34..42

---

## Deliverables

### Implement Draft Routes — `src/routes/drafts.ts`

```typescript
import type { FastifyPluginAsync } from "fastify";
import { getRedis, NotImplementedError } from "../lib/redis";
import {
  DraftDTOSchema,
  DraftUpsertRequestSchema,
  DraftSummarySchema,
  type DraftDTO,
  type DraftSummary,
  type DraftUpsertRequest,
} from "../schemas/drafts";
import { getAuthenticatedUser } from "../lib/auth/getAuthenticatedUser";

const DRAFT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000; // 2 hours

function getDraftKey(userId: string, draftId: string): string {
  return `liminal:draft:${userId}:${draftId}`;
}

function getDraftSetKey(userId: string): string {
  return `liminal:drafts:${userId}`;
}

export const draftsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/drafts - List user's drafts
  fastify.get<{ Reply: DraftDTO[] }>("/", async (request, reply) => {
    const user = await getAuthenticatedUser(request);
    const redis = getRedis();

    // Get all draft IDs for this user
    const draftIds = await redis.smembers(getDraftSetKey(user.sub));

    // Fetch all drafts
    const drafts: DraftDTO[] = [];
    for (const draftId of draftIds) {
      const data = await redis.get(getDraftKey(user.sub, draftId));
      if (data) {
        try {
          const draft = DraftDTOSchema.parse(JSON.parse(data));
          drafts.push(draft);
        } catch {
          // Invalid draft data, skip
        }
      } else {
        // Draft expired or missing, remove from set
        await redis.srem(getDraftSetKey(user.sub), draftId);
      }
    }

    // Sort by updatedAt descending
    drafts.sort((a, b) => b.updatedAt - a.updatedAt);

    return reply.send(drafts);
  });

  // GET /api/drafts/summary - Draft summary for indicator
  fastify.get<{ Reply: DraftSummary }>("/summary", async (request, reply) => {
    const user = await getAuthenticatedUser(request);
    const redis = getRedis();

    const draftIds = await redis.smembers(getDraftSetKey(user.sub));

    let count = 0;
    let latestDraftId: string | undefined;
    let latestUpdatedAt = 0;
    let nextExpiryAt: number | undefined;
    let hasExpiringSoon = false;
    const now = Date.now();

    for (const draftId of draftIds) {
      const data = await redis.get(getDraftKey(user.sub, draftId));
      if (data) {
        try {
          const draft = DraftDTOSchema.parse(JSON.parse(data));
          count++;

          if (draft.updatedAt > latestUpdatedAt) {
            latestUpdatedAt = draft.updatedAt;
            latestDraftId = draft.draftId;
          }

          if (!nextExpiryAt || draft.expiresAt < nextExpiryAt) {
            nextExpiryAt = draft.expiresAt;
          }

          if (draft.expiresAt - now < EXPIRY_WARNING_MS) {
            hasExpiringSoon = true;
          }
        } catch {
          // Invalid draft, skip
        }
      } else {
        // Draft expired, remove from set
        await redis.srem(getDraftSetKey(user.sub), draftId);
      }
    }

    return reply.send({
      count,
      latestDraftId,
      nextExpiryAt,
      hasExpiringSoon,
    });
  });

  // PUT /api/drafts/:draftId - Create/update draft
  fastify.put<{
    Params: { draftId: string };
    Body: DraftUpsertRequest;
    Reply: DraftDTO;
  }>("/:draftId", async (request, reply) => {
    const user = await getAuthenticatedUser(request);
    const { draftId } = request.params;
    const body = DraftUpsertRequestSchema.parse(request.body);
    const redis = getRedis();

    const now = Date.now();
    const key = getDraftKey(user.sub, draftId);

    // Check for existing draft
    const existingData = await redis.get(key);
    let createdAt = now;

    if (existingData) {
      try {
        const existing = DraftDTOSchema.parse(JSON.parse(existingData));
        createdAt = existing.createdAt;
      } catch {
        // Invalid existing data, use new timestamp
      }
    }

    const draft: DraftDTO = {
      draftId,
      type: body.type,
      promptSlug: body.promptSlug,
      data: body.data,
      createdAt,
      updatedAt: now,
      expiresAt: now + DRAFT_TTL_SECONDS * 1000,
    };

    // Store draft with TTL
    await redis.set(key, JSON.stringify(draft), DRAFT_TTL_SECONDS);

    // Add to user's draft set
    await redis.sadd(getDraftSetKey(user.sub), draftId);

    return reply.send(draft);
  });

  // DELETE /api/drafts/:draftId - Remove draft
  fastify.delete<{
    Params: { draftId: string };
    Reply: { deleted: boolean };
  }>("/:draftId", async (request, reply) => {
    const user = await getAuthenticatedUser(request);
    const { draftId } = request.params;
    const redis = getRedis();

    const key = getDraftKey(user.sub, draftId);

    // Remove draft data
    const deleted = await redis.del(key);

    // Remove from user's draft set
    await redis.srem(getDraftSetKey(user.sub), draftId);

    return reply.send({ deleted: deleted > 0 });
  });
};
```

---

## Constraints

- Do not modify Redis client (implemented in 3.1)
- Do not modify Convex files (Stories 1-2)
- Do not modify UI files (Stories 4-5)
- Follow existing route patterns

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # All 311 tests should PASS
```

### Manual Verification

1. Start Redis: `redis-server`
2. Start server: `bun run dev`
3. Create draft: `PUT /api/drafts/edit:test-prompt` with body
4. List drafts: `GET /api/drafts` returns the draft
5. Get summary: `GET /api/drafts/summary` shows count = 1
6. Delete draft: `DELETE /api/drafts/edit:test-prompt`
7. List again: `GET /api/drafts` returns empty array

## Done When

- [ ] All 311 tests PASS (307 + 4)
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] Drafts persist across requests

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
