# Authentication & Authorization

Complete authentication architecture and implementation for LiminalDB.

---

## Table of Contents

1. [Overview](#overview)
2. [Why WorkOS](#why-workos)
3. [Design Principles](#design-principles)
4. [Requirements](#requirements)
5. [Solution Architecture](#solution-architecture)
6. [Token Flows](#token-flows)
7. [Implementation](#implementation)
8. [MCP OAuth Discovery](#mcp-oauth-discovery)
9. [Widget JWT](#widget-jwt)
10. [Testing Strategy](#testing-strategy)
11. [Trade-offs](#trade-offs)
12. [Future Considerations](#future-considerations)
13. [Appendices](#appendices)

---

## Overview

LiminalDB uses WorkOS AuthKit for authentication across all entry points:

| Entry Point | Token Transport | Validation | Convex Auth |
|-------------|-----------------|------------|-------------|
| Web Browser | HttpOnly Cookie | Fastify (jose) | API Key + userId |
| MCP Client | Bearer Header | Fastify (jose) | API Key + userId |
| API Client | Bearer Header | Fastify (jose) | API Key + userId |
| ChatGPT Widget | Bearer Header (Widget JWT) | Fastify (jose) | API Key + userId |
| Tests | Bearer Header | Fastify (jose) | API Key + userId |

**Key design:** Fastify is the auth boundary. It validates JWTs and passes userId to Convex. Convex trusts Fastify (via API key) and scopes all queries by userId.

ChatGPT widgets use a separate JWT (widget JWT) for API authentication. See [Widget JWT](#widget-jwt) section.

---

## Why WorkOS

### Providers Evaluated

| Provider | Focus | Pricing | Notes |
|----------|-------|---------|-------|
| **WorkOS** | B2B SaaS | 1M free MAU | Selected |
| Clerk | React-first | Per-MAU | SSO requires $100/mo add-on |
| Auth0 | Developer identity | Per-MAU | Expensive at scale |
| Keycloak | Self-hosted | Free | Requires DevOps overhead |

### Decision Rationale

- **B2B SaaS Focus**: Built for SaaS companies selling to enterprises
- **MCP Integration**: Can wrap WorkOS in OAuth provider endpoints for any MCP client
- **Pricing**: 1M free MAU covers early growth; enterprise SSO priced per-connection
- **JWT-Based**: Standard RS256-signed JWTs, statelessly validatable via JWKS

---

## Design Principles

### Coherence Over Convenience
- Same JWT format across all entry points
- Same validation logic regardless of token transport
- No "just for testing" auth paths

### Testability as First-Class
- All auth paths testable with same token acquisition
- Integration tests use real WorkOS tokens
- No separate "test mode" authentication

### As Complex as Necessary
- HttpOnly cookies for web (XSS protection)
- Bearer tokens for programmatic access (MCP, API)
- Stateless validation where possible (performance)

---

## Requirements

### Functional

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Web browser auth via WorkOS OAuth | Must |
| FR2 | MCP clients auth via Bearer token | Must |
| FR3 | API clients auth via Bearer token | Must |
| FR4 | Integration tests use production auth | Must |
| FR5 | MCP OAuth discovery (RFC 9728) | Must |
| FR6 | Convex receives user identity | Must |

### Security

| ID | Requirement | Priority |
|----|-------------|----------|
| SR1 | Web tokens not accessible to JS (XSS) | Must |
| SR2 | CSRF protection for cookie auth | Must |
| SR3 | JWT signature validation on every request | Must |
| SR4 | Token expiry enforcement | Must |
| SR5 | Secure cookie attributes | Must |

---

## Solution Architecture

### Token Format: WorkOS JWT

```
Header: { "alg": "RS256", "typ": "JWT" }
Payload: {
  "sub": "user_01KD3AV9...",     // User ID (required)
  "email": "user@example.com",   // Optional (not in DCR tokens)
  "sid": "session_01KD3...",     // Session ID (optional)
  "aud": "client_01K45...",      // Client ID
  "iss": "https://api.workos.com/user_management/client_...",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Auth Flow Diagram

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Client    │    │   Fastify   │    │   WorkOS    │    │   Convex    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │  Cookie/Bearer   │                  │                  │
       │─────────────────▶│                  │                  │
       │                  │                  │                  │
       │                  │  Validate JWT    │                  │
       │                  │  (jose + JWKS)   │                  │
       │                  │─────────────────▶│                  │
       │                  │◀─────────────────│                  │
       │                  │                  │                  │
       │                  │  API Key + userId                   │
       │                  │─────────────────────────────────────▶
       │                  │                                     │
       │                  │                  │   user filter    │
       │                  │◀─────────────────────────────────────
       │                  │                  │                  │
       │     Response     │                  │                  │
       │◀─────────────────│                  │                  │
```

### Multi-Issuer Support

Tokens may come from:
- **User Management API**: `https://api.workos.com/user_management/{clientId}` (web auth)
- **AuthKit OAuth**: `https://{subdomain}.authkit.app` (MCP/DCR auth)

Both validated against the same JWKS endpoint.

---

## Token Flows

### Flow A: Web Browser OAuth

```
1. User clicks login
2. Fastify redirects to WorkOS authorization URL
3. User authenticates with WorkOS
4. WorkOS redirects to /auth/callback?code=...
5. Fastify exchanges code for JWT via authenticateWithCode()
6. Fastify sets JWT in HttpOnly cookie (Secure, SameSite=Lax)
7. Browser stores cookie, sends on future requests
```

### Flow B: MCP Client OAuth

```
1. MCP client calls /mcp without token
2. Server returns 401 with WWW-Authenticate header
3. Client fetches /.well-known/oauth-protected-resource
4. Client does OAuth with WorkOS (DCR/PKCE)
5. Client sends Authorization: Bearer <token>
6. Server validates JWT, processes request
```

### Flow C: API / Tests

```
1. Client obtains JWT (authenticateWithPassword for tests)
2. Client sends Authorization: Bearer <token>
3. Server validates JWT, processes request
```

---

## Implementation

### File Layout

```
src/
├── lib/
│   ├── workos.ts              # WorkOS client
│   ├── config.ts              # Environment config
│   └── auth/
│       ├── index.ts           # Re-exports
│       ├── types.ts           # Auth types
│       ├── tokenExtractor.ts  # Extract JWT from request
│       ├── jwtValidator.ts    # Validate via jose (WorkOS JWTs)
│       ├── jwtDecoder.ts      # Decode JWT claims
│       └── widgetJwt.ts       # Widget JWT sign/verify (HS256)
├── middleware/
│   ├── auth.ts                # Browser/MCP auth middleware
│   └── apiAuth.ts             # API auth (cookie + widget JWT)
├── routes/
│   ├── auth.ts                # OAuth routes (login, callback, logout)
│   └── well-known.ts          # MCP OAuth discovery
└── index.ts                   # Fastify app

convex/
├── auth/
│   ├── apiKey.ts              # API key validation
│   ├── rls.ts                 # RLS types (infrastructure, not yet active)
│   └── types.ts               # Auth types
└── schema.ts                  # Schema with userId fields
```

### Types

**TokenExtractionResult**
```typescript
{
  token: string | null;
  source: 'bearer' | 'cookie' | null;
}
```

**JwtClaims** (extracted from validated JWT)
```typescript
{
  sub: string;      // User ID (required)
  email?: string;   // Optional in DCR tokens
  sid?: string;     // Session ID (optional)
}
```

**AuthUser** (attached to request)
```typescript
{
  id: string;       // From sub claim
  email?: string;
  sessionId?: string;
}
```

### Middleware Flow

```
1. extractToken(request) → token, source
2. If no token → 401
3. validateJwt(token) → result
4. If invalid → 401 (+ WWW-Authenticate for /mcp)
5. decodeJwtClaims(token) → claims
6. Attach to request:
   - request.user = { id, email, sessionId }
   - request.accessToken = token
```

### Token Extractor

```typescript
function extractToken(request: FastifyRequest): TokenExtractionResult {
  // 1. Check Authorization header first
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return { token: authHeader.slice(7), source: 'bearer' };
  }

  // 2. Fall back to cookie
  const cookie = request.cookies.accessToken;
  if (cookie) {
    return { token: cookie, source: 'cookie' };
  }

  return { token: null, source: null };
}
```

### JWT Validator

**JWKS URL:** `https://api.workos.com/sso/jwks/{clientId}`

```typescript
import { createRemoteJWKSet, jwtVerify } from 'jose';

const WORKOS_JWKS_URL = `https://api.workos.com/sso/jwks/${WORKOS_CLIENT_ID}`;
const jwks = createRemoteJWKSet(new URL(WORKOS_JWKS_URL));

async function validateJwt(token: string): Promise<JwtValidationResult> {
  try {
    await jwtVerify(token, jwks, {
      issuer: [USER_MGMT_ISSUER, AUTHKIT_ISSUER],
      audience: WORKOS_CLIENT_ID
    });
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}
```

### Cookie Configuration

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | true | Prevent JS access (XSS) |
| `secure` | true (prod) | HTTPS only |
| `sameSite` | Lax | CSRF protection |
| `path` | / | All routes |
| `signed` | true | Tamper detection |
| `maxAge` | 604800 | 7 days |

### Convex API Key Auth

Convex doesn't validate JWTs. It validates an API key proving the request came from Fastify. Each function validates inline:

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

**Key rotation:**
1. Generate new key
2. Set as `CONVEX_API_KEY`, old as `CONVEX_API_KEY_PREVIOUS`
3. Deploy Convex (accepts both)
4. Update Fastify, deploy
5. Remove `CONVEX_API_KEY_PREVIOUS`

### User Scoping

All user-scoped tables have `userId` field. User scoping is enforced by passing userId from Fastify and filtering via indexes in model functions:

> **Note:** RLS infrastructure exists (`convex/auth/rls.ts`) but rules are not yet active. Currently using parameter-based user scoping which achieves the same isolation.

```typescript
// Schema
prompts: defineTable({
  userId: v.string(),
  slug: v.string(),
  // ...
}).index("by_user", ["userId"])
.index("by_user_slug", ["userId", "slug"])

// Model function scopes by userId
export async function getBySlug(ctx, userId, slug) {
  return ctx.db
    .query("prompts")
    .withIndex("by_user_slug", q => q.eq("userId", userId).eq("slug", slug))
    .unique();
}
```

Every query filters by userId. Users can only access their own data.

### OAuth Routes

**GET /auth/login**
- Generate WorkOS authorization URL
- Redirect browser to WorkOS

**GET /auth/callback**
- Extract `code` from query
- Call `authenticateWithCode({ code, clientId })`
- Set HttpOnly cookie with accessToken
- Redirect to `/`

**GET /auth/logout**
- Clear accessToken cookie
- Redirect to `/`

**GET /auth/me**
- Return user info from JWT claims

**GET /.well-known/oauth-protected-resource**
- MCP OAuth discovery endpoint (see below)

---

## MCP OAuth Discovery

MCP clients discover authentication via RFC 9728.

### Discovery Endpoint

**GET `/.well-known/oauth-protected-resource`**

```json
{
  "resource": "https://example.com/mcp",
  "authorization_servers": ["https://subdomain.authkit.app"],
  "scopes_supported": ["openid", "profile", "email"]
}
```

### WWW-Authenticate Header

When `/mcp` returns 401:

```
WWW-Authenticate: Bearer resource_metadata="https://example.com/.well-known/oauth-protected-resource", error="missing_token"
```

### WorkOS Configuration

Enable in WorkOS Dashboard → Connect → Configuration:
- **Dynamic Client Registration (DCR)** - For clients without stable URLs
- **Client ID Metadata Document (CIMD)** - For web clients with stable HTTPS URLs

---

## Widget JWT

ChatGPT widgets run in a sandboxed iframe and cannot access cookies. They authenticate API calls using a short-lived JWT (widget JWT) passed via MCP tool response.

### Why Separate JWT

- **Cross-origin**: Widgets run on `*.web-sandbox.oaiusercontent.com`, not same origin
- **No cookies**: Cross-origin requests don't include cookies
- **MCP context**: OAuth token is only on MCP requests, not available to widget JS
- **Short-lived**: 4-hour expiry limits exposure if token is leaked

### Flow

```
1. User invokes MCP tool in ChatGPT
2. MCP receives OAuth-authenticated request (ChatGPT handles this)
3. MCP tool extracts userId from OAuth token
4. MCP tool creates widget JWT (4h expiry) with userId
5. MCP returns JWT in _meta.widgetToken (only widget sees, not model)
6. Widget reads token from window.openai.toolResponseMetadata.widgetToken
7. Widget includes token in API calls: Authorization: Bearer <token>
8. apiAuthMiddleware validates widget JWT, extracts userId
```

### Implementation

**Creating tokens** (`src/lib/auth/widgetJwt.ts`):
```typescript
const token = await createWidgetToken(userId);
// Returns signed JWT with 4h expiry
```

**Verifying tokens**:
```typescript
const result = await verifyWidgetToken(token);
// result: { valid: boolean, payload?: { userId }, error?: string }
```

**Token claims**:
- `userId` - Authenticated user ID
- `iss` - `"promptdb:widget"`
- `exp` - 4 hours from creation
- `iat` - Creation timestamp

### API Auth Middleware

`src/middleware/apiAuth.ts` provides `apiAuthMiddleware` that accepts:

1. **Widget JWT** in `Authorization: Bearer` header (checked first)
2. **Cookie JWT** from WorkOS (fallback)

This allows API routes to serve both web app and ChatGPT widget.

### Environment Variables

| Variable | Purpose |
|----------|---------|
| `WIDGET_JWT_SECRET` | Secret for signing widget JWTs (HS256) |
| `PUBLIC_API_URL` | API URL for widget CSP `connect_domains` |

### Security Considerations

- Widget JWTs are **not WorkOS tokens** - they're signed by our server
- Short expiry (4h) limits window if token leaked
- Token only contains userId, no sensitive data
- Widget sandbox prevents token access from other origins

See [ui-widgets.md](./ui-widgets.md) for full widget architecture.

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  Full browser + MCP flows
                    │  (Playwright) │
                    └───────┬───────┘
                ┌───────────┴───────────┐
                │     Integration       │  API + MCP endpoints
                │       Tests           │  Real WorkOS tokens
                └───────────┬───────────┘
        ┌───────────────────┴───────────────────┐
        │              Unit Tests               │  Middleware, utilities
        └───────────────────────────────────────┘
```

### Unit Tests

- Token extractor extracts from header/cookie correctly
- JWT validator accepts valid tokens, rejects invalid
- JWT decoder extracts claims correctly

### Integration Tests

- API endpoint with valid Bearer → 200
- API endpoint with invalid Bearer → 401
- API endpoint with expired token → 401
- MCP endpoint accepts Bearer token
- User scoping: User A cannot access User B's data

### Token Acquisition for Tests

```typescript
// Real WorkOS token for tests
const { accessToken, user } = await workos.userManagement
  .authenticateWithPassword({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
    clientId: WORKOS_CLIENT_ID
  });
```

---

## Trade-offs

### HttpOnly Cookie vs localStorage

| Chose | Rationale |
|-------|-----------|
| HttpOnly Cookie | XSS cannot exfiltrate token |

**Accepted:** Middleware must check both cookie and Bearer header.

### Stateless vs Session Validation

| Chose | Rationale |
|-------|-----------|
| Stateless JWT validation | ~0ms vs ~60ms per request |

**Accepted:** Session revocation not immediate. Mitigated by token expiry and logout clearing cookie.

### API Key + userId vs JWT Passthrough

| Chose | Rationale |
|-------|-----------|
| API key + userId to Convex | Clean separation: Fastify handles auth, Convex handles data |

**Accepted:** Convex trusts Fastify. If Fastify compromised with API key, can impersonate users (but user scoping limits blast radius).

### jose Library for JWT Validation

| Chose | Rationale |
|-------|-----------|
| jose directly | WorkOS SDK doesn't provide stateless JWT validation |

---

## Future Considerations

### Session Revocation

**Current:** Stateless validation means revoked sessions work until expiry.

**Potential:** Background process polls for revoked sessions, maintains deny list. Request validation checks deny list in addition to JWT signature.

### System Operations Without User Context

**Current:** All Convex operations require userId.

**Options:**
- "System" userId bypassing RLS for internal functions
- Separate internal Convex functions without userId
- WorkOS M2M for scheduled tasks

---

## Appendices

### Environment Variables

**Fastify:**

| Variable | Purpose |
|----------|---------|
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_CLIENT_ID` | WorkOS client ID |
| `WORKOS_REDIRECT_URI` | OAuth callback URL |
| `WORKOS_AUTH_SERVER_URL` | AuthKit URL for MCP discovery |
| `CONVEX_URL` | Convex deployment URL |
| `CONVEX_API_KEY` | API key for Convex |
| `COOKIE_SECRET` | Secret for signing cookies |
| `BASE_URL` | Public URL |
| `MCP_RESOURCE_URL` | MCP resource URL |

**Convex:**

| Variable | Purpose |
|----------|---------|
| `CONVEX_API_KEY` | Current valid API key |
| `CONVEX_API_KEY_PREVIOUS` | Previous key (rotation) |

### Error Responses

| Status | Message | When |
|--------|---------|------|
| 401 | "Not authenticated" | No token |
| 401 | "Invalid token" | Signature failed |
| 401 | "Token expired" | Past exp claim |
| 401 | "Invalid API key" | Convex API key mismatch |

### WorkOS SDK Methods

| Method | Use Case |
|--------|----------|
| `authenticateWithCode()` | OAuth callback |
| `authenticateWithPassword()` | Tests |
| `getUser()` | Fetch profile (~60ms) |

**Note:** JWT validation uses jose library (~0ms after JWKS cached), not WorkOS SDK.

---

*Last updated: January 2025*
