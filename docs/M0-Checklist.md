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
- [ ] `[MODEL]` Run `bun init` - accept defaults, creates `package.json`, `tsconfig.json`
- [ ] `[MODEL]` Create `.gitignore` (node_modules, .env*, dist, .convex)
- [ ] `[MODEL]` Create `README.md` with project name and one-line description

---

## 1.2 Code Quality Tooling

Set up TypeScript strict mode and Biome for linting/formatting.

**Architecture Reference:** [Section 4.8 - Code Quality](./architecture.md#48-code-quality)

**Reference Docs:**
- [Biome Getting Started](./reference/biome-getting-started.md) | [External](https://biomejs.dev/guides/getting-started/)
- [TypeScript tsconfig](https://www.typescriptlang.org/tsconfig) _(external only)_

### Steps

- [ ] `[MODEL]` Install dev dependencies: `bun add -d typescript @types/bun @biomejs/biome`
- [ ] `[MODEL]` Configure `tsconfig.json` - strict mode, appropriate target/module settings
- [ ] `[MODEL]` Create `biome.json` with linting and formatting rules
- [ ] `[MODEL]` Add npm scripts: `lint`, `format`, `typecheck`
- [ ] `[MODEL]` Verify: `bun run lint` and `bun run typecheck` pass on empty project

---

## 1.3 Fastify Server

Stand up the base HTTP server with health endpoints (no auth).

**Architecture Reference:** [Section 4.2 - API Framework](./architecture.md#42-api-framework), [Section 7 - Project Structure](./architecture.md#7-project-structure)

**Reference Docs:**
- [Fastify Getting Started](./reference/fastify-getting-started.md) | [External](https://fastify.dev/docs/latest/Guides/Getting-Started/)
- [Fastify TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/) _(external only)_

### Steps

- [ ] `[MODEL]` Install Fastify: `bun add fastify`
- [ ] `[MODEL]` Create `src/index.ts` - Fastify server entry point
- [ ] `[MODEL]` Create `src/api/health.ts` - GET `/health` returning `{ status: "ok", timestamp }`
- [ ] `[MODEL]` Register health route in server
- [ ] `[MODEL]` Add npm script: `dev` (runs server with watch mode)
- [ ] `[MODEL]` Verify: `bun run dev`, hit `http://localhost:3000/health`, get JSON response

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

- [ ] `[MODEL]` Install Convex: `bun add convex`
- [ ] `[MODEL]` Run `npx convex dev --local --once` - initializes local backend (no cloud account required)
- [ ] `[MODEL]` Create `convex/schema.ts` - empty schema (just the import, no tables yet)
- [ ] `[MODEL]` Create `convex/health.ts` - query returning `{ status: "ok" }` (no auth)
- [ ] `[MODEL]` Create `src/lib/convex.ts` - Convex client initialization
- [ ] `[MODEL]` Update `/health` endpoint to call `convex/health` query
- [ ] `[MODEL]` Add npm script: `convex:dev` for `npx convex dev --local`
- [ ] `[MODEL]` Verify: Start `bun run convex:dev`, then `GET /health` returns `{ status: "ok", convex: "connected" }`

---

## 1.5 WorkOS Auth (Local)

Configure WorkOS authentication and create auth-required health endpoints to verify end-to-end auth flow.

**Architecture Reference:** [Section 5 - Authentication Architecture](./architecture.md#5-authentication-architecture), [Section 5.2 - Auth Environments](./architecture.md#52-auth-environments)

**Reference Docs:**
- [WorkOS AuthKit Overview](https://workos.com/docs/user-management) _(external only)_
- [WorkOS Node SDK](https://workos.com/docs/reference/node) _(external only)_
- [@convex-dev/workos](https://www.npmjs.com/package/@convex-dev/workos) _(external only)_

### Steps

- [ ] `[MODEL]` Install WorkOS packages: `bun add @workos-inc/node @convex-dev/workos @fastify/cookie`
- [ ] `[HUMAN]` Configure WorkOS Local environment:
  - Set redirect URI: `http://localhost:3000/auth/callback`
  - Set CORS origin: `http://localhost:3000`
- [ ] `[MODEL]` Create `.env.local` with WorkOS credentials (template, no real values)
- [ ] `[HUMAN]` Populate `.env.local` with actual WorkOS Local credentials
- [ ] `[MODEL]` Create `src/lib/workos.ts` - WorkOS client initialization
- [ ] `[MODEL]` Create `src/middleware/auth.ts` - JWT validation middleware
- [ ] `[MODEL]` Create `src/api/auth.ts` - routes: `/auth/login`, `/auth/callback`, `/auth/logout`
- [ ] `[MODEL]` Create `convex/auth.config.ts` - WorkOS JWT validation for Convex
- [ ] `[MODEL]` Create `convex/healthAuth.ts` - query requiring `ctx.auth.getUserIdentity()`, returns `{ status: "ok", user }`
- [ ] `[MODEL]` Register auth routes and middleware in server
- [ ] `[MODEL]` Update `src/api/health.ts` - add GET `/api/health` (auth required) that calls `convex/healthAuth`
- [ ] `[MODEL]` Verify: Full auth flow - login → callback → cookie set → `GET /api/health` returns user + Convex status

---

## 1.6 MCP Integration

Set up MCP endpoint with auth-required health check tool. Custom integration (no fastify-mcp dependency).

**Architecture Reference:** [Section 6 - MCP Architecture](./architecture.md#6-mcp-architecture)

**Reference Docs:**
- [MCP SDK](./reference/mcp-sdk.md) | [External](https://modelcontextprotocol.io/docs/sdk)
- [MCP Health Checks](https://mcpcat.io/guides/building-health-check-endpoint-mcp-server/)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)

### Steps

- [ ] `[MODEL]` Install MCP packages: `bun add @modelcontextprotocol/sdk zod`
- [ ] `[MODEL]` Install Zod type provider: `bun add fastify-type-provider-zod`
- [ ] `[MODEL]` Create `src/api/mcp.ts` - MCP server with `health_check` tool that calls `convex/healthAuth`
- [ ] `[MODEL]` Create `src/lib/mcp.ts` - Wire MCP server to Fastify POST `/mcp` route with StreamableHTTPServerTransport
- [ ] `[MODEL]` Apply auth middleware to `/mcp` endpoint
- [ ] `[MODEL]` Verify: POST to `/mcp` with auth calls `tools/list`, returns `health_check` tool
- [ ] `[MODEL]` Verify: Call `health_check` tool via MCP protocol, returns user info from Convex

---

## 1.7 Static File Serving

Configure widget/frontend static file serving.

**Architecture Reference:** [Section 4.6 - Frontend](./architecture.md#46-frontend), [Section 7.1 - Layer Organization](./architecture.md#71-layer-organization)

**Reference Docs:**
- [@fastify/static](./reference/fastify-static.md) | [External](https://github.com/fastify/fastify-static)
- [@fastify/cors](./reference/fastify-cors.md) | [External](https://github.com/fastify/fastify-cors)

### Steps

- [ ] `[MODEL]` Install static/CORS packages: `bun add @fastify/static @fastify/cors`
- [ ] `[MODEL]` Create `public/` directory
- [ ] `[MODEL]` Create `public/index.html` - minimal HTML with "PromptDB" heading
- [ ] `[MODEL]` Register static file plugin serving from `public/`
- [ ] `[MODEL]` Configure CORS for local development
- [ ] `[MODEL]` Verify: `http://localhost:3000/` serves the HTML page

---

## 1.8 Testing Foundation

Establish testing structure with one test per layer.

**Architecture Reference:** [Section 11 - Testing Strategy](./architecture.md#11-testing-strategy)

**Reference Docs:**
- [Bun Test](./reference/bun-test.md) | [External](https://bun.sh/docs/cli/test)
- [WorkOS Get User](https://workos.com/docs/reference/user-management/user/get) _(external only)_

**Test Users Required:**
- **Local testing:** User in WorkOS Local environment for automated integration tests
- **Staging testing:** User in WorkOS Staging environment for CI integration tests
- **Manual validation:** Your personal user in WorkOS Staging for manual QA

### Steps

- [ ] `[HUMAN]` Create test user in WorkOS Local environment (for local integration tests)
- [ ] `[MODEL]` Create `tests/` directory structure: `tests/unit/`, `tests/integration/`, `tests/fixtures/`
- [ ] `[MODEL]` Create `tests/fixtures/auth.ts` - WorkOS token generation utility using test user credentials
- [ ] `[MODEL]` Create `tests/unit/example.test.ts` - trivial passing test
- [ ] `[MODEL]` Create `tests/integration/health.test.ts` - tests Fastify `/health` endpoint (no auth)
- [ ] `[MODEL]` Create `tests/integration/healthAuth.test.ts` - tests `/api/health` with auth token fixture
- [ ] `[MODEL]` Create `tests/integration/convex.test.ts` - tests Convex connectivity
- [ ] `[MODEL]` Create `tests/integration/mcp.test.ts` - tests MCP endpoint with auth
- [ ] `[MODEL]` Add npm script: `test` runs `bun test`
- [ ] `[MODEL]` Verify: `bun test` passes all tests (requires local Convex running)

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
- [ ] `[HUMAN]` Create test user in WorkOS Staging environment (for CI integration tests)
- [ ] `[HUMAN]` Create/verify your personal user in WorkOS Staging (for manual validation)
- [ ] `[MODEL]` Create `.env.staging` additions with WorkOS staging credentials template
- [ ] `[HUMAN]` Populate WorkOS staging credentials
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
  - `COOKIE_SECRET` (generate with `openssl rand -base64 32`)
  - `CONVEX_URL`
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
- [ ] `[MODEL]` Push to main, verify pipeline runs
- [ ] `[MODEL]` Verify: Successful deployment, staging health check passes

---

## 2.6 Custom Domain (Optional)

Configure custom domain for staging environment.

**Architecture Reference:** [Section 4.7 - Infrastructure & Deployment](./architecture.md#47-infrastructure--deployment)

**Reference Docs:**
- [Fly.io Custom Domains](https://fly.io/docs/networking/custom-domain/) _(external only)_

### Steps

- [ ] `[HUMAN]` Add DNS record: `staging.promptdb.praxen.ai CNAME promptdb-staging.fly.dev`
- [ ] `[HUMAN]` Configure custom domain in Fly.io: `fly certs create staging.promptdb.praxen.ai`
- [ ] `[HUMAN]` Wait for SSL certificate provisioning
- [ ] `[HUMAN]` Update WorkOS staging redirect URI to use custom domain
- [ ] `[MODEL]` Verify: `https://staging.promptdb.praxen.ai/health` returns OK

---

# Done Checklists

## Local Environment Done

All of the following must pass before local is considered complete:

### Automated Verification

- [ ] `bun run lint` - passes with no errors
- [ ] `bun run typecheck` - passes with no errors
- [ ] `bun test` - all tests pass

### Manual Verification

**Layered validation (proves arch step-by-step):**

- [ ] **Step 1 - Fastify alive**: `GET /health` returns `{ status: "ok", timestamp }`
- [ ] **Step 2 - Convex connected**: `GET /health` includes `{ convex: "connected" }`
- [ ] **Step 3 - Auth flow**: Complete login → callback → cookie set
- [ ] **Step 4 - Auth + Convex**: `GET /api/health` (with cookie) returns `{ status: "ok", user: {...}, convex: "connected" }`
- [ ] **Step 5 - MCP protocol**: POST `/mcp` with `tools/list` returns tool list including `health_check`
- [ ] **Step 6 - MCP + Auth + Convex**: Call `health_check` tool via MCP, returns user info from Convex
- [ ] **Step 7 - Static files**: `GET /` serves HTML page

### Expected State

- Fastify server running on port 3000
- Convex local backend running (`npx convex dev --local`)
- WorkOS Local environment configured and working
- All tests passing
- Full stack verified:
  - `/health` - Fastify + Convex (no auth)
  - `/api/health` - Fastify + Auth + Convex (auth required)
  - `/mcp` - MCP protocol + Auth + Convex (auth required)

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

### Expected State

- Application deployed to Fly.io staging
- Convex deployed to cloud staging
- WorkOS staging environment configured
- CI/CD pipeline triggers on merge to main
- All health checks passing

---

## Post-M0 Notes

_Space for learnings during the build to inform checklist refinement:_

-
-
-

---

**Checklist Version:** 0.1 (Draft)
**Created:** 2025-12-21
**Status:** Ready for execution
