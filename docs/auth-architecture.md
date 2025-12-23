# PromptDB Authentication Architecture

## Overview

This document defines the authentication and authorization architecture for PromptDB. It covers all entry points, token flows, validation strategies, and testing approaches. Authentication is established correctly from the start rather than retrofitted later.

---

## Table of Contents

1. [Why WorkOS](#why-workos)
2. [Design Principles](#design-principles)
3. [Requirements](#requirements)
4. [Problem Space](#problem-space)
5. [Solution Architecture](#solution-architecture)
6. [Token Flows by Entry Point](#token-flows-by-entry-point)
7. [Implementation Details](#implementation-details)
8. [Design Trade-offs](#design-trade-offs)
9. [Testing Strategy](#testing-strategy)
10. [Areas for Future Exploration](#areas-for-future-exploration)

---

## Why WorkOS

### Providers Evaluated

| Provider | Focus | Pricing Model | Notes |
|----------|-------|---------------|-------|
| **WorkOS** | B2B SaaS enterprise features | 1M free MAU, $125/SSO connection | Selected |
| **Clerk** | Modern web apps, React-first | Per-MAU ($0.02 after 10k free) | SSO requires $100/mo add-on, limited backend SDKs |
| **Auth0** | Developer identity platform | Per-MAU, enterprise tiers | Expensive at scale, SSO locked behind enterprise plans |
| **Okta** | Enterprise IAM | Per-user, quote-based | Overkill for SaaS teams, complex, expensive |
| **Keycloak** | Open-source self-hosted | Free (self-hosted) | Requires DevOps overhead, no managed option |

### Decision Rationale

WorkOS was selected for the following reasons:

**B2B SaaS Focus**: WorkOS is built specifically for SaaS companies selling to enterprises. It handles the enterprise features (SSO, SCIM, audit logs) that enterprise customers require without the complexity of full IAM platforms.

**ChatGPT/MCP Integration Path**: PromptDB's primary distribution channel is MCP clients (ChatGPT, Claude). The ChatGPT app store requires us to act as an OAuth provider. WorkOS's architecture supports this - we can wrap WorkOS authentication in our OAuth provider endpoints and return the same JWT format to ChatGPT.

**Pricing Alignment**: 1 million free monthly active users covers M0 through early growth. Enterprise SSO is priced per-connection ($125/month), which aligns with B2B revenue model - we only pay when we have paying enterprise customers.

**Developer Experience**: Clean APIs, good documentation, SDKs for Node.js and other languages. The Admin Portal enables customer IT admins to self-configure SSO without support burden.

**Right-Sized**: Unlike Okta/Auth0, WorkOS doesn't include workforce identity features we don't need. Unlike Clerk, it has proper enterprise SSO support without expensive add-ons.

**JWT-Based**: WorkOS issues standard RS256-signed JWTs that can be validated statelessly via JWKS. This enables our architecture where the same token works across Fastify and Convex.

---

## Design Principles

### Coherence Over Convenience
- Minimal number of token formats and auth patterns
- Same JWT format used across all entry points
- Same validation logic regardless of token transport
- Avoid special cases, shims, or "just for testing" auth paths

### Testability as First-Class Requirement
- All auth paths testable with the same token acquisition method
- No separate "test mode" authentication
- Integration tests and E2E tests use real WorkOS tokens
- Test pyramid covers all layers without auth-specific workarounds

### As Complex as Necessary, No More
OAuth and multi-surface authentication are inherently complex. The goal is a well-constructed solution that handles the actual requirements without introducing unnecessary complexity.

- Follow IETF OAuth browser-based apps specification (BFF pattern)
- HttpOnly cookies for web (XSS protection)
- Bearer tokens for programmatic access (MCP, API, tests)
- Stateless validation where possible (performance)
- Clear upgrade path for additional security measures
- Accept necessary complexity; reject accidental complexity

### Comprehensibility
- Auth flow should be understandable by humans and AI agents
- No hidden magic or implicit behavior
- Explicit token extraction and validation
- Well-documented decision rationale

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Web browser users authenticate via WorkOS OAuth | Must |
| FR2 | MCP clients authenticate via Bearer token (per MCP spec) | Must |
| FR3 | API clients authenticate via Bearer token | Must |
| FR4 | Integration tests use same auth as production | Must |
| FR5 | E2E tests cover both cookie and Bearer paths | Must |
| FR6 | ChatGPT app store OAuth provider flow | Must |
| FR7 | Convex receives and validates user identity | Must |
| FR8 | Logout clears session appropriately | Must |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR1 | Auth validation < 5ms per request (after JWKS cache) | Should |
| NFR2 | No Node.js runtime in Convex (Edge only) | Must |
| NFR3 | Use WorkOS SDK capabilities where available | Should |
| NFR4 | Support future session revocation mechanism | Should |
| NFR5 | Support future per-request permission scoping | Should |
| NFR6 | User-scoped data access at database level | Should |

### Security Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| SR1 | Web tokens not accessible to JavaScript (XSS protection) | Must |
| SR2 | CSRF protection for cookie-based auth | Must |
| SR3 | JWT signature validation on every request | Must |
| SR4 | Token expiry enforcement | Must |
| SR5 | Secure cookie attributes (HttpOnly, Secure, SameSite) | Must |

---

## Problem Space

### Level 1: High-Level Challenges

Multiple entry points need unified authentication:
- Web Browser
- MCP Clients (ChatGPT, Claude, etc.)
- API Calls
- Integration/E2E Tests

Each has different capabilities and constraints. The solution must work for all without special cases.

### Level 2: Entry Point Constraints

| Entry Point | Can Use Cookies? | Can Send Headers? | Token Storage |
|-------------|------------------|-------------------|---------------|
| Web Browser | Yes (automatic) | Yes (manual in JS) | Browser manages |
| MCP Clients | No (spec forbids) | Yes (required) | Client manages |
| ChatGPT | No | Yes (via MCP) | ChatGPT manages |
| API Clients | Unusual | Yes | Client manages |
| Tests | Can inject | Yes | Test code manages |

Cookies are automatic but limited to browsers. Everything else uses Bearer headers. The middleware must support both extraction methods.

### Level 3: Detailed Problem Analysis

#### Problem 3.1: Browser Token Storage

**Options explored:**
- **localStorage**: JavaScript accessible, vulnerable to XSS
- **sessionStorage**: Same XSS risk, lost on tab close
- **HttpOnly Cookie**: Not accessible to JS, browser sends automatically

**Decision**: HttpOnly cookie per IETF OAuth browser-based apps BFF pattern.

**Rationale**: If XSS occurs, attacker cannot exfiltrate token. They can still make requests from the browser context, but cannot steal the token for use elsewhere. This is the accepted security/usability tradeoff per IETF standards.

#### Problem 3.2: MCP Specification Requirements

From MCP Authorization spec (2025):

> MCP client MUST use the Authorization request header field: `Authorization: Bearer <access-token>`
> Access tokens MUST NOT be included in the URI query string

MCP clients will never send cookies. Bearer header is mandatory.

#### Problem 3.3: Convex Runtime Constraints

- Convex functions run on Edge runtime (not Node.js)
- WorkOS SDK requires Node.js
- Cannot use WorkOS SDK in Convex functions

**Solution**: Move all JWT validation to Fastify (Node.js). Convex receives an API key (proves trusted caller) and userId (identifies user for RLS). Convex doesn't need to know about JWTs, WorkOS, or JWKS. This cleanly separates auth (Fastify) from data access (Convex).

#### Problem 3.4: ChatGPT App Store Integration

ChatGPT requires us to be an **OAuth Provider**, not just a consumer:
- ChatGPT authenticates WITH our app
- We must expose OAuth endpoints (authorize, token, discovery)
- We issue tokens TO ChatGPT

**Solution approach**: Our OAuth provider endpoints wrap WorkOS authentication. User authenticates with WorkOS, we return the WorkOS JWT to ChatGPT. ChatGPT stores it and sends it back as Bearer on MCP calls. This approach requires validation during implementation.

**Required endpoints**:
- `/.well-known/oauth-protected-resource` - Discovery endpoint telling ChatGPT where our auth server is
- `/.well-known/openid-configuration` - OIDC discovery listing our endpoints
- `/oauth2/authorize` - Authorization endpoint (redirects to WorkOS)
- `/oauth2/token` - Token exchange (returns WorkOS JWT)

**Note**: Dynamic client registration (`/oauth2/register`) may or may not be required depending on ChatGPT's implementation. This needs verification against actual ChatGPT documentation during implementation.

#### Problem 3.5: Testing Without Special Auth Modes

**Anti-pattern**: Separate "test auth" that bypasses real validation

**Problem**: Tests pass but production breaks

**Solution**:
- Tests use `authenticateWithPassword()` to get real WorkOS JWT
- Same token, same validation path as production
- E2E tests inject cookies in same format as OAuth callback sets

#### Problem 3.6: Per-Request Validation Performance

**Current middleware**: Calls `getUser(userId)` per request (~60ms API call)

**Problem**: 60ms overhead on every authenticated request

**Solution**: Use `isValidJwt()` for stateless validation (~0ms after JWKS cached)

#### Problem 3.7: Refresh Token Handling

WorkOS returns both `accessToken` and `refreshToken` from authentication calls.

**Current approach for M0**:
- Store only the accessToken in the HttpOnly cookie
- When token expires, user must re-authenticate via OAuth flow
- WorkOS tokens have configurable expiry (default is long-lived)

**Rationale**: Refresh token handling adds complexity (background refresh, token rotation, race conditions). For M0, accepting re-authentication on token expiry is simpler and sufficient.

**Future consideration**: If user experience requires seamless session extension, implement refresh token storage and rotation. This would involve:
- Storing refresh token in separate HttpOnly cookie
- Background refresh before access token expires
- Handling concurrent requests during refresh

---

## Solution Architecture

### Token Format: WorkOS JWT

All entry points use WorkOS-issued JWTs:

```
Header: { "alg": "RS256", "typ": "JWT" }
Payload: {
  "sub": "user_01KD3AV9594M4F6S0H8X47DB6P",  // User ID
  "email": "user@example.com",
  "sid": "session_01KD3EWJ8CWMZGV508J3YJVE8J", // Session ID
  "aud": "client_01K45EFEBZEWADFS8TA6TS9X6B",  // Client ID
  "iss": "https://api.workos.com/user_management/client_...",
  "exp": 1234567890,
  "iat": 1234567890
}
Signature: RS256 signed, verifiable via JWKS
```

### Architecture Overview

**Entry Points** (Web Browser, MCP Clients, API Calls, Tests) all converge at **Fastify Middleware**, which:

1. Extracts JWT from Bearer header (preferred) or HttpOnly cookie (fallback)
2. Validates JWT signature via WorkOS SDK's `isValidJwt()` (stateless, uses cached JWKS)
3. Decodes claims to extract userId, email, sessionId
4. Attaches user info to request
5. Calls Convex with API key + userId (not the user's JWT)

**Convex** then:
1. Validates API key (proves request came from trusted Fastify server)
2. Uses userId from request args for row-level security
3. RLS enforces user can only access their own data

**Key design decision:** Fastify is the auth boundary. Convex does not validate JWTs - it trusts Fastify (via API key) and enforces data access via RLS based on the userId passed from Fastify.

### Token Acquisition Flows

#### Flow A: Web Browser OAuth

1. User clicks login in browser
2. Fastify redirects to WorkOS authorization URL
3. User authenticates with WorkOS (email/password, social, etc.)
4. WorkOS redirects back with authorization code
5. Fastify exchanges code for JWT via `authenticateWithCode()`
6. Fastify sets JWT in HttpOnly cookie (Secure, SameSite=Lax)
7. Browser stores cookie automatically
8. Subsequent requests include cookie; middleware extracts and validates

#### Flow B: MCP Client / API / Tests

1. Client obtains JWT (via OAuth provider flow for MCP, or `authenticateWithPassword()` for tests)
2. Client sends requests with `Authorization: Bearer <JWT>` header
3. Middleware extracts JWT from header, validates, proceeds

#### Flow C: ChatGPT App Store OAuth Provider

This flow positions PromptDB as an OAuth provider to ChatGPT:

1. User attempts to use PromptDB in ChatGPT
2. ChatGPT calls our MCP endpoint, receives 401
3. ChatGPT reads `/.well-known/oauth-protected-resource` to find our auth server
4. ChatGPT redirects user to our `/oauth2/authorize`
5. We redirect user to WorkOS for authentication
6. User authenticates with WorkOS
7. WorkOS redirects back to us with code
8. We exchange code for JWT, redirect to ChatGPT with our authorization code
9. ChatGPT calls our `/oauth2/token` endpoint
10. We return the WorkOS JWT to ChatGPT
11. ChatGPT stores it, sends as Bearer on all subsequent MCP calls

**Implementation note**: The exact flow depends on ChatGPT's OAuth implementation details. The above is the expected flow based on MCP spec and OAuth standards. Verify against actual ChatGPT behavior during implementation.

---

## Implementation Details

### Fastify Middleware

The auth middleware performs these steps:

1. **Extract JWT**: Check `Authorization: Bearer <token>` header first. If not present, extract from signed HttpOnly cookie.

2. **Validate JWT**: Use the `jose` library's `jwtVerify()` with WorkOS's JWKS endpoint (`https://api.workos.com/sso/jwks/{clientId}`). This performs stateless validation using cached JWKS (public keys fetched from WorkOS). The `jose` library is used directly rather than WorkOS SDK's internal `isValidJwt()` method, which is not part of the public SDK API.

3. **Decode Claims**: Base64 decode the JWT payload (already validated, just extracting data). Get `sub` (userId), `email`, `sid` (sessionId).

4. **Attach to Request**: Set `request.user = { id, email, sessionId }` and `request.accessToken = token`.

5. **Reject if Invalid**: Return 401 with appropriate error message.

### Cookie Configuration

Two types of signing are involved - understand the difference:

**Cookie Signing (Fastify)**: Fastify signs the cookie value with HMAC using a server secret. This detects tampering - if someone modifies the cookie value, the signature won't match. This is separate from JWT signing.

**JWT Signing (WorkOS)**: The JWT itself is RS256 signed by WorkOS. Convex and our middleware verify this signature using WorkOS's public keys (JWKS).

Cookie attributes:
- `httpOnly: true` - JavaScript cannot access
- `secure: true` (production) - HTTPS only
- `sameSite: 'lax'` - CSRF protection while allowing navigation
- `path: '/'` - Available to all routes
- `signed: true` - Fastify HMAC signature for tamper detection
- `maxAge: 604800` - 7 days (configurable per environment)

### Convex API Key Authentication

Convex does not validate JWTs. Instead, it validates an API key that proves the request came from Fastify.

**API Key Setup:**
- Generate a cryptographically secure random string (32+ bytes, hex encoded)
- Store in environment variables on both Fastify and Convex
- Optional prefix for identification: `pdb_live_...` (production), `pdb_dev_...` (development)

**Validation:**
- Convex function wrapper checks `apiKey` argument against environment variable
- Use constant-time comparison to prevent timing attacks
- Support two keys simultaneously for zero-downtime rotation

**Rotation Process:**
1. Generate new key
2. Set as `CONVEX_API_KEY`, move old to `CONVEX_API_KEY_PREVIOUS`
3. Deploy Convex (now accepts both)
4. Update Fastify with new key, deploy
5. Remove `CONVEX_API_KEY_PREVIOUS`, deploy Convex

**Row-Level Security:**
- All user-scoped tables have `userId` field (WorkOS user ID)
- RLS rules check `args.userId === document.userId`
- Default policy: deny (tables without explicit rules are inaccessible)

### CORS Configuration

For API and MCP calls from different origins:

- Allow `Authorization` header in CORS preflight
- Configure allowed origins based on environment
- MCP clients may come from various origins - consider allowing all origins for `/mcp` endpoint with proper Bearer token validation
- Web app requests use cookies with `credentials: 'include'` - require explicit origin allowlist

---

## Design Trade-offs

### Trade-off 1: HttpOnly Cookie vs localStorage

| Option | Chose | Rationale |
|--------|-------|-----------|
| HttpOnly Cookie | Yes | XSS cannot exfiltrate token |
| localStorage | No | XSS can steal token |

**Accepted limitation**: Middleware must check both cookie and Bearer header.

### Trade-off 2: Stateless vs Session Validation

| Option | Chose | Rationale |
|--------|-------|-----------|
| Stateless JWT validation | Yes | ~0ms vs ~60ms per request |
| Per-request session check | No | Performance, WorkOS API dependency |

**Accepted limitation**: Session revocation not immediate. Mitigated by token expiry, logout clearing cookie, and potential future async session deny list.

### Trade-off 3: API Key + userId vs JWT Passthrough

| Option | Chose | Rationale |
|--------|-------|-----------|
| API key + userId to Convex | Yes | Clean separation: Fastify handles auth, Convex handles data |
| Pass user JWT to Convex | No | Would require Convex to understand JWT/WorkOS |

**Benefits of chosen approach:**
- Convex doesn't need auth.config.ts or JWKS configuration
- Changing auth providers doesn't affect Convex
- RLS based on userId works regardless of how userId was obtained
- Cleaner mental model: auth at edge, data in database

**Accepted limitation:** Convex trusts Fastify. If Fastify is compromised and attacker has API key, they can impersonate any userId. Mitigated by API key security and RLS limiting blast radius to targeted user's data.

### Trade-off 4: jose Library for JWT Validation

| Option | Chose | Rationale |
|--------|-------|-----------|
| jose directly | Yes | WorkOS SDK's `isValidJwt()` is internal/private API, not publicly documented |
| WorkOS SDK `isValidJwt()` | No | Not part of public SDK API; may change without notice |

**Implementation note**: We use `jose` library's `jwtVerify()` with `createRemoteJWKSet()` pointing to WorkOS's JWKS endpoint. This provides the same JWKS caching benefits while using a stable, documented API. Validation includes issuer and audience claims.

---

## Testing Strategy

### Test Pyramid

```
                    ┌───────────────┐
                    │     E2E       │  Full browser + MCP flows
                    │  (Playwright) │  Real tokens, real validation
                    └───────┬───────┘
                            │
                ┌───────────┴───────────┐
                │     Integration       │  API + MCP endpoints
                │       Tests           │  Real WorkOS tokens
                └───────────┬───────────┘
                            │
        ┌───────────────────┴───────────────────┐
        │              Unit Tests               │  Middleware, utilities
        │                                       │  Mock tokens where needed
        └───────────────────────────────────────┘
```

### Test Categories

**Unit Tests**:
- Middleware extracts Bearer token from header
- Middleware extracts token from signed cookie
- Middleware rejects invalid tokens
- Middleware rejects expired tokens
- JWT decode extracts correct claims

**Integration Tests**:
- API endpoint with valid Bearer token returns 200
- API endpoint with invalid Bearer token returns 401
- API endpoint with expired Bearer token returns 401
- MCP endpoint accepts Bearer token and processes request
- Convex receives user identity from token

**E2E Tests**:
- Full OAuth login flow (click login, redirect, authenticate, redirect back)
- Authenticated page access via cookie
- Logout clears session
- MCP protocol flow via Playwright HTTP requests

### Token Acquisition for Tests

Tests use `workos.userManagement.authenticateWithPassword()` to obtain real WorkOS JWTs. This requires test user credentials in environment variables. The returned token is identical in format and validation to production tokens.

### API Key for Convex Tests

Integration tests that call Convex directly (bypassing Fastify) use the same API key as production:
- `CONVEX_API_KEY` environment variable available in test environment
- Tests pass API key + userId to Convex functions
- RLS tests verify user A cannot access user B's data even with valid API key

### E2E Cookie Injection

For E2E browser tests, inject the cookie in Playwright's browser context before navigating. The cookie must be signed the same way Fastify signs it, or tests must use an endpoint that sets the cookie (like completing OAuth flow).

Simpler approach: Have E2E tests complete the actual OAuth flow for at least one test, then use that authenticated session. Or create a test-only endpoint that sets the cookie given valid credentials (only enabled in test environment).

### MCP Flow Testing

Playwright can test MCP endpoints directly using the `request` fixture:
- Obtain token via `authenticateWithPassword()`
- Send POST to `/mcp` with Bearer header and JSON-RPC payload
- Verify response structure and content

### Future: Test Chat Client

For comprehensive OpenAI app store flow testing, build a minimal MCP chat client that:
- Implements MCP protocol
- Handles OAuth provider flow (our authorize/token endpoints)
- Renders widgets
- Connects to an LLM

This enables automated E2E tests covering the full OAuth → MCP → widget → response flow. Deferred to post-M0.

---

## Areas for Future Exploration

These are potential enhancements to consider. None are commitments - they represent directions that may be worth investigating based on how the product evolves.

### Session Revocation via Async Deny List

**Current state**: Stateless validation means revoked sessions work until token expires.

**Potential approach**: Background process polls WorkOS for revoked sessions, maintains local deny list. Request validation checks deny list in addition to JWT signature. Entries expire when the JWT would have expired anyway.

**Open questions**: Where to store deny list (Redis? Convex? In-memory with replication?). How often to poll. Whether the complexity is justified by the threat model.

### User-Scoped Data Access in Convex

**Current state**: User identity available via `ctx.auth.getUserIdentity()`.

**Potential approach**: Enforce user-scoping at data model level - all queries filter by authenticated user's ID. Even if a token is compromised, attacker only accesses that user's data.

**Open questions**: How to handle shared resources (e.g., team prompts). Whether this should be a convention or enforced by a wrapper.

### Per-Request Permission Scoping

**Concept**: Analyze request intent, scope permissions down to minimum needed.

**Example**: GET /api/prompts gets READ-only permissions. POST /api/prompts gets WRITE to prompts only. Malicious code embedded in request cannot escalate.

**Open questions**: Implementation complexity. Whether this adds meaningful security given other controls. How to define "intent" for complex operations.

### System Operations Without User Context

**Current state**: All Convex operations require a userId (passed from Fastify). The API key authenticates Fastify as a trusted caller, but operations are still scoped to a user.

**Future need**: Background jobs, scheduled tasks, admin operations may need to act without user context.

**Options to explore**:
- "System" userId that bypasses RLS for specific internal functions
- Separate Convex functions marked as `internal` that don't require userId
- WorkOS M2M Applications for scheduled tasks originating outside Fastify

**Open questions**: Whether these scenarios arise in PromptDB. Most operations are inherently user-scoped (prompts belong to users). Admin operations may be the exception.

---

## Appendix A: WorkOS SDK Methods

| Method | Use Case | Performance |
|--------|----------|-------------|
| `authenticateWithCode()` | OAuth callback | One-time |
| `authenticateWithPassword()` | Tests, API clients | One-time |
| `isValidJwt()` | Request validation | ~0ms (cached JWKS) |
| `getUser()` | Fetch full user profile | ~60ms (API call) |
| `listSessions()` | Session management | ~80ms (API call) |

## Appendix B: Cookie Attributes Reference

| Attribute | Value | Purpose |
|-----------|-------|---------|
| `httpOnly` | true | Prevent JS access (XSS protection) |
| `secure` | true (prod) | HTTPS only |
| `sameSite` | Lax | CSRF protection while allowing navigation |
| `path` | / | Available to all routes |
| `signed` | true | Fastify HMAC tamper detection |
| `maxAge` | 604800 | 7 days (configurable) |

## Appendix C: Error Responses

**Response Format:**
```json
{ "error": "Error message here" }
```

| Status | Error Message | When |
|--------|---------------|------|
| 401 | "Not authenticated" | No token provided |
| 401 | "Invalid token" | Signature validation failed |
| 401 | "Token expired" | Past exp claim |
| 401 | "Invalid API key" | Convex API key mismatch |
| 403 | "Forbidden" | Valid token, insufficient permissions |

## Appendix D: Environment Variables

### Fastify

| Variable | Purpose |
|----------|---------|
| `WORKOS_API_KEY` | WorkOS API key for SDK calls |
| `WORKOS_CLIENT_ID` | WorkOS client/application ID |
| `WORKOS_REDIRECT_URI` | OAuth callback URL |
| `CONVEX_URL` | Convex deployment URL |
| `CONVEX_API_KEY` | API key for authenticating to Convex |
| `COOKIE_SECRET` | Secret for signing HttpOnly cookies |

### Convex

| Variable | Purpose |
|----------|---------|
| `CONVEX_API_KEY` | Current valid API key (must match Fastify) |
| `CONVEX_API_KEY_PREVIOUS` | Previous key for rotation (optional) |

---

## Document History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-22 | 1.0 | Initial auth architecture |
