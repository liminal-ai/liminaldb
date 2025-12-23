# Auth Implementation Round 2: Skeleton + TDD Red

## Task

Complete auth architecture standup with four changes:
1. **Jose refactor** - Replace WorkOS private API with `jose` for JWT validation (this is a refactor - implement fully, no new tests)
2. **API key + userId for Convex** - Change Fastify→Convex auth pattern (skeleton + new tests)
3. **Hardcoded client ID** - Fix config to use env var (simple fix)
4. **Logout session revocation** - Add WorkOS session termination (skeleton + new tests)

## Before Starting

Read these files in parallel to understand current state:
- `src/lib/auth/jwtValidator.ts` - Current JWT validation (uses private WorkOS API)
- `src/lib/convex.ts` - Current Convex client setup
- `src/api/health.ts` - Example of current Convex calling pattern
- `src/api/mcp.ts` - Another Convex calling example
- `convex/auth.config.ts` - Hardcoded client ID here
- `convex/healthAuth.ts` - Uses `ctx.auth.getUserIdentity()`
- `convex/auth/apiKey.ts` - Existing API key validation skeleton
- `src/routes/auth.ts` - Logout handler (lines 92-98) - NOTE: no auth middleware currently
- `tests/service/auth/routes.test.ts` - Existing logout tests
- `docs/auth-architecture.md` - Architecture decisions, especially API key + userId pattern

## Environment Variables

Verify these exist in `.env.local`:
- `WORKOS_CLIENT_ID` - Required for Jose JWKS URL
- `WORKOS_API_KEY` - Required for WorkOS SDK
- `CONVEX_API_KEY` - Required for Fastify→Convex auth (if missing, generate with `openssl rand -hex 32` and add)
- `CONVEX_URL` - Convex backend URL

---

## 1. Jose JWT Validation (Refactor - Full Implementation)

### Why
`workos.userManagement.isValidJwt()` is undocumented/private. WorkOS recommends `jose` library with their JWKS endpoint.

### Changes

**Add dependency:**
```bash
bun add jose
```

**`src/lib/auth/jwtValidator.ts`:**
- Remove the `UserManagementWithJwtValidation` interface hack
- Import `jwtVerify`, `createRemoteJWKSet` from `jose`
- Create JWKS from `https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`
- Validate with `jwtVerify(token, jwks, { issuer: [...] })`
- Accept both WorkOS issuers in the issuer array:
  - `https://api.workos.com/`
  - `https://api.workos.com/user_management/${clientId}`
- Keep same function signature: `validateJwt(token: string): Promise<JwtValidationResult>`
- Handle jose errors and map to our error format:
  - `JWTExpired` → `{ valid: false, error: "Token expired" }`
  - Other errors → `{ valid: false, error: "Invalid token" }`

### Tests
No new tests needed. Interface unchanged. Existing service tests mock `validateJwt` at module level.

**After completing this section:** Run `bun run test` - all existing tests should still pass.

---

## 2. API Key + UserId for Convex (Skeleton + New Tests)

### Why
Architecture decision: Fastify handles all JWT validation. Convex receives API key (proves caller is trusted backend) + userId (identifies user for RLS). Convex no longer validates JWTs directly.

### How It Works
Convex functions receive arguments. The apiKey and userId are passed as part of the args object:
```typescript
// Fastify calls Convex like this:
await convex.query(api.healthAuth.check, {
  apiKey: process.env.CONVEX_API_KEY,
  userId: request.user.id
});
```

### Fastify Changes

**`src/lib/convex.ts`:**
- Keep `convex` (unauthenticated client) for making calls
- Remove or deprecate `createAuthenticatedClient()`
- No new helper functions needed - callers pass apiKey + userId directly in args

**`src/api/health.ts`:**
- Change authenticated health endpoint (`/api/health`)
- Instead of `createAuthenticatedClient(request.accessToken).query(...)`:
  ```typescript
  await convex.query(api.healthAuth.check, {
    apiKey: process.env.CONVEX_API_KEY!,
    userId: request.user!.id
  });
  ```

**`src/api/mcp.ts`:**
- Same pattern change for `/mcp/tools` endpoint Convex call

### Convex Changes

**`convex/auth.config.ts`:**
- Empty the providers array: `providers: []`
- Convex no longer validates JWTs
- Keep the file (may be needed later), but with empty config

**`convex/healthAuth.ts`:**
- Add `apiKey: v.string()` and `userId: v.string()` to args schema
- Use `withApiKeyAuth` wrapper from `convex/auth/apiKey.ts`
- Remove `ctx.auth.getUserIdentity()` - get userId from args instead
- Return userId from args in response

**`convex/auth/apiKey.ts`:**
- Already has skeleton for `validateApiKey()` and `withApiKeyAuth()`
- For skeleton phase: ensure stubs throw "Not implemented"
- Full implementation happens in green phase

### New Tests

