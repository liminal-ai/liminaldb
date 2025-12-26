# Handoff: Phase 1 Complete - 2025-12-26

## Current State

### PR #8: Phase 1 - Prompts insert/get with TDD
- **Status:** All review feedback addressed, CI passing, ready for merge
- **Branch:** `promptdb-insert-get-phase-1`
- **Tests:** 142 service + 13 integration passing

### Staging Deployment (Complete)
- **Fly.io:** https://promptdb-staging.fly.dev
- **Convex:** https://kindred-puffin-892.convex.cloud (Development deployment)
- **WorkOS:** Staging environment with wildcard redirect enabled
- **CI/CD:** GitHub Actions with Blacksmith runners, GitHub Environments

---

## What Was Built

### Convex Schema
```
users (existing)
tags (userId, name) - per-user tag storage
promptTags (promptId, tagId, userId) - junction table
prompts (userId, slug, name, description, content, tagNames, parameters)
```

**Key design:** Relational + denormalized. `tagNames` on prompts for fast reads, `tags` + `promptTags` for management. Sync via helper functions (not triggers).

### Convex Functions
- `insertPrompts` - batch insert with tag deduplication
- `getPromptBySlug` - retrieve by user + slug
- `deletePromptBySlug` - cleanup junction records + orphaned tags

### Test Infrastructure
- **Service mocks:** `tests/convex/` - mocked ctx.db for fast TDD
- **Integration:** `tests/integration/convex/` - real Convex backend
- **Fixtures:** `tests/fixtures/mockConvexCtx.ts` - reusable mock infrastructure

---

## Key Decisions

### Schema
- **Tags only** for MVP (no folders/categories yet)
- **Slugs unique per user** - colons reserved for future namespace prefixes
- **folderPath** deferred - can add later as simple string field

### Testing Strategy
- **Service mocks:** Wide permutations, fast iteration, TDD green
- **Integration tests:** Validate mental model, catch misunderstandings
- If both pass, integration works. If service passes but integration fails, fix understanding.

### Test Organization (TODO)
- Current structure is confusing (`tests/convex/` vs `tests/service/`)
- Plan: Migrate to vitest + projects for native tagging
- Deferred until after Phase 1 merges

### MCP Strategy
- **Tools:** Universal - works everywhere (ChatGPT, Claude, Cursor, etc.)
- **Prompts primitive:** Bonus UX for Claude surfaces only
- **Widget:** Build `/` picker for ChatGPT since no prompts primitive

---

## What's Next

### Build Phases (Walking Skeleton)

| Phase | Tier | Status |
|-------|------|--------|
| 1 | Convex (schema + mutations) | ✅ Complete |
| 2 | Fastify (API routes) | Next |
| 3 | Web (simple forms) | Pending |
| 4 | MCP + Widget | Pending |
| 5 | Search (typeahead) | Pending |

### Phase 2: Fastify Routes
```
POST /prompts      → call api.prompts.insertPrompts
GET  /prompts/:slug → call api.prompts.getPromptBySlug
DELETE /prompts/:slug → call api.prompts.deletePromptBySlug
```

Should be fast - just wiring. Patterns already established.

### After Walking Skeleton
- Vertical slices for each new feature
- Test reorganization (vitest + projects)
- Search with vector + keyword + tags

---

## Files to Reference

### Essential
- `docs/epics/01-promptdb-insert-get/spec.md` - Epic overview, all phases
- `docs/epics/01-promptdb-insert-get/phase-1-tdd-red-spec.md` - Detailed TDD spec
- `CLAUDE.md` - Working style, context

### Code
- `convex/schema.ts` - Data model
- `convex/model/prompts.ts` - Business logic
- `convex/prompts.ts` - Public API
- `tests/fixtures/mockConvexCtx.ts` - Mock infrastructure

---

## Working Style (Calibration)

### Do
- Verify before speculating (read file, run command)
- Fix small things now, don't bucket into "later"
- Evaluate on merit, not default patterns
- High-touch during implementation
- Clean up test data after integration tests

### Don't
- Merge without permission
- Add skipIf to make tests pass (fix the actual problem)
- Churn through commits without thinking
- Default to "non-blocking, skip" on review feedback
- Log sensitive info (API key length, presence)

### TDD Approach
1. Quick phase scope
2. Higher altitude design
3. Skeleton → TDD-Red → TDD-Green
4. Specify test scenarios before writing tests

### When Churning
- Churning = red flag for both agent and user
- Stop, audit what happened in churn state
- Don't patch around problems - understand root cause

---

## Session Highlights

### Lessons Learned
- Convex OCC handles most race conditions, but defensive coding for tag deduplication is safer
- GitHub Environments are cleaner than repo-level secrets
- Service mocks + integration tests = comprehensive coverage without slow tests
- MCP prompts primitive has limited adoption - Tools are the universal path

### Critical Bugs Caught in Review
- Duplicate slugs within batch not detected (fixed)
- API key metadata in error logs (fixed)
- Integration tests with skipIf defeating their purpose (fixed earlier)

---

## Quick Commands

```bash
# Run service tests
bun run test:service

# Run integration tests (requires local Convex)
bun run test:integration

# Deploy Convex to staging
CONVEX_DEPLOY_KEY='...' npx convex deploy

# Deploy to Fly.io
fly deploy --app promptdb-staging
```

---

## PR Reviewers Comparison

| Reviewer | Strength | Note |
|----------|----------|------|
| Claude | Most thorough, finds architectural issues | Best for catching real bugs |
| CodeRabbit | Good code hygiene, provides suggestions | Verbose but actionable |
| Greptile | Good summaries, learns preferences | Missed issues in this PR |
| Copilot | Basic linting | Shallow |

**Recommendation:** Greptile ($30) + Claude (free) for ongoing reviews.

---

*Handoff created: 2025-12-26*
