# LiminalDB

Personal prompt library that follows you across AI surfaces.

## Product Overview

**What:** A prompt and skills library accessible from any AI chat surface.

**Who:** AI power users who work across multiple surfaces (Claude Code, Cursor, ChatGPT, VS Code) and want their prompts and skills available everywhere without copy-paste or context switching.

**Why:** Prompting mastery compounds, but prompt wisdom scatters. Good prompts get lost in chat histories, markdown files, and memory. Complex skills (prompts + reference materials) are even harder to manage. LiminalDB captures prompts and skills in-flow and makes them retrievable from wherever you're working.

**How:** Save prompts via natural language ("save this as my code-review prompt"), retrieve them the same way ("get my code-review prompt"). Skills bundle prompts with attachments (markdown docs, code files, reference materials). Browse and organize via web UI. Works via MCP protocol, REST API, or web interface.

## Roadmap

### Completed

| Phase | Description |
|-------|-------------|
| Product Planning | Vision, target user, feature priorities |
| Tech & Architecture | Stack selection, system design, auth strategy |
| Core Architecture | Fastify + Bun server, Convex integration, project structure |
| Auth | WorkOS AuthKit, JWT validation, MCP OAuth discovery (RFC 9728) |
| Application Layer | Route handlers, middleware, error handling |
| Testing Foundation | Vitest setup, service tests, integration tests |
| API Standup | REST endpoints for prompts (CRUD) |
| MCP Standup | MCP server, tools, transport handling |
| Web UI | Shell/portlet architecture, prompt viewer, editor |
| Core Prompt Build | Full prompt lifecycle, tags, parameters |
| TDD Refactor | Bun test → Vitest migration, test reorganization |
| MCP/API Parity | list, search, update, track_prompt_use tools |
| Search & Redis | Full-text search, ranking, durable drafts, pin/favorite |

### Current

| Phase | Description |
|-------|-------------|
| Skills Build | Prompts with attachments (markdown, code, reference docs) |

### Upcoming

| Phase | Description |
|-------|-------------|
| Refinement Pass 1 | API/MCP/UI polish for prompts + skills |
| Playwright + LLM Testing | E2E test skeleton, critical path coverage, LLM browser testing |
| Preview & Prod Deploy | Fly.io environments, CI/CD for preview branches |
| Refinement Pass 2 | Edge cases, error handling, UX improvements |
| Closed Beta | Ship to small group of testers |

## Functional Overview

### Prompt Management

- **Create** prompts with name, slug, description, content, tags, parameters
- **Retrieve** by slug or search by content/tags
- **Update** existing prompts (full or partial)
- **Delete** prompts
- **Organize** with tags (flat, not hierarchical)

### Skills Management (Building)

Skills are prompts with attachments - bundled reference materials that give context.

- **Create** skills with main prompt content plus attachments
- **Attachments** can be markdown docs, code files, CSVs, reference materials
- **Retrieve** skill with all attachments expanded or as file list
- **Use cases:** Code review checklists with style guides, writing prompts with tone examples, analysis prompts with schema definitions

### Search & Discovery

- **Full-text search** across slug, name, description, content
- **Tag filtering** (any-of selected tags)
- **Smart ranking** by usage frequency, recency, and explicit signals
- **Pin** prompts to always appear at top
- **Favorite** prompts to boost ranking

### Drafts

- **Durable drafts** persist across browser refresh (Redis-backed, 24h TTL)
- **Cross-tab sync** via polling
- **Line edits** accumulate as draft until explicit save/discard

### Access Methods

| Method | Use Case |
|--------|----------|
| Web UI | Browse, search, edit, organize |
| MCP | Natural language access from Claude Code, Cursor, etc. |
| REST API | Programmatic access, automation |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Clients                                                     │
│  ├── Web Browser (shell.html → portlet iframes)             │
│  ├── MCP Clients (Claude Code, Cursor, VS Code, ChatGPT)    │
│  └── API Clients (programmatic access)                       │
└─────────────────────────────┬───────────────────────────────┘
                              │