**Create directory:** `tests/service/convex/` (doesn't exist yet)

**`tests/service/convex/convexCalls.test.ts` (create):**
```typescript
describe("Convex API Key Auth", () => {
  test("healthAuth.check accepts valid apiKey and userId", async () => {
    // Call with valid apiKey + userId
    // Expect success response with userId
  });

  test("healthAuth.check rejects invalid apiKey", async () => {
    // Call with wrong apiKey
    // Expect error
  });

  test("healthAuth.check rejects missing apiKey", async () => {
    // Call without apiKey
    // Expect error
  });

  test("healthAuth.check rejects missing userId", async () => {
    // Call without userId
    // Expect error
  });
});
```

**`tests/convex/healthAuth.test.ts` (create):**
- Test that withApiKeyAuth wrapper validates key
- Test that userId from args is returned (not from JWT identity)

### Impact on Existing Tests

**Integration tests will fail during skeleton phase.** Tests like `tests/integration/auth-api.test.ts` hit `/api/health` which calls Convex. Once we change the calling pattern, they'll fail until green phase completes the implementation. This is expected.

---

## 3. Hardcoded Client ID (Simple Fix)

**`convex/auth.config.ts` line 1:**

Current: `const clientId = "client_01K45EFEBZEWADFS8TA6TS9X6B";`

Change to:
```typescript
const clientId = process.env.WORKOS_CLIENT_ID;
if (!clientId) {
  throw new Error("WORKOS_CLIENT_ID environment variable required");
}
```

Note: Since providers array will be empty per item 2, this is mostly for future use. Still fix it.

No tests needed.

---

## 4. Logout Session Revocation (Skeleton + New Tests)

### Why
Current logout only clears browser cookie. WorkOS session stays active server-side. Should fully terminate.

### Current State Problem
The logout route at line 9 of `src/routes/auth.ts` has NO auth middleware:
```typescript
fastify.get("/auth/logout", logoutHandler);
```

So `request.user` won't exist. Need to either:
1. Add auth middleware to logout route, OR
2. Decode the cookie directly in logout handler to get sessionId

**Recommended: Add auth middleware** - keeps pattern consistent with other authenticated routes.

### Changes

**`src/routes/auth.ts`:**

1. Add auth middleware to logout route:
```typescript
fastify.get("/auth/logout", { preHandler: authMiddleware }, logoutHandler);
```

2. Update `logoutHandler`:
- Get sessionId from `request.user?.sessionId`
- Call WorkOS to revoke session before clearing cookie
- Check WorkOS SDK for method: `workos.userManagement.revokeSession({ sessionId })` or similar
- Wrap WorkOS call in try/catch - log errors but don't block logout
- Always clear cookie and redirect, even if revocation fails

### New Tests

**`tests/service/auth/routes.test.ts`:**

Add these tests:
- "revokes WorkOS session on logout" - mock WorkOS, verify `revokeSession` called with correct sessionId
- "clears cookie even if session revocation fails" - mock WorkOS to throw, verify cookie still cleared and redirect happens
- "handles logout without sessionId gracefully" - user exists but no sessionId, should not error

---

## Constraints

- **No `any` casts** - Use proper types from jose, Convex, etc.
- **No test bypasses** - Don't add `NODE_ENV === "test"` special cases in production code
- **Follow existing patterns** - Match code style, error handling, naming conventions
- **Use `bun run test` not `bun test`** - The script loads env vars correctly
- **Don't revert unrelated changes** - If you see uncommitted changes in files, leave them

---

## Execution Order

1. **Add jose dependency:** `bun add jose`
2. **Implement Jose refactor** (item 1) - full implementation
3. **Run `bun run test`** - verify existing tests still pass
4. **Create test directory:** `mkdir -p tests/service/convex`
5. **Create new test files** (TDD red):
   - `tests/service/convex/convexCalls.test.ts`
   - `tests/convex/healthAuth.test.ts`
   - Add logout session tests to `tests/service/auth/routes.test.ts`
6. **Create/update skeletons:**
   - Update `src/lib/convex.ts` - remove/deprecate `createAuthenticatedClient`
   - Update `src/api/health.ts` - change to new calling pattern (will fail until Convex side done)
   - Update `src/api/mcp.ts` - same pattern change
   - Update `convex/auth.config.ts` - empty providers, fix hardcoded client ID
   - Update `convex/healthAuth.ts` - add apiKey + userId args, use wrapper
   - Update `src/routes/auth.ts` - add auth middleware to logout, add revocation stub
7. **Run `bun run check`**

---

## Verification

After skeleton + red phase:

```bash
bun run check
```

Expected:
- Format: pass
- Lint: pass
- Typecheck: pass
- Tests: **failures expected**
  - New tests fail with "Not implemented"
  - Integration tests fail due to Convex calling pattern change
  - Jose refactor tests should pass (it's fully implemented)

**Document:** List which tests fail and why. New test failures = expected (red phase). Integration test failures = expected (will fix in green phase).

---

## Do NOT

- Add broad try/catch blocks that swallow errors
- Create test-only code paths in production files
- Leave `any` casts - use proper types
- Use `bun test` (doesn't load env vars) - use `bun run test`
- Implement beyond skeleton for items 2 and 4 - just stubs and types
- Change unrelated code or "improve" things not in scope
- Skip running tests between changes
