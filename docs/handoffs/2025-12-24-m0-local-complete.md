# Handoff: M0 Local Complete → Staging Deployment

**Date:** 2025-12-24
**From:** Sonnet session (M0 local standup)
**To:** Next agent (staging deployment)
**Status:** Local environment fully validated, ready for staging

---

> **Usage:** This document is designed as a starting prompt for new agent sessions. Paste the "How to Work With This User" and "Product Context" sections at minimum. Include technical sections as needed for the specific task.

---

## Candidates for Permanent Config Files

Review these sections for extraction to project config files:

### → CLAUDE.md (User Preferences & Working Style)
These are stable principles for how to work with this user:
- **"How to Work With This User"** section (entire thing)
  - Verification Over Speculation
  - No Arbitrary Deferral
  - Working Style
  - Friction examples as anti-patterns
- **TDD approach**: Skeleton → Red → Green, never implementation-first
- **Quality gates**: lint, typecheck, test before commit

### → AGENT.md (Project Standards for Subagents)
These are stable project-specific standards:
- **Tech stack**: Bun, Fastify (port 5001), Convex, WorkOS AuthKit, MCP
- **Auth architecture**: 3 paths (Web/cookies, API/Bearer, MCP/OAuth)
- **Testing patterns**: Service tests (inject + mocks) vs Integration tests (real HTTP + tokens)
- **File structure**: src/routes/, src/middleware/, src/lib/auth/, convex/auth/
- **Dependency injection**: Required for testability (no module-level singletons)

### Not for Config Files (Transient)
These are session/phase specific and belong in handoffs or checklists:
- Current status, phase, commits
- Debugging lessons from specific sessions
- Known issues / tech debt lists
- Manual testing status
- Environment setup steps

---

## Role and Context

**Your Role:** DevOps planner and partner to the user. You will work closely together to fully stand up the staging environment.

**Immediate Goal:** Complete Part 2 of M0 (Staging Deployment) - deploy the validated local stack to Fly.io with Convex cloud and staging WorkOS environment.

**Project Summary:**
- **PromptDB** - Prompt management and knowledge worker tool providing MCP access across AI chat surfaces (ChatGPT, Claude.ai, Claude Code)
- **Current Phase:** M0 - Stack Architecture Standup (production hello world with full auth before any product features)
- **What's Done:** Local environment fully validated - Bun/Fastify server, Convex local backend, WorkOS auth (3 paths), MCP with ChatGPT widgets, 130 tests passing
- **What's Next:** Staging deployment (Fly.io, Convex cloud, WorkOS staging, CI/CD)

**Key Files to Reference:**
- `docs/M0-Checklist-ACTIVE.md` - Part 2 has staging deployment steps
- `docs/architecture.md` - Full stack architecture
- `docs/auth-architecture.md` - Auth design and security model
- `.env.example` - Required environment variables

---

## How to Work With This User

**Read this section carefully. It defines working expectations.**

### Verification Over Speculation
- If you don't know something but it's easily verifiable (reading a file, checking types, running a command), **verify it first** before responding
- Saying "probably" or "maybe" about verifiable things causes friction - it creates unnecessary assumptions or discussion churn for something that takes seconds to confirm
- Say "I don't know" only when you genuinely can't verify, then research it

### No Arbitrary Deferral
- Don't bucket work into "critical / high / later" by default - this is a low-entropy pattern that creates unnecessary tracking overhead
- If something is small and easy (1-2 minutes), just do it now rather than adding it to a list
- Defer only when there's a real constraint (dependency, missing info, explicit user decision needed)
- Tech debt during standup phase = compounding interest on everything that follows

### Working Style
- **Work incrementally** - One piece at a time, check in frequently
- **Ask permission before making changes** - Especially for auth code or architectural decisions
- **Present options** - Give choices, don't assume decisions
- **Be direct** - Clear yes/no answers, acknowledge mistakes without excessive apology
- **Follow TDD strictly** - Skeleton → Red → Green, never implementation-first
- **Track progress** - Use TodoWrite for multi-step work

### What Caused Friction in Previous Session
- Agent repeatedly started coding without approval
- Agent guessed about things instead of verifying
- Agent defaulted to "later" bucket without real justification
- Agent used placeholders instead of correct values ("we'll fix it later")
- Agent built custom OAuth infrastructure without first checking if SDK provided it

### Key Quote
*"I have a bit of an allergy to autopilot"* - The user expects calibrated, intentional decisions, not pattern-matching defaults.

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

### Local Testing Requirements
- **ngrok required** for MCP testing with Claude.ai/ChatGPT (they need public URL)
- Start with: `ngrok http 5001`
- Use the ngrok URL for connector/app setup in Claude.ai and ChatGPT

### Testing
- 130 tests total passing
- Service tests: Fastify `inject()` with mocked dependencies
- Integration tests: Real HTTP, real WorkOS tokens (requires running server)
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