┌─────────────────────────────▼───────────────────────────────┐
│  Fastify Server (Bun runtime, port 5001)                     │
│  ├── Auth Middleware (JWT validation via jose + WorkOS JWKS)│
│  ├── /mcp (MCP protocol endpoint)                            │
│  ├── /api/* (REST routes)                                    │
│  ├── /auth/* (OAuth flow)                                    │
│  ├── /_m/* (portlet module routes)                           │
│  └── /* (static files, shell)                                │
└─────────────────────────────┬───────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
┌───────────▼───────────┐           ┌───────────▼───────────┐
│  Convex               │           │  Redis (Upstash)      │
│  Source of truth      │           │  Ephemeral state      │
│  ├── prompts          │           │  └── drafts (24h TTL) │
│  ├── tags             │           │                       │
│  ├── promptTags       │           │                       │
│  ├── users            │           │                       │
│  └── rankingConfig    │           │                       │
└───────────────────────┘           └───────────────────────┘
```

### Request Flow

1. **Client** sends request (cookie or Bearer token)
2. **Auth middleware** validates JWT via WorkOS JWKS (stateless, cached)
3. **Route handler** processes request
4. **Convex client** called with API key + userId (user scoping enforced)
5. **Response** returned to client

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Fastify between clients and Convex | MCP needs streaming/SSE; VPS has no cold starts |
| API key + userId to Convex | Clean separation: Fastify handles auth, Convex handles data |
| HttpOnly cookies for web | XSS protection per IETF BFF pattern |
| Bearer tokens for MCP/API | Per MCP spec requirement |
| Redis for drafts | Survives refresh, cross-tab sync, 24h TTL |
| Convex search index | Built-in full-text search, no external service |

For deeper technical details, see [docs/tech-arch/](./docs/tech-arch/).

## Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Runtime | Bun | Fast startup, native TS, built-in bundler |
| Server | Fastify | Low overhead, plugin ecosystem |
| Database | Convex | Real-time, TypeScript-native, managed |
| Cache | Redis (Upstash) | Drafts, ephemeral state |
| Auth | WorkOS AuthKit | OAuth, enterprise SSO path, 1M free MAU |
| Protocol | MCP SDK | Tool registration, transport handling |
| Validation | Zod | Schema validation (MCP + API) |
| JWT | jose | JWKS validation, multi-issuer support |
| Linting | Biome | Fast, single config |
| Testing | Vitest | Fast, Jest-compatible |
| Deployment | Fly.io | VPS, no cold starts |
| CI | GitHub Actions + Blacksmith | Quality gates, deploy |

## Directory Structure

```
├── src/
│   ├── index.ts              # Fastify server entry
│   ├── api/                   # API route handlers
│   ├── routes/                # Route registration
│   │   ├── prompts.ts        # /api/prompts REST
│   │   ├── drafts.ts         # /api/drafts REST
│   │   ├── auth.ts           # /auth/* OAuth flow
│   │   ├── app.ts            # /* shell routes
│   │   └── modules.ts        # /_m/* portlet routes
│   ├── lib/
│   │   ├── mcp.ts            # MCP server + tools
│   │   ├── convex.ts         # Convex client
│   │   ├── redis.ts          # Redis client
│   │   ├── config.ts         # Environment config
│   │   ├── workos.ts         # WorkOS client
│   │   └── auth/             # JWT validation, decoding
│   ├── middleware/
│   │   └── auth.ts           # Auth middleware
│   ├── schemas/              # Zod schemas
│   └── ui/
│       └── templates/        # HTML templates (shell, portlets)
├── convex/
│   ├── schema.ts             # Database schema
│   ├── prompts.ts            # Prompt queries/mutations
│   ├── triggers.ts           # Tag sync triggers
│   ├── auth/                 # API key validation, user scoping
│   └── model/                # Business logic
├── public/                   # Static assets (CSS, JS)
├── tests/
│   ├── service/              # Unit/service tests (mocked deps)
│   ├── integration/          # Full HTTP tests (real services)
│   └── convex/               # Convex function tests
└── docs/
    ├── product-brief.md      # Product vision
    ├── tech-arch/            # Architecture & design docs
    │   ├── README.md         # System overview, decisions
    │   ├── auth.md           # Authentication deep dive
    │   └── ui-patterns.md    # Shell/portlet UI architecture
    └── epics/                # Development history
```

## Technical Patterns

### Authentication

**Web flow:**
1. User clicks login → redirect to WorkOS
2. WorkOS authenticates → redirect to `/auth/callback` with code
3. Exchange code for JWT → set HttpOnly cookie
4. Subsequent requests include cookie automatically

**MCP flow:**
1. MCP client hits `/mcp` → 401 with `WWW-Authenticate` header
2. Client fetches `/.well-known/oauth-protected-resource`
3. Client does OAuth with WorkOS (DCR/PKCE)
4. Client sends `Authorization: Bearer <token>` on requests

**Convex auth:**
- Fastify validates JWT, extracts userId
- Calls Convex with API key + userId
- Convex validates API key, filters by userId

### UI Architecture (Shell/Portlet)

```
Shell (shell.html)
├── Owns: browser history, URL parsing, header chrome
├── Loads: portlets via iframe
└── Communicates: postMessage protocol

Portlet (e.g., prompts.html)
├── Owns: internal DOM, state, API calls
├── Mounts: components (prompt-viewer.js, prompt-editor.js)
└── Communicates: postMessage to shell
```

**Message protocol:**
- `portlet:ready` - portlet loaded and ready for state
- `history:push` - portlet requests URL/history change
- `shell:state` - shell sends current state to portlet
- `shell:filter` - shell sends search/tag filter
- `portlet:dirty` - portlet has unsaved changes
- `portlet:drafts` - draft count changed

### Convex Patterns

**Schema:** Relational with denormalization for performance
- `prompts` table with denormalized `tagNames` array
- `tags` and `promptTags` tables for many-to-many
- Triggers sync `tagNames` when `promptTags` changes

**Search:** Built-in search index on `searchText` field
- `searchText` = concatenated slug + name + description + content
- Search index with `filterFields: ["userId"]` for user scoping

**Ranking:** Computed at query time
- `score = (usage × usageWeight) + (recency × recencyWeight) + (favorite × favoriteWeight)`
- Pinned prompts sorted separately, always first
- Config stored in `rankingConfig` table for tuning

### MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `health_check` | - | Stack connectivity status |
| `test_auth` | - | Authenticated user context |
| `save_prompts` | Array of prompt objects | Success/error per prompt |
| `get_prompt` | slug | Prompt object or not found |
| `list_prompts` | limit? | Ranked prompt array |
| `search_prompts` | query?, tags? | Matched prompts |
| `update_prompt` | slug, fields | Updated prompt |
| `delete_prompt` | slug | Success/error |
| `list_tags` | - | User's tag names |
| `track_prompt_use` | slug | Updated usage count |

### Testing Layers

| Layer | Location | What | Dependencies |
|-------|----------|------|--------------|
| Service | `tests/service/` | Route handlers, MCP tools | Mocked |
| Convex | `tests/convex/` | Queries, mutations, RLS | Mocked |
| Integration | `tests/integration/` | Full HTTP flows | Real services |
| UI | `tests/service/ui/` | Components (jsdom) | Mocked API |

## Installation & Setup

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (for local Convex)
- WorkOS account (AuthKit configured)
- Upstash Redis account

### Environment

Copy `.env.example` to `.env.local` and configure:

```bash
# WorkOS
WORKOS_CLIENT_ID=client_...
WORKOS_API_KEY=sk_...
WORKOS_REDIRECT_URI=http://localhost:5001/auth/callback
WORKOS_AUTH_SERVER_URL=https://your-subdomain.authkit.app

# Convex
CONVEX_URL=http://localhost:3210  # Local, or cloud URL
CONVEX_API_KEY=your-api-key

# Redis (for durable drafts)
REDIS_URL=redis://...

# Server
COOKIE_SECRET=32-char-minimum-secret
BASE_URL=http://localhost:5001
MCP_RESOURCE_URL=http://localhost:5001/mcp
CORS_ALLOWED_ORIGINS=http://localhost:5001
```

### Running Locally

```bash
# Install dependencies
bun install

# Terminal 1: Convex local backend
bun run convex:dev

# Terminal 2: Fastify server
bun run dev
```

- **Web UI:** http://localhost:5001
- **Health:** http://localhost:5001/health
- **MCP:** http://localhost:5001/mcp

### Commands

```bash
bun run dev           # Start server (watch mode)
bun run convex:dev    # Start Convex local backend
bun run test          # Run all tests
bun run test:service  # Service tests only
bun run test:ui       # UI component tests
bun run typecheck     # TypeScript check
bun run lint          # Biome lint
bun run check         # Format + lint + typecheck + test
```

## Status

**341 tests passing** across service, integration, UI, and Convex layers.

## Staging

- **URL:** https://promptdb-staging.fly.dev (pre-rebrand)
- **Convex:** Cloud staging deployment
- **CI:** GitHub Actions → Blacksmith runners
- **Deploy:** Push to `main` triggers quality gates + deploy

---

*LiminalBuilder*
