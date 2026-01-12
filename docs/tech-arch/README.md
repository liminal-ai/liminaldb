# Technical Architecture

Detailed system architecture for LiminalDB. For project overview and setup, see the [main README](../../README.md).

## Contents

- [System Overview](#system-overview)
- [Core Architectural Decisions](#core-architectural-decisions)
- [MCP Architecture](#mcp-architecture)
- [Security](#security)
- [Key Trade-offs](#key-trade-offs)
- **[Authentication](./auth.md)** - Auth flows, WorkOS integration, JWT validation
- **[UI Patterns](./ui-patterns.md)** - Shell/portlet architecture, components, messaging
- **[Widget UI](./ui-widgets.md)** - ChatGPT widget architecture, platform adapter, MCP integration

---

## System Overview

### High-Level Architecture

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

### Layer Responsibilities

| Layer | Responsibility | Technology |
|-------|----------------|------------|
| **Clients** | User interaction, MCP client | Claude Code, Cursor, VS Code, ChatGPT, Browser |
| **API Layer** | Request handling, auth enforcement, MCP protocol | Fastify + Bun |
| **Auth** | Identity, session management, JWT validation | WorkOS AuthKit + jose |
| **Data Layer** | Persistence, real-time, user scoping | Convex |
| **Cache Layer** | Drafts, ephemeral state | Redis (Upstash) |
| **Hosting** | Compute, load balancing, SSL | Fly.io |
| **CI/CD** | Build, test, deploy | GitHub Actions + Blacksmith |

### Why This Architecture

**Fastify between clients and Convex** (not standard Convex usage):

1. **MCP control** - MCP protocol requires streaming/SSE patterns that Convex actions don't handle well
2. **No cold starts** - VPS instances are always warm, critical for MCP responsiveness
3. **Auth transformation** - Fastify validates JWT, passes userId to Convex with API key
4. **Static serving** - Widget/shell files served from same origin, no CORS complexity

**Convex as typed data layer** (not a reactive frontend backend):

1. **ORM baked in** - Object-relational mapping reduces cognitive load
2. **Strongly typed stored procedures** - Queries/mutations are TypeScript with full type safety
3. **High performance** - Optimized storage with automatic indexing
4. **No Node.js actions** - Edge runtime only; Node.js work in Fastify
5. **Schema as code** - TypeScript, no separate schema language

**Redis for ephemeral state**:

1. **Durable drafts** - In-progress edits survive browser refresh (24h TTL)
2. **Cross-tab sync** - Draft state visible across browser tabs
3. **Low latency** - Faster than Convex for high-frequency writes

---

## Core Architectural Decisions

### Runtime & Framework

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Runtime | Bun | Fast startup, native TS, built-in bundler |
| HTTP Framework | Fastify | Fast, low overhead, plugin ecosystem |
| MCP SDK | @modelcontextprotocol/sdk | Official TypeScript SDK |
| Validation | Zod | MCP SDK uses Zod; single validation library |

### Data & Auth

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Convex | Real-time, TypeScript-native, managed |
| Cache | Redis (Upstash) | Managed, REST API, good free tier |
| Auth Provider | WorkOS AuthKit | Free to 1M MAU, enterprise SSO path |
| JWT Validation | jose | JWKS validation, multi-issuer support |
| Session Storage | HttpOnly cookie | XSS-proof per IETF BFF pattern |

### Frontend

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Plain HTML + Vanilla JS | Model-friendly, no build complexity |
| Architecture | Shell + Portlets (iframes) | Isolation, independent deployment |
| CSS | Custom properties (tokens) | Themeable without build step |

### Infrastructure

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Hosting | Fly.io | VPS (no cold starts), easy scaling |
| CI/CD | Blacksmith | Faster than GitHub Actions |
| Linter | Biome | 10-25x faster than ESLint+Prettier |
| Testing | Vitest | Fast, Jest-compatible, good ESM support |

---

## MCP Architecture

### Overview

Model Context Protocol (MCP) enables AI chat surfaces to access LiminalDB tools.

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  MCP Client      │     │  Fastify /mcp    │     │  Convex      │
│  (Claude Code)   │────▶│  (MCP Server)    │────▶│  (Data)      │
└──────────────────┘     └──────────────────┘     └──────────────┘
        │                        │
        │   1. Bearer token      │
        │   2. JSON-RPC request  │
        │                        │
        │◀───────────────────────│
        │   3. Tool result       │
```

### MCP Tools

| Tool | Purpose | Read/Write |
|------|---------|------------|
| `health_check` | Verify stack connectivity | Read |
| `test_auth` | Return authenticated user context | Read |
| `save_prompts` | Save one or more prompts | Write |
| `get_prompt` | Retrieve prompt by slug | Read |
| `list_prompts` | List prompts (ranked) | Read |
| `search_prompts` | Search by query/tags | Read |
| `update_prompt` | Update existing prompt | Write |
| `delete_prompt` | Delete prompt | Write |
| `list_tags` | Get user's tags | Read |
| `track_prompt_use` | Record usage | Write |
| `open_prompt_library` | Open full prompt library widget | Read |
| `set_preferences` | Set user preferences (e.g., theme) | Write |
| `get_preferences` | Get user preferences | Read |

### MCP Resources

| Resource | URI | Purpose |
|----------|-----|---------|
| `health-widget` | `ui://widget/health` | ChatGPT Skybridge widget for health status |
| `prompt-library-widget` | `ui://widget/prompt-library` | ChatGPT Skybridge widget for full prompt library |

See [ui-widgets.md](./ui-widgets.md) for widget architecture details.

### MCP Transport

| Transport | Protocol | Usage |
|-----------|----------|-------|
| Streamable HTTP | 2025-11-25 | Modern clients (Claude Desktop, Cursor) |
| SSE (deprecated) | 2024-11-05 | Backwards compatibility |

### MCP + Auth Integration

MCP clients discover authentication via RFC 9728:

1. Client hits `/mcp` without token → 401 with `WWW-Authenticate` header
2. Client fetches `/.well-known/oauth-protected-resource`
3. Metadata points to WorkOS as authorization server
4. Client does OAuth with WorkOS (DCR/PKCE)
5. Client sends `Authorization: Bearer <token>` on requests
6. Fastify validates JWT, extracts userId, calls Convex

See [auth.md](./auth.md) for complete auth flows.

---

## Security

### Principles

1. **Defense in depth** - Auth validated at Fastify, data scoped at Convex (user filtering)
2. **Least privilege** - All data access scoped to authenticated user
3. **No secrets in client** - Tokens in HttpOnly cookies only
4. **Audit trail** - All actions traceable to user

### Threat Model

| Threat | Mitigation |
|--------|------------|
| XSS stealing tokens | HttpOnly cookies, no localStorage |
| CSRF | SameSite=Lax cookies |
| Token theft | Short expiry, refresh tokens |
| Man-in-the-middle | TLS everywhere (Fly.io) |
| Convex URL discovery | All queries require valid API key + userId |
| Fastify compromise | User scoping limits blast radius to single user's data |

### Input Validation

| Layer | Validation |
|-------|------------|
| MCP tools | Zod schemas |
| API routes | Fastify + Zod type provider |
| Convex | TypeScript types + runtime validation |

### Auth Token Security

```
Token Lifecycle:
1. WorkOS issues access token (~1 hour expiry)
2. Fastify stores in sealed HttpOnly cookie
3. Cookie: HttpOnly, Secure, SameSite=Lax
4. Refresh happens server-side before expiry
5. Logout clears cookie
```

---

## Drafts API

Redis-backed durable drafts that survive browser refresh.

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/drafts` | GET | List user's active drafts |
| `/api/drafts` | POST | Create or update a draft |
| `/api/drafts/:draftId` | GET | Get specific draft |
| `/api/drafts/:draftId` | DELETE | Discard draft |
| `/api/drafts/summary` | GET | Draft count and status |

### Draft Lifecycle

```
1. User edits prompt → POST /api/drafts (creates draft with 24h TTL)
2. User continues editing → POST /api/drafts (updates draft, resets TTL)
3. User saves → Persist to Convex, DELETE draft
4. User discards → DELETE draft
5. User closes tab → Draft persists in Redis
6. User returns → GET /api/drafts restores draft
7. 24 hours pass → Redis TTL expires draft automatically
```

### Redis Keys

| Pattern | Purpose |
|---------|---------|
| `draft:{userId}:{draftId}` | Draft content (JSON) |
| `drafts:{userId}` | Set of user's draft IDs |

---

## Convex Patterns

### Project Structure

```
convex/
├── schema.ts          # Table definitions
├── functions.ts       # Query/mutation wrappers
├── prompts.ts         # Prompt CRUD operations
├── triggers.ts        # Tag sync triggers
├── auth/
│   ├── apiKey.ts      # API key validation
│   ├── rls.ts         # RLS types (infrastructure, not yet active)
│   └── types.ts       # Auth types
└── model/
    └── prompts.ts     # Business logic layer
```

### Auth Pattern

Convex functions validate API key inline and scope all queries by userId:

```typescript
export const getPromptBySlug = query({
  args: { apiKey: v.string(), userId: v.string(), slug: v.string() },
  handler: async (ctx, { apiKey, userId, slug }) => {
    const config = await getApiKeyConfig(ctx);
    if (!validateApiKey(apiKey, config)) {
      throw new Error("Invalid API key");
    }
    return Prompts.getBySlug(ctx, userId, slug);
  },
});
```

### Model Layer

Business logic in `convex/model/` separates concerns from function definitions:

| File | Purpose |
|------|---------|
| `model/prompts.ts` | Insert, update, delete, search with ranking |

### Triggers

`convex/triggers.ts` maintains denormalized data:

| Trigger | Purpose |
|---------|---------|
| Tag sync | Updates `tagNames` array when `promptTags` change |

### Search & Ranking

| Table | Index | Purpose |
|-------|-------|---------|
| `prompts` | `search_prompts` | Full-text search on `searchText` field |
| `rankingConfig` | `by_key` | Configurable ranking weights |

Ranking formula:
```
score = (usage × usageWeight) + (recency × recencyWeight) + (favorite × favoriteWeight)
```

Pinned prompts sorted separately, always appear first.

---

## Key Trade-offs

### Architecture

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| Fastify between client and Convex | Extra layer, more code | MCP control, no cold starts |
| API key + userId (not JWT passthrough) | Fastify must be trusted | Clean separation: Fastify handles auth, Convex handles data |
| VPS over serverless | Manual scaling | Predictable performance, no cold starts |
| Vanilla JS over React | Less component reuse | Simpler build, model-friendly, faster load |

### Security

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| API key + userId to Convex | Convex trusts Fastify | User scoping limits blast radius per-user |
| HttpOnly cookies | No client-side token access | XSS-proof |
| Stateless JWT validation | No instant revocation | Performance (~0ms vs ~60ms per request) |

### Constraints Accepted

1. **All Convex calls require userId** - No system-level access without workarounds
2. **Fastify is auth boundary** - If compromised with API key, can impersonate users
3. **E2E testing deferred** - Playwright adds weight, defer until critical paths exist

---

## Requirements

### Functional

| ID | Requirement |
|----|-------------|
| FR-01 | Save prompt from any MCP-enabled surface |
| FR-02 | Retrieve prompt by slug or search |
| FR-03 | List prompts with filtering and ranking |
| FR-04 | User authentication via OAuth |
| FR-05 | Health check endpoints |

### Non-Functional

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-01 | API response time | < 200ms p90 |
| NFR-02 | Simultaneous requests | 2,000 |
| NFR-03 | Monthly infrastructure cost | < $100 (pre-scale) |
| NFR-04 | Availability | 99.5% |
| NFR-05 | Model-friendly architecture | Tech choices scale with model capabilities |

**NFR-05 Rationale:** The system maximizes a coding model's ability to implement features:
- HTML + vanilla JS over React (simpler patterns, linear scaling)
- TypeScript throughout (models excel at type-aware generation)
- Zod schemas (declarative, model can reason about)
- Explicit over magic (fewer framework conventions)

---

## Future Considerations

### System Operations Without User Context

Current: All Convex operations require userId.

Future needs:
- Background jobs (scheduled tasks)
- Webhook handlers
- Admin operations

Options:
- Internal Convex functions bypassing RLS
- Dedicated "system user" ID
- Separate admin API

### Rate Limiting

As usage scales:
- Per-user API limits
- Per-endpoint throttling
- Redis-backed rate limiting

### Multi-Tenant

If team/org support added:
- Data isolation (user vs shared prompts)
- Permission model (read/write/admin)
- Per-org billing

---

*Last updated: January 2025*
