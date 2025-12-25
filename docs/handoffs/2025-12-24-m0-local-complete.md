# Handoff: M0 Local Complete → Staging Deployment

**Date:** 2025-12-24
**From:** Sonnet session (M0 local standup)
**To:** Next agent (staging deployment)
**Status:** Local environment fully validated, ready for staging

---

## Product Context

**PromptDB** - Prompt management and knowledge worker tool providing MCP access across all AI chat surfaces.

**Tech Stack:**
- Runtime: Bun
- API: Fastify (port 5001)
- Database: Convex (edge runtime)
- Auth: WorkOS AuthKit
- Protocol: MCP (Model Context Protocol)
- Deployment: Fly.io

**Current Phase:** M0 - Stack Architecture Standup
**Goal:** Production hello world with full auth before any product features

---

## What's Working (Local)

### Core Stack
- ✅ Bun + Fastify server on port 5001
- ✅ Convex local backend (`npx convex dev --local`)
- ✅ WorkOS AuthKit integration (local environment)
- ✅ Static file serving (public/)
- ✅ 130 tests passing (service + integration)

### Authentication (3 Paths)
1. **Web Auth** - OAuth flow → HttpOnly cookies
   - Login flow: `/auth/login` → WorkOS → `/auth/callback` → cookie set
   - Endpoints: `/auth/me`, `/auth/logout`

2. **API Auth** - Bearer tokens
   - Used by: API clients, tests
   - Validation: jose library (JWKS-based)

3. **MCP OAuth** - Dynamic Client Registration (DCR/CIMD)
   - Used by: ChatGPT, Claude.ai, Claude Code
   - Discovery: `/.well-known/oauth-protected-resource` (RFC 9728)
   - Challenge: `WWW-Authenticate` header on 401

### MCP Integration
- ✅ HTTP transport (POST/GET/DELETE `/mcp`)
- ✅ OAuth discovery metadata endpoint
- ✅ Tools: `health_check`, `test_auth`
- ✅ ChatGPT widget support (`text/html+skybridge`)
- ✅ Verified with Claude.ai and ChatGPT

### Testing
- Service tests (93): Fastify `inject()` with mocked dependencies
- Integration tests (37): Real HTTP, real WorkOS tokens
- Fixtures: Test user authentication, JWT generation, mock builders
- Quality gates: lint, typecheck, test

---

## Key Architectural Decisions

