# Auth Architecture Decision - Handoff

## Status

M0 scaffold built through section 1.7. Working:
- Fastify server on port 5001
- Convex local backend on port 3210
- WorkOS OAuth login flow (browser)
- Signed cookie auth for web UI
- MCP endpoint with health_check tool
- Static landing page with auth state
- Test user created in WorkOS (`test@promptdb.local`)

**Blocked on:** Auth architecture decision.

## The Problem

Current auth middleware only supports signed cookies. Three things need Bearer tokens:

1. **MCP clients** (ChatGPT, Claude, Cursor) - MCP spec mandates `Authorization: Bearer` header, explicitly forbids cookies
2. **Integration tests** - Get tokens via `authenticateWithPassword()`, need to send them somehow
3. **API calls** - Standard for APIs is Bearer tokens

Tests currently fail because they send Bearer tokens but middleware only checks cookies.

## Key Files

| File | Purpose |
|------|---------|
| `docs/architecture.md` | Full architecture doc (approved) |
| `docs/product-brief.md` | Product context |
| `docs/M0-Checklist-ACTIVE.md` | Current progress (sections 1.1-1.7 done) |
| `src/middleware/auth.ts` | Current auth middleware (cookie-only) |
| `src/api/auth.ts` | OAuth routes (login, callback, logout) |
| `tests/fixtures/auth.ts` | Test auth - gets tokens via WorkOS SDK |
| `.claude/agents/devops-promptdb.md` | DevOps agent definition |

## The Question

How should auth work across ALL access patterns?

| Surface | Current | Needed |
|---------|---------|--------|
| Web browser | Signed cookies | ? |
| MCP clients | Not working | Bearer tokens (per MCP spec) |
| API calls | Not working | Bearer tokens (industry standard) |
| Tests | Failing | Bearer tokens |
| Widget iframe | Cookies | Cookies or Bearer |

**Core tension:** Can we have ONE auth method that works everywhere? Or do we need to support both cookies and Bearer?

## What Needs Research

1. **Bearer tokens for web apps** - How does the browser persist/send them? localStorage? What are the real security implications?

2. **XSS risk with localStorage** - Is it a real concern for this app? What's the actual threat model?

3. **Unified auth patterns** - Are there architectures that use Bearer everywhere including web?

4. **WorkOS capabilities** - What token types does WorkOS provide? How are they validated?

5. **MCP spec requirements** - What exactly does MCP mandate for auth?

## Constraints

- Must work for MCP clients (ChatGPT, Claude, Cursor, VS Code)
- Must work for web browser
- Must be testable
- Single auth approach preferred over multiple methods with permutations
- Using WorkOS AuthKit (already configured)
- Convex validates JWTs independently (JWT passthrough pattern)

## Prior Analysis

A devops agent analyzed the situation. Summary in commit message. Key points:
- MCP spec requires Bearer tokens
- Recommended: middleware checks Bearer first, then cookies
- JWT validation via JWKS (stateless)

This analysis was done quickly. The auth approach needs deeper research before deciding.

## Running the App

```bash
# Terminal 1 - Convex
bun run convex:dev

# Terminal 2 - Fastify
bun run dev

# Browser
http://localhost:5001/
```

## Running Tests

```bash
bun test  # 5 pass, 3 fail (auth tests)
```

Auth tests fail because they send Bearer tokens but middleware expects signed cookies.
