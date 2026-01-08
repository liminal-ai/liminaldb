# Story 3: Durable Drafts Backend

**Epic:** Search & Select (Epic 02)

**Working Directory:** `/Users/leemoore/promptdb`

**Reference Documents:**
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`

---

## User Story

**As a** prompt power user,
**I want** my in-progress edits to persist across browser refresh and tabs,
**So that** I don't lose work if something interrupts my editing session.

---

## Context

Story 0 created the Redis client stub and draft schemas. This story implements the actual Redis integration and draft API. After this story:

- Drafts persist in Redis with 24-hour TTL
- API endpoints for list, upsert, delete, and summary
- Cross-tab visibility via summary endpoint
- Draft expiration handled automatically

This is backend-only. UI integration comes in Story 5.

---

## Scope

**In scope:**
- Redis client implementation (Bun native)
- `GET /api/drafts` — list user's drafts
- `GET /api/drafts/summary` — count, latest, expiring soon
- `PUT /api/drafts/:draftId` — create/update draft
- `DELETE /api/drafts/:draftId` — remove draft
- 24-hour TTL on drafts
- Draft ID scheme: `edit:{slug}` or `new:{uuid}`

**Out of scope:**
- UI draft indicator (Story 5)
- Line edit → draft accumulation (Story 5)
- Save/discard flow (Story 5)

---

## Acceptance Criteria

| ID | Criteria |
|----|----------|
| AC-34 | Drafts survive browser refresh |
| AC-35 | Drafts are accessible from other browser tabs |
| AC-38 | User can save draft (commits to database) |
| AC-39 | User can discard draft (clears without saving) |
| AC-41 | Drafts expire after 24 hours |

**Note:** AC-35 is enabled by the backend (summary endpoint for cross-tab polling). UI verification of cross-tab behavior is in Story 5.

---

## Test Conditions

| TC | Condition | ACs |
|----|-----------|-----|
| TC-32 | Given draft exists, when browser refreshed, then draft restored | AC-34 |
| TC-36 | Given draft, when save endpoint called, then draft data can be used to update Convex | AC-38 |
| TC-37 | Given draft, when delete endpoint called, then draft cleared | AC-39 |
| TC-39 | Given draft older than 24h, then draft expired | AC-41 |

---

## Dependencies

- **Story 0 must be complete** — Redis client stub, draft schemas exist

---

## Deliverables

**Modified files:**

| File | Changes |
|------|---------|
| `src/lib/redis.ts` | Implement Bun Redis client wrapper |
| `src/routes/drafts.ts` | Implement all draft handlers |

**New files:**

| File | Tests |
|------|-------|
| `tests/service/drafts/drafts.test.ts` | TC-32, TC-36, TC-37, TC-39 (4 tests) |

**Note:** Draft tests use the Redis mock from Story 0 (`tests/__mocks__/redis.ts`) for deterministic testing.

---

## Definition of Done

**Test counts:**
- `drafts.test.ts`: 4 new tests
- **Total new tests: 4**

**Running total:** 300 + 4 = 304 tests

**Verification:**
- All 304 tests pass
- Manual: Create draft via API, verify persists
- Manual: Refresh, draft still exists
- Manual: Delete draft, verify removed
- Manual: Verify TTL (test with short TTL in dev)