### Auth Design
- **Multi-issuer JWT validation** - Supports both User Management (`api.workos.com`) and AuthKit OAuth (`authkit.app`) tokens
- **Optional claims** - `email` and `sid` are optional (MCP OAuth tokens don't include custom claims)
- **Fastify → Convex pattern** - API key + userId (not JWT passthrough)
- **No WorkOS SDK validation** - Use jose library for full control

### MCP OAuth
- **WorkOS as OAuth provider** - Not implementing OAuth ourselves
- **DCR + CIMD enabled** - Supports both dynamic registration methods
- **AuthInfo passthrough** - Extract real values from JWT (clientId, scopes, expiresAt)
- **Dependency injection** - MCP transport injectable for testing

### Security
- **CORS** - Environment-aware (`CORS_ALLOWED_ORIGINS`)
- **Redirect validation** - URL parsing (prevents `//evil.com` attacks)
- **Constant-time API key comparison** - In Convex auth

---

## Critical Lessons Learned

### AuthKit OAuth ≠ User Management Tokens
- Web auth uses WorkOS User Management API
- MCP uses AuthKit OAuth2 endpoints (DCR/CIMD)
- **Different issuers, same JWKS**
- JWT validator must accept both issuers

### JWT Template Doesn't Apply to DCR
- Custom JWT claims only work for User Management tokens
- DCR tokens use standard claims only (`sub`, `aud`, `iss`, `exp`, `iat`)
- `email` claim missing from DCR tokens
- Make optional claims truly optional

### ChatGPT Widget Gotchas
- `window.openai.toolOutput` may be null on load
- **Must listen for `openai:set_globals` event**
- `_meta["openai/outputTemplate"]` goes in tool descriptor, not response
- `openai/widgetCSP` required for app submission
- Refresh connector to pick up metadata changes

### Test Infrastructure
- `bun test` vs `bun run test` - preload catches this
- Module-level singletons break mocking - use DI
- Service tests = `inject()` + mocked deps
- Integration tests = real HTTP + real tokens

---

## What's Next: Staging Deployment

### Part 2 Checklist

Refer to: `docs/M0-Checklist-ACTIVE.md` (Part 2)

**High-level steps:**
1. Convex cloud staging deployment
2. WorkOS staging environment (DCR/CIMD, redirect URIs)
3. Fly.io app creation and deployment
4. GitHub repo + CI/CD pipeline (Blacksmith)
5. External MCP testing (Claude.ai, ChatGPT with staging URLs)
6. Optional: Custom domain setup

### Environment Variables for Staging

All secrets go into Fly.io via `fly secrets set`:

```bash
# WorkOS
WORKOS_CLIENT_ID=client_xxx
WORKOS_API_KEY=sk_xxx
WORKOS_REDIRECT_URI=https://promptdb-staging.fly.dev/auth/callback
WORKOS_AUTH_SERVER_URL=https://your-subdomain.authkit.app

# Convex
CONVEX_URL=https://xxx.convex.cloud
CONVEX_API_KEY=xxx

# MCP
MCP_RESOURCE_URL=https://promptdb-staging.fly.dev/mcp
BASE_URL=https://promptdb-staging.fly.dev

# Security
COOKIE_SECRET=xxx  # Generate: openssl rand -base64 32
CORS_ALLOWED_ORIGINS=https://promptdb-staging.fly.dev

# Testing (for CI)
TEST_USER_EMAIL=test@promptdb.staging
TEST_USER_PASSWORD=xxx
```

---

## Known Issues / Tech Debt

### Low Priority (Not Blocking)
- RLS scaffolding empty (functional work, not M0)
- Lint warnings in investigation scripts (`as any` for private API testing)
- Non-null assertions where middleware guarantees values exist
- API

KeyConfig type duplicated (convex + src)

### Deferred Decisions
- Rate limiting for auth endpoints (needs traffic analysis first)
- Separate validators for cookie vs Bearer (current unified approach works)

---

## Files to Read

### Essential Context
1. **`docs/product-brief.md`** - Product vision, ChatGPT App Store context
2. **`docs/architecture.md`** - Full stack architecture, component decisions
3. **`docs/auth-architecture.md`** - Auth design rationale, security model, trade-offs
4. **`docs/auth-design.md`** - Implementation details, sequence diagrams, file structure
5. **`docs/M0-Checklist-ACTIVE.md`** - Checklist with Part 2 (staging) tasks

### Reference (As Needed)
- `docs/auth-tdd-tests.md` - Testing philosophy and patterns
- `docs/mcp-openai-auth-integration.md` - MCP OAuth design (assumptions now verified)
- `docs/reference/workos-mcp-auth-dcr.md` - DCR vs CIMD trade-offs
- `.env.example` - All required environment variables documented

---

## Repository Status

**Branch:** `main`
**Last Commit:** 4baf1de (Merge PR #1)
**Tests:** 130 pass (87 service, 43 integration - integration needs running server)
**Lint:** 48 warnings (investigation scripts, acceptable for dev)
**TypeCheck:** Clean

**GitHub:** https://github.com/praxen-ai/promptdb
**PR Reviews:** Coderabbit + Greptile configured (100 file limit)

---

## Manual Testing Performed

### Web Flow
- Login via WorkOS → Google OAuth → callback → cookie set ✅
- `/api/health` returns user + Convex authenticated ✅
- Logout clears cookie ✅

### MCP Integration (via ngrok)
- **Claude.ai connector:**
  - OAuth flow with WorkOS ✅
  - `health_check` tool returns authenticated user ✅
  - Convex connectivity confirmed ✅

- **ChatGPT app (developer mode):**
  - OAuth flow with WorkOS ✅
  - Tools visible (health_check, test_auth) ✅
  - Widget renders with styled card UI ✅
  - Full Convex integration working ✅

---

## Gotchas for Staging

1. **WorkOS environment** - Staging has separate client ID, API key, AuthKit subdomain
2. **DCR/CIMD** - Must be enabled in staging WorkOS dashboard
3. **Redirect URIs** - Update for staging domain in WorkOS
4. **ngrok not needed** - Staging has public URL
5. **CORS** - Must set `CORS_ALLOWED_ORIGINS` to staging domain
6. **Test user** - Create in staging WorkOS environment for CI tests

---

## Success Criteria for Staging

### Automated
- [ ] CI pipeline passes on push to main
- [ ] Convex deploys successfully
- [ ] Fly.io deploys successfully
- [ ] All tests pass in CI

### Manual
- [ ] `GET https://promptdb-staging.fly.dev/health` → OK
- [ ] Web login flow works with staging WorkOS
- [ ] `/api/health` returns authenticated Convex response
- [ ] Claude.ai connector works with staging URL
- [ ] ChatGPT app works with staging URL
- [ ] Widget renders in ChatGPT

---

## Working Principles (Carry Forward)

1. **Incremental implementation** - One piece at a time, test after each
2. **No test bypasses** - Fix code or test, never add environment conditionals
3. **Real tokens in tests** - Integration tests use `authenticateWithPassword()`
4. **Verify assumptions** - Research before implementing when uncertain
5. **TDD: Skeleton → Red → Green** - Not implementation-first
6. **Document as you go** - Update design docs when reality diverges

---

## Next Session Kickoff

**Recommended approach:**

1. Read the 5 essential docs above
2. Review M0-Checklist-ACTIVE Part 2
3. Start with Convex cloud deployment (simplest)
4. Then WorkOS staging config
5. Create Dockerfile + fly.toml
6. Test local Docker build before deploying
7. Work with human at each phase - no assumptions

**When things don't work as expected:** Stop and collaborate. Don't shim or work around. Understand the actual constraint and adjust design.

---

**Session completed:** 2025-12-24
**Ready for:** Staging deployment (Part 2)
**Template status:** Clean foundation for reuse across future projects
