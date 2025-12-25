# M0 Checklist: Production Hello World

**Project:** PromptDB
**Stack:** Bun + Fastify + Convex + WorkOS + MCP + Fly.io
**Goal:** Full stack wired, deployed to staging, zero product functionality

---

## How to Use This Document

Each section contains:
- **Context** - what this group accomplishes, inline reference
- **Links** - architecture sections, local reference docs, external docs
- **Steps** - tagged `[MODEL]` or `[HUMAN]`

Check items as completed. Already-done items are pre-checked.

---

# Part 1: Local Environment

## 1.1 Project Foundation

Initialize the repository and establish base configuration.

**Architecture Reference:** [Section 4.1 - Runtime & Package Management](./architecture.md#41-runtime--package-management)

**Reference Docs:**
- [Bun Installation](./reference/bun-installation.md) | [External](https://bun.sh/docs/installation)
- [Bun Package Management](./reference/bun-install.md) | [External](https://bun.sh/docs/cli/install)

### Steps

- [x] `[MODEL]` Initialize git repository
- [x] `[MODEL]` Create `docs/` directory structure
- [x] `[MODEL]` Create product brief (`docs/product-brief.md`)
- [x] `[MODEL]` Create architecture document (`docs/architecture.md`)
- [x] `[MODEL]` Run `bun init` - accept defaults, creates `package.json`, `tsconfig.json`
- [x] `[MODEL]` Create `.gitignore` (node_modules, .env*, dist, .convex)
- [x] `[MODEL]` Create `README.md` with project name and one-line description
- [x] `[MODEL]` Create `CLAUDE.md` with context cleaning utility (quick-clean script)

---

## 1.2 Code Quality Tooling

Set up TypeScript strict mode and Biome for linting/formatting.

**Architecture Reference:** [Section 4.8 - Code Quality](./architecture.md#48-code-quality)

**Reference Docs:**
- [Biome Getting Started](./reference/biome-getting-started.md) | [External](https://biomejs.dev/guides/getting-started/)
- [TypeScript tsconfig](https://www.typescriptlang.org/tsconfig) _(external only)_

### Steps

- [x] `[MODEL]` Install dev dependencies: `bun add -d typescript @types/bun @biomejs/biome`
- [x] `[MODEL]` Configure `tsconfig.json` - strict mode, appropriate target/module settings
- [x] `[MODEL]` Create `biome.json` with linting and formatting rules
- [x] `[MODEL]` Add npm scripts: `lint`, `format`, `typecheck`
- [x] `[MODEL]` Create `bunfig.toml` with test preload (catches `bun test` vs `bun run test`)
- [x] `[MODEL]` Verify: `bun run lint` and `bun run typecheck` pass on empty project

---

## 1.3 Fastify Server

Stand up the base HTTP server with health endpoints (no auth).

**Architecture Reference:** [Section 4.2 - API Framework](./architecture.md#42-api-framework), [Section 7 - Project Structure](./architecture.md#7-project-structure)

**Reference Docs:**
- [Fastify Getting Started](./reference/fastify-getting-started.md) | [External](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/) _(external only)_

### Steps

- [x] `[MODEL]` Install Fastify: `bun add fastify`
- [x] `[MODEL]` Create `src/index.ts` - Fastify server entry point (port 5001)
- [x] `[MODEL]` Create `src/routes/health.ts` - GET `/health` returning `{ status: "ok", timestamp }`
- [x] `[MODEL]` Register health route in server
- [x] `[MODEL]` Add npm script: `dev` (runs server with watch mode)
- [x] `[MODEL]` Verify: `bun run dev`, hit `http://localhost:5001/health`, get JSON response

---

## 1.4 Convex Local Setup

Initialize Convex with local development backend and health queries (no auth yet).

**Architecture Reference:** [Section 4.4 - Data Layer](./architecture.md#44-data-layer), [Section 3.3 - Why This Architecture](./architecture.md#33-why-this-architecture)

**Reference Docs:**
- [Convex Quickstart](./reference/convex-quickstart.md) | [External](https://docs.convex.dev/quickstart)
- [Convex CLI](./reference/convex-cli.md) | [External](https://docs.convex.dev/cli)
- [Convex Local Deployments](./reference/convex-local-deployments.md) | [External](https://docs.convex.dev/cli/local-deployments)
- [Convex Schema](./reference/convex-schema.md) | [External](https://docs.convex.dev/database/schemas)

**Note:** Local deployments run entirely on your machine - no cloud account needed for Part 1. Cloud project created in Part 2 for staging.

### Steps

- [x] `[MODEL]` Install Convex: `bun add convex`
- [x] `[MODEL]` Run `npx convex dev --local --once` - initializes local backend (no cloud account required)
- [x] `[MODEL]` Create `convex/schema.ts` - empty schema (just the import, no tables yet)
- [x] `[MODEL]` Create `convex/health.ts` - query returning `{ status: "ok" }` (no auth)
- [x] `[MODEL]` Create `src/lib/convex.ts` - Convex client initialization
- [x] `[MODEL]` Update `/health` endpoint to call `convex/health` query
- [x] `[MODEL]` Add npm script: `convex:dev` for `npx convex dev --local`
- [x] `[MODEL]` Verify: Start `bun run convex:dev`, then `GET /health` returns `{ status: "ok", convex: "connected" }`

---

## 1.5 WorkOS Auth (Local)

Configure WorkOS authentication and create auth-required health endpoints to verify end-to-end auth flow.

**Architecture Reference:** [Section 5 - Authentication Architecture](./architecture.md#5-authentication-architecture), [Section 5.2 - Auth Environments](./architecture.md#52-auth-environments)

**Reference Docs:**
- [WorkOS AuthKit Overview](https://workos.com/docs/user-management) _(external only)_
- [WorkOS Node SDK](https://workos.com/docs/reference/node) _(external only)_

### Environment Variables

```bash
WORKOS_CLIENT_ID=client_xxx
WORKOS_API_KEY=sk_xxx
WORKOS_REDIRECT_URI=http://localhost:5001/auth/callback
WORKOS_AUTH_SERVER_URL=https://your-subdomain.authkit.app
COOKIE_SECRET=xxx
CONVEX_API_KEY=xxx  # For Fastify → Convex authenticated calls
```

### Steps

- [x] `[MODEL]` Install WorkOS packages: `bun add @workos-inc/node @fastify/cookie jose`
- [x] `[HUMAN]` Configure WorkOS Local environment:
  - Set redirect URI: `http://localhost:5001/auth/callback`
  - Set CORS origin: `http://localhost:5001`
- [x] `[MODEL]` Create `.env.local` with WorkOS credentials (template, no real values)
- [x] `[MODEL]` Create `.env.example` documenting all required variables
- [x] `[HUMAN]` Populate `.env.local` with actual WorkOS Local credentials
- [x] `[MODEL]` Create `src/lib/workos.ts` - WorkOS client initialization
- [x] `[MODEL]` Create `src/lib/auth/jwtValidator.ts` - JWT validation using jose (multi-issuer support)
- [x] `[MODEL]` Create `src/lib/auth/jwtDecoder.ts` - JWT claims extraction
- [x] `[MODEL]` Create `src/middleware/auth.ts` - Auth middleware (cookies + Bearer tokens)
- [x] `[MODEL]` Create `src/routes/auth.ts` - routes: `/auth/login`, `/auth/callback`, `/auth/logout`, `/auth/me`
- [x] `[MODEL]` Create `convex/auth/apiKey.ts` - API key validation for Fastify calls
- [x] `[MODEL]` Create `convex/healthAuth.ts` - query with API key + userId pattern
- [x] `[MODEL]` Register auth routes and middleware in server
- [x] `[MODEL]` Update health endpoint - add GET `/api/health` (auth required) that calls `convex/healthAuth`
- [x] `[MODEL]` Verify: Full auth flow - login → callback → cookie set → `GET /api/health` returns user + Convex status

---

## 1.6 MCP Integration

Set up MCP endpoint with auth-required health check tool and OAuth discovery for external clients.

**Architecture Reference:** [Section 6 - MCP Architecture](./architecture.md#6-mcp-architecture)

**Reference Docs:**
- [MCP SDK](./reference/mcp-sdk.md) | [External](https://modelcontextprotocol.io/docs/sdk)
- [RFC 9728 - OAuth Protected Resource Metadata](https://datatracker.ietf.org/doc/html/rfc9728)
- [WorkOS MCP Auth](./reference/workos-mcp-auth-dcr.md)

### MCP OAuth Discovery

MCP clients (Claude.ai, ChatGPT, Claude Code) need OAuth discovery to authenticate:

1. Client hits `/mcp` → gets 401 with `WWW-Authenticate` header
2. Header points to `/.well-known/oauth-protected-resource`
3. Client reads metadata, discovers WorkOS as authorization server
4. Client does OAuth flow via WorkOS (DCR or CIMD)
5. Client sends Bearer token on subsequent requests

### Environment Variables (MCP-specific)

```bash
MCP_RESOURCE_URL=http://localhost:5001/mcp
BASE_URL=http://localhost:5001
```

### Steps

- [x] `[MODEL]` Install MCP SDK: `bun add @modelcontextprotocol/sdk`
- [x] `[MODEL]` Create `src/lib/mcp.ts` - MCP server with `health_check` and `test_auth` tools
- [x] `[MODEL]` Create `src/api/mcp.ts` - POST/GET/DELETE `/mcp` endpoint with transport
- [x] `[MODEL]` Use dependency injection for transport (testability)
- [x] `[MODEL]` Create `src/routes/well-known.ts` - `/.well-known/oauth-protected-resource` endpoint
- [x] `[MODEL]` Add `WWW-Authenticate` header to MCP 401 responses
- [x] `[MODEL]` Apply auth middleware to `/mcp` endpoint
- [x] `[MODEL]` Build `AuthInfo` from validated JWT (clientId, scopes, expiresAt extracted)
- [x] `[MODEL]` Pass `authInfo` to `handleRequest()` for tool handlers
- [x] `[MODEL]` Add `/mcp/tools` debug endpoint with Convex auth verification
- [x] `[MODEL]` Verify: GET `/mcp/tools` returns tools list + convex authenticated

---

## 1.7 Static File Serving

Configure widget/frontend static file serving.

**Architecture Reference:** [Section 4.6 - Frontend](./architecture.md#46-frontend), [Section 7.1 - Layer Organization](./architecture.md#71-layer-organization)

**Reference Docs:**
- [@fastify/static](./reference/fastify-static.md) | [External](https://github.com/fastify/fastify-static)
- [@fastify/cors](./reference/fastify-cors.md) | [External](https://github.com/fastify/fastify-cors)

### Environment Variables (CORS)

```bash
CORS_ALLOWED_ORIGINS=http://localhost:5001  # Comma-separated for multiple
```

### Steps

- [x] `[MODEL]` Install static/CORS packages: `bun add @fastify/static @fastify/cors`
- [x] `[MODEL]` Create `public/` directory
- [x] `[MODEL]` Create `public/index.html` - landing page with auth-aware UI
- [x] `[MODEL]` Register static file plugin serving from `public/`
- [x] `[MODEL]` Configure CORS with environment-aware origins
- [x] `[MODEL]` Verify: `http://localhost:5001/` serves the HTML page

---

## 1.8 Testing Foundation

Establish testing structure with service and integration tests.

**Architecture Reference:** [Section 11 - Testing Strategy](./architecture.md#11-testing-strategy)

**Reference Docs:**
- [Bun Test](./reference/bun-test.md) | [External](https://bun.sh/docs/cli/test)
- [WorkOS Get User](https://workos.com/docs/reference/user-management/user/get) _(external only)_

**Test Users Required:**
- **Local testing:** User in WorkOS Local environment for automated integration tests
- **Staging testing:** User in WorkOS Staging environment for CI integration tests
- **Manual validation:** Your personal user in WorkOS Staging for manual QA

### Environment Variables (Testing)

```bash
TEST_USER_EMAIL=test@promptdb.local
TEST_USER_PASSWORD=xxx
```

### Steps

- [x] `[HUMAN]` Create test user in WorkOS Local environment (for local integration tests)
- [x] `[MODEL]` Create `tests/` directory structure: `tests/service/`, `tests/integration/`, `tests/fixtures/`
- [x] `[MODEL]` Create `tests/fixtures/auth.ts` - auth fixture utility (authenticateWithPassword)
- [x] `[MODEL]` Create `tests/preload.ts` - catches `bun test` vs `bun run test` mistake
- [x] `[MODEL]` Create service tests with mocked dependencies (Fastify inject)
- [x] `[MODEL]` Create integration tests with real HTTP and real tokens
- [x] `[MODEL]` Add npm scripts: `test`, `test:service`, `test:integration`
- [x] `[MODEL]` Verify: `bun run test` passes all tests

---

## 1.9 External Integration Testing

Test MCP OAuth with external clients (Claude.ai, ChatGPT).

**Reference Docs:**
- [OpenAI Apps SDK](./reference/openai-apps-sdk-auth.md)
- [OpenAI Apps SDK Deploy](./reference/openai-apps-sdk-deploy-connect.md)

### Prerequisites

- ngrok installed and authenticated
- WorkOS DCR/CIMD enabled
- Fastify and Convex running locally

### WorkOS Configuration

- [x] `[HUMAN]` Enable DCR (Dynamic Client Registration) in WorkOS dashboard
- [x] `[HUMAN]` Enable CIMD (Client ID Metadata Document) in WorkOS dashboard
- [x] `[HUMAN]` Note: Find these under Connect → Configuration in WorkOS dashboard

### ngrok Setup

- [x] `[HUMAN]` Install ngrok: `brew install ngrok`
- [x] `[HUMAN]` Sign up at https://ngrok.com (free tier works)
- [x] `[HUMAN]` Configure auth token: `ngrok config add-authtoken YOUR_TOKEN`
- [x] `[HUMAN]` Run tunnel: `ngrok http 5001`
- [x] `[HUMAN]` Update `.env.local` with ngrok URLs:
  ```bash
  BASE_URL=https://xxx.ngrok-free.app
  MCP_RESOURCE_URL=https://xxx.ngrok-free.app/mcp
  ```
- [x] `[HUMAN]` Add ngrok callback to WorkOS redirects: `https://xxx.ngrok-free.app/auth/callback`
- [x] `[HUMAN]` Restart Fastify to pick up new env vars

### Claude.ai Testing

- [x] `[HUMAN]` Go to Claude.ai → Settings → Connectors → Add custom connector
- [x] `[HUMAN]` Enter name: "PromptDB"
- [x] `[HUMAN]` Enter URL: `https://xxx.ngrok-free.app/mcp`
- [x] `[HUMAN]` Click Connect → Complete OAuth via WorkOS
- [x] `[HUMAN]` Verify: Enable connector in chat, ask "run health check"
- [x] `[HUMAN]` Verify: Tool returns authenticated user and Convex status

### ChatGPT Testing

- [x] `[HUMAN]` Enable developer mode: Settings → Apps & Connectors → Advanced settings → Developer mode
- [x] `[HUMAN]` Create app: Settings → Apps → Create
- [x] `[HUMAN]` Enter name: "PromptDB", URL: `https://xxx.ngrok-free.app/mcp`
- [x] `[HUMAN]` Click Connect → Complete OAuth via WorkOS
- [x] `[HUMAN]` Verify: Tools visible in app config (health_check, test_auth)
- [x] `[HUMAN]` Verify: In chat, select PromptDB, ask "run health check"

### ChatGPT Widget (Optional)

- [x] `[MODEL]` Create widget HTML with `openai:set_globals` event listener
- [x] `[MODEL]` Register widget as MCP resource with `mimeType: text/html+skybridge`
- [x] `[MODEL]` Add `_meta["openai/outputTemplate"]` to tool descriptor
- [x] `[MODEL]` Add `openai/widgetCSP` to resource (required for app submission)
- [x] `[HUMAN]` Refresh app in ChatGPT to pick up widget template
- [x] `[HUMAN]` Verify: Running health_check renders styled widget UI

---

# Part 2: Staging Environment

## 2.1 Convex Cloud Staging

Deploy Convex to cloud staging environment.

**Architecture Reference:** [Section 4.4 - Data Layer](./architecture.md#44-data-layer)

**Reference Docs:**
- [Convex Hosting](https://docs.convex.dev/production/hosting) _(external only)_

### Steps

- [ ] `[HUMAN]` Create staging deployment in Convex dashboard (or use existing from `convex dev` setup)
- [ ] `[MODEL]` Create `.env.staging` with Convex staging URL
- [ ] `[HUMAN]` Get `CONVEX_DEPLOY_KEY` from Convex dashboard for staging
- [ ] `[MODEL]` Run `npx convex deploy` to push schema and functions to staging
- [ ] `[MODEL]` Verify: Convex dashboard shows deployed functions

---

## 2.2 WorkOS Staging

Configure WorkOS staging environment for deployed app.

**Architecture Reference:** [Section 5.2 - Auth Environments](./architecture.md#52-auth-environments)

**Reference Docs:**
- [WorkOS Environments](https://workos.com/docs/user-management/environments) _(external only)_

### Steps

- [ ] `[HUMAN]` Configure WorkOS Staging environment:
  - Set redirect URI: `https://promptdb-staging.fly.dev/auth/callback`
  - Set CORS origin: `https://promptdb-staging.fly.dev`
  - Enable DCR and CIMD (Connect → Configuration)
- [ ] `[HUMAN]` Create test user in WorkOS Staging environment (for CI integration tests)
- [ ] `[HUMAN]` Create/verify your personal user in WorkOS Staging (for manual validation)
- [ ] `[MODEL]` Create `.env.staging` additions with WorkOS staging credentials template
- [ ] `[HUMAN]` Populate WorkOS staging credentials including:
  - `WORKOS_AUTH_SERVER_URL` (staging AuthKit subdomain)
  - `CORS_ALLOWED_ORIGINS` (staging domain)
- [ ] `[MODEL]` Update `tests/fixtures/auth.ts` to support staging environment token generation

---

## 2.3 Fly.io Setup

Create and configure Fly.io application for staging deployment.

**Architecture Reference:** [Section 4.7 - Infrastructure & Deployment](./architecture.md#47-infrastructure--deployment)

**Reference Docs:**
- [Fly.io Getting Started](./reference/flyio-getting-started.md) | [External](https://fly.io/docs/getting-started/)
- [Fly.io Secrets](./reference/flyio-secrets.md) | [External](https://fly.io/docs/reference/secrets/)

### Steps

- [ ] `[HUMAN]` Install Fly CLI if not present: `brew install flyctl`
- [ ] `[HUMAN]` Authenticate: `fly auth login`
- [ ] `[HUMAN]` Create app: `fly apps create promptdb-staging`
- [ ] `[MODEL]` Create `Dockerfile` using `oven/bun:1` base image
- [ ] `[MODEL]` Create `fly.toml` configuration
- [ ] `[HUMAN]` Set secrets via `fly secrets set`:
  - `WORKOS_CLIENT_ID`
  - `WORKOS_API_KEY`
  - `WORKOS_REDIRECT_URI`
  - `WORKOS_AUTH_SERVER_URL`
  - `COOKIE_SECRET` (generate with `openssl rand -base64 32`)
  - `CONVEX_URL`
  - `CONVEX_API_KEY`
  - `MCP_RESOURCE_URL`
  - `BASE_URL`
  - `CORS_ALLOWED_ORIGINS`
- [ ] `[MODEL]` Test local Docker build: `docker build -t promptdb .`
- [ ] `[HUMAN]` Deploy manually first time: `fly deploy`
- [ ] `[MODEL]` Verify: `https://promptdb-staging.fly.dev/health` returns OK

---

## 2.4 GitHub Repository

Create repository and push codebase.

**Reference Docs:**
- [GitHub Creating Repos](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository) _(external only)_

### Steps

- [ ] `[HUMAN]` Create repository `praxen-ai/promptdb` on GitHub (private)
- [ ] `[MODEL]` Add remote: `git remote add origin git@github.com:praxen-ai/promptdb.git`
- [ ] `[MODEL]` Push codebase: `git push -u origin main`
- [ ] `[MODEL]` Verify: Repository visible on GitHub with all code

---

## 2.5 CI/CD Pipeline

Configure automated deployment pipeline.

**Architecture Reference:** [Section 12 - CI/CD Pipeline](./architecture.md#12-cicd-pipeline)

**Reference Docs:**
- [Blacksmith Overview](./reference/blacksmith-overview.md) | [External](https://docs.blacksmith.sh/)
- [GitHub Actions Secrets](./reference/github-actions-secrets.md) | [External](https://docs.github.com/en/actions/security-guides/encrypted-secrets)

### Steps

- [ ] `[HUMAN]` Connect GitHub repo to Blacksmith
- [ ] `[MODEL]` Create `.github/workflows/deploy.yml`:
  - Trigger on push to `main`
  - Quality gates: install, lint, typecheck, test
  - Deploy Convex
  - Deploy Fly.io
- [ ] `[HUMAN]` Add repository secrets:
  - `FLY_API_TOKEN` (from `fly tokens create deploy`)
  - `CONVEX_DEPLOY_KEY`
  - Test user credentials for CI integration tests
- [ ] `[MODEL]` Push to main, verify pipeline runs
- [ ] `[MODEL]` Verify: Successful deployment, staging health check passes

---

## 2.6 Staging MCP Testing

Verify MCP OAuth works in staging environment.

### Steps

- [ ] `[HUMAN]` Update Claude.ai connector to staging URL
- [ ] `[HUMAN]` Verify: OAuth flow works with staging WorkOS
- [ ] `[HUMAN]` Verify: health_check returns staging Convex status
- [ ] `[HUMAN]` Update ChatGPT app to staging URL
- [ ] `[HUMAN]` Verify: OAuth and tools work in staging

---

## 2.7 Custom Domain (Optional)

Configure custom domain for staging environment.

**Architecture Reference:** [Section 4.7 - Infrastructure & Deployment](./architecture.md#47-infrastructure--deployment)

**Reference Docs:**
- [Fly.io Custom Domains](https://fly.io/docs/networking/custom-domain/) _(external only)_

### Steps

- [ ] `[HUMAN]` Add DNS record: `staging.promptdb.praxen.ai CNAME promptdb-staging.fly.dev`
- [ ] `[HUMAN]` Configure custom domain in Fly.io: `fly certs create staging.promptdb.praxen.ai`
- [ ] `[HUMAN]` Wait for SSL certificate provisioning
- [ ] `[HUMAN]` Update WorkOS staging redirect URI to use custom domain
- [ ] `[HUMAN]` Update `BASE_URL`, `MCP_RESOURCE_URL`, `CORS_ALLOWED_ORIGINS` secrets
- [ ] `[MODEL]` Verify: `https://staging.promptdb.praxen.ai/health` returns OK

---

# Done Checklists

## Local Environment Done

All of the following must pass before local is considered complete:

### Automated Verification

- [x] `bun run lint` - passes with no errors
- [x] `bun run typecheck` - passes with no errors
- [x] `bun run test` - all 130 tests pass

### Manual Verification

**Layered validation (proves arch step-by-step):**

- [x] **Step 1 - Fastify alive**: `GET /health` returns `{ status: "ok", timestamp }`
- [x] **Step 2 - Convex connected**: `GET /health` includes `{ convex: "connected" }`
- [x] **Step 3 - Auth flow**: Complete login → callback → cookie set
- [x] **Step 4 - Auth + Convex**: `GET /api/health` (with cookie) returns `{ status: "ok", user: {...}, convex: "authenticated" }`
- [x] **Step 5 - MCP protocol**: POST `/mcp` with `tools/list` returns tool list including `health_check`
- [x] **Step 6 - MCP + Auth + Convex**: Call `health_check` tool via MCP, returns user info from Convex
- [x] **Step 7 - Static files**: `GET /` serves HTML page
- [x] **Step 8 - OAuth discovery**: `GET /.well-known/oauth-protected-resource` returns metadata
- [x] **Step 9 - Claude.ai**: MCP connector works with OAuth flow
- [x] **Step 10 - ChatGPT**: MCP app works with OAuth flow + widget renders

### Expected State

- Fastify server running on port 5001
- Convex local backend running (`npx convex dev --local`)
- WorkOS Local environment configured with DCR/CIMD enabled
- All tests passing (130 tests)
- Full stack verified:
  - `/health` - Fastify + Convex (no auth)
  - `/api/health` - Fastify + Auth + Convex (auth required)
  - `/mcp` - MCP protocol + Auth + Convex (auth required)
  - `/.well-known/oauth-protected-resource` - OAuth discovery

---

## Staging Environment Done

All of the following must pass before staging is considered complete:

### Automated Verification

- [ ] CI pipeline passes on push to main
- [ ] Convex deploy succeeds
- [ ] Fly.io deploy succeeds

### Manual Verification

- [ ] Health endpoint: `GET https://promptdb-staging.fly.dev/health` returns OK
- [ ] Convex connected: Health response confirms cloud Convex connectivity
- [ ] Auth flow: Full login flow works with staging WorkOS environment
- [ ] MCP endpoint: POST to `/mcp` endpoint returns tool list
- [ ] OAuth discovery: `GET /.well-known/oauth-protected-resource` returns metadata
- [ ] Claude.ai: Connector works with staging URL
- [ ] ChatGPT: App works with staging URL

### Expected State

- Application deployed to Fly.io staging
- Convex deployed to cloud staging
- WorkOS staging environment configured with DCR/CIMD
- CI/CD pipeline triggers on merge to main
- All health checks passing
- MCP OAuth works with external clients

---

# Post-M0 Notes

## Lessons Learned

### AuthKit OAuth Tokens ≠ User Management Tokens
- Web auth uses WorkOS User Management API (`authenticateWithCode`)
- MCP OAuth uses AuthKit OAuth2 endpoints (DCR/CIMD)
- Different issuers: `api.workos.com` vs `your-subdomain.authkit.app`
- Both use same JWKS (fortunately) but validator must accept both issuers

### JWT Template Doesn't Apply to DCR Tokens
- WorkOS JWT template only affects User Management tokens
- DCR tokens don't include custom claims (e.g., email missing)
- Solution: Make claims like `email` and `sid` optional in decoder
- Use `sub` (user ID) as primary identifier

### ChatGPT Widget Gotchas
- `window.openai.toolOutput` may be null on initial load
- Must listen for `openai:set_globals` event for async data arrival
- `_meta["openai/outputTemplate"]` must be in tool descriptor (not just response)
- `openai/widgetCSP` required for app submission (empty arrays if fully inlined)
- Refresh connector in ChatGPT to pick up tool metadata changes

### Test Infrastructure
- `bun test` vs `bun run test`: preload script catches this
- Module-level singletons break test mocking: use dependency injection
- Service tests use Fastify `inject()` with mocked deps
- Integration tests use real HTTP and real tokens

### Security Config
- CORS: `origin: true` is unsafe for production, use allowlist via `CORS_ALLOWED_ORIGINS`
- Redirect validation: Parse URL, don't just string check (prevent `//example.com` attacks)

---

**Checklist Version:** 0.2
**Updated:** 2025-12-24
**Status:** Local complete, staging pending
