# Handoff: Phase 2 In Progress - 2025-12-26

## Current State

### PR Status
- **PR #8:** Merged - Phase 1 complete
- **Current branch:** `promptdb-insert-get-phase-1` (Phase 2 work uncommitted)
- **Tests:** 232 passing (168 service + 64 integration)

### Staging
- **Fly.io:** https://promptdb-staging.fly.dev
- **Convex:** https://kindred-puffin-892.convex.cloud
- **WorkOS:** Staging environment
- **CI/CD:** GitHub Actions + Blacksmith + GitHub Environments

---

## What's Built

### Phase 1: Convex (Complete)
```
Schema: users, tags, promptTags, prompts
Functions: insertPrompts, getPromptBySlug, deletePromptBySlug
Triggers: tagNames sync via convex-helpers (refactored from manual helpers)
```

### Phase 2: API Layer (Mostly Complete)

**REST Routes (`src/routes/prompts.ts`):**
```
POST   /api/prompts      → insertPrompts
GET    /api/prompts/:slug → getPromptBySlug
DELETE /api/prompts/:slug → deletePromptBySlug
```

**MCP Tools (`src/lib/mcp.ts`):**
```
save_prompts  → batch insert
get_prompt    → retrieve by slug
delete_prompt → delete by slug
```

**Shared Schemas (`src/schemas/prompts.ts`):**
- Single Zod source of truth
- Used by REST routes and MCP save_prompts
- Types derived from Zod

---

## Outstanding Issues (Must Fix)

From senior engineer review:

1. **MCP get_prompt/delete_prompt missing slug validation**
   - REST routes validate with `validateSlugParam()`
   - MCP tools just pass `z.string()` directly to Convex
   - Should use same validation

2. **MCP get_prompt/delete_prompt missing try-catch**
   - save_prompts has try-catch with sanitized errors
   - get_prompt and delete_prompt have no error handling
   - Convex errors propagate unhandled

3. **REST GET/DELETE missing try-catch**
   - POST has try-catch for duplicate slug
   - GET and DELETE don't catch Convex errors

---

## Key Decisions

### Schema Architecture
- **Relational + denormalized:** `tags` + `promptTags` tables, `tagNames` array on prompts
- **Sync via triggers:** convex-helpers triggers on promptTags table
- **Tags only:** No folders/categories for MVP

### Validation Strategy
- **One Zod schema** in `src/schemas/prompts.ts`
- **Validate at both layers:** API rejects bad input, Convex is defense in depth
- **Don't validate responses:** Trust Convex on reads

### Testing
- **Service mocks:** Fast TDD, mocked dependencies
- **Integration:** Validate mental model against real services
- **Cleanup:** Delete test data after integration tests

---

## What's Next

| Phase | Status |
|-------|--------|
| 1. Convex | Complete |
| 2. API Layer | Fix 3 issues above, then complete |
| 2.5 Test Reorg | vitest + projects (deferred) |
| 3. Web Frontend | Pending |
| 4. MCP Widget | Pending |
| 5. Search | Pending |

---

## Files

### Core
- `src/routes/prompts.ts` - REST handlers
- `src/lib/mcp.ts` - MCP tools
- `src/schemas/prompts.ts` - Shared Zod schemas
- `convex/prompts.ts` - Convex mutations/queries
- `convex/model/prompts.ts` - Business logic
- `convex/triggers.ts` - tagNames sync trigger

### Specs
- `docs/epics/01-promptdb-insert-get/phase-2-tdd-red-spec.md`

---

## Working Style

### Do
- Verify before speculating
- Fix small things now
- Engage with questions, don't deflect
- When asked "why did you do X" - answer why

### Don't
- Merge without permission
- Say "you're right" as a deflection
- Ask permission repeatedly after already getting an answer
- Add estimates when not asked
- Call TaskOutput after notification already gives file path
- Disengage when there's friction - engagement reduces friction

### When Churning
- Stop and audit the churn state
- Multiple quick commits = red flag
- Understand root cause before patching

---

*Handoff created: 2025-12-26 ~10pm*