**This caused hours of debugging.** Understanding this will save you pain in staging.

The issue: After DCR tokens were issued, all requests returned 401. Debugging steps that led to the fix:

1. Added logging to JWT validator → discovered "unexpected iss claim value"
2. Web auth tokens have issuer: `https://api.workos.com/user_management/${clientId}`
3. DCR/MCP tokens have issuer: `https://${subdomain}.authkit.app`
4. **Different issuers, same JWKS keys** (fortunate - signature validation still worked)
5. Fix: Add AuthKit issuer URL to allowed issuers list in `jwtValidator.ts`

**For staging:** The AuthKit subdomain will be different. You MUST:
- Get the staging AuthKit subdomain from WorkOS dashboard
- Set `WORKOS_AUTH_SERVER_URL` to the staging authkit.app URL
- The JWT validator uses this env var for issuer validation

### JWT Template Doesn't Apply to DCR
- Custom JWT claims only work for User Management tokens
- DCR tokens use standard claims only (`sub`, `aud`, `iss`, `exp`, `iat`)
- `email` claim missing from DCR tokens - this caused more 401s until we made it optional
- Make optional claims truly optional in type definitions

### ChatGPT Widget Gotchas

Widget took significant debugging to get working. Key discoveries:

1. **Data hydration is async** - `window.openai.toolOutput` is null when widget loads
   - Must listen for `openai:set_globals` event
   - Render "Loading..." state first, then re-render on event

2. **Metadata placement matters**
   - `_meta["openai/outputTemplate"]` must be in **tool descriptor** (when registering the tool)
   - Not just in the response - ChatGPT reads it from tools/list, not from tool responses

3. **ChatGPT caches tool definitions**
   - After adding `_meta` to tool descriptor, must **refresh the connector** in ChatGPT settings
   - Otherwise ChatGPT uses stale tool definitions without the output template

4. **registerTool callback signature changes**
   - When tool has no `inputSchema`, callback receives `(extra)` not `(args, extra)`
   - This caused "undefined is not an object" errors in tool handlers

5. **CSP required for submission**
   - `openai/widgetCSP` must be set on resource (even with empty arrays for inlined content)
   - Widget renders without it in dev mode, but app submission will fail

6. **Widget resource must be discoverable**
   - Registered via `registerResource()` with `mimeType: "text/html+skybridge"`
   - ChatGPT fetches via `resources/read` when tool with output template is called

### Test Infrastructure
- `bun test` vs `bun run test` - preload catches this (wasted significant debugging time twice)
- Module-level singletons break mocking - use DI
- Service tests = `inject()` + mocked deps
- Integration tests = real HTTP + real tokens

### SDK Usage Pitfall

Early in the session, the agent built custom OAuth infrastructure (metadata endpoint, WWW-Authenticate headers, requestContext module) **without first checking if the MCP SDK provided it**. The SDK did provide it. All that custom code was thrown away.

**Lesson:** When integrating with an SDK, thoroughly review what it provides before building custom solutions. Check the SDK source code if needed.

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
- ApiKeyConfig type duplicated (convex + src)

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
**Tests:** 130 pass (integration tests need running server)
**Lint:** 48 warnings (mostly in investigation scripts - needs decision on how to handle)
**TypeCheck:** Clean

**GitHub:** https://github.com/praxen-ai/promptdb
**PR Reviews:** Coderabbit + Greptile configured (100 file limit)

---

## Manual Testing Performed

### Web Flow (Worked First Try)
- Login via WorkOS → Google OAuth → callback → cookie set ✅
- `/api/health` returns user + Convex authenticated ✅
- Logout clears cookie ✅

### Claude.ai Connector (Worked After JWT Fix)
- Initial connection: 401 failures (issuer mismatch)
- After adding AuthKit issuer to validator: worked ✅
- `health_check` tool returns authenticated user ✅
- Convex connectivity confirmed ✅

### ChatGPT App (Required Significant Debugging)
Required multiple iterations to get fully working:
1. Initial connection: 401 (same issuer issue as Claude.ai)
2. After issuer fix: tools worked, widget didn't render
3. Added `_meta` to tool descriptor: still no widget (ChatGPT had cached old tool definitions)
4. Refreshed connector in ChatGPT settings: widget attempted to load but blank
5. Added `openai:set_globals` event listener: widget renders ✅
6. Added CSP configuration for completeness

Final state:
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

---

## Full Conversation History

For complete context including all debugging sessions, user feedback, and decision rationale:

**File:** `.agent-threads/extended-arch-standup.txt` (7.3k lines)

This shows:
- The actual debugging process for each issue
- Where the agent made mistakes and was corrected
- User expectations communicated through the session
- Trade-off discussions and decisions

The conversation itself is the most complete record of what happened and why.
