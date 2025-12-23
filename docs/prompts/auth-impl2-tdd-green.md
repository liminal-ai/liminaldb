# Auth Implementation Round 2: TDD Green

## Task

Make all tests pass. The skeleton + red phase created stubs and failing tests. Now implement the actual functionality.

## Prerequisites

- Fastify dev server running (`bun run dev`)
- Convex dev server running (`bun run convex:dev`)

## Before Starting

Read these files in parallel:
- `src/lib/auth/jwtValidator.ts` - Jose implementation (verify it's complete)
- `convex/auth/apiKey.ts` - Skeleton has `validateApiKey()` and `withApiKeyAuth()` stubs
- `convex/healthAuth.ts` - Updated with `apiKey: v.string()` and `userId: v.string()` args
- `src/routes/auth.ts` - Logout has auth middleware and session revocation stub
- `src/api/health.ts` - Uses new pattern: `convex.query(api.healthAuth.check, { apiKey, userId })`
- `src/api/mcp.ts` - Same new calling pattern
- `tests/service/convex/convexCalls.test.ts` - Convex integration tests
- `tests/convex/healthAuth.test.ts` - healthAuth unit tests
- `tests/service/auth/routes.test.ts` - Includes logout session tests

Run `bun run test` first to see current failures. Note which tests fail and why.

---

## 1. Verify Jose Implementation

The Jose refactor should already be complete from the red phase. Verify:
- `src/lib/auth/jwtValidator.ts` uses `jose` library
- No more WorkOS SDK private API calls
- Existing tests pass

If not complete, implement per the red phase spec.

---

## 2. Implement API Key Validation

**`convex/auth/apiKey.ts`:**

Implement `validateApiKey(key: string | null | undefined): boolean`:
- Return false if key is null, undefined, or empty string
- Compare against `process.env.CONVEX_API_KEY` using constant-time comparison
- Also check `process.env.CONVEX_API_KEY_PREVIOUS` for key rotation support
- Return true if matches either, false otherwise

For constant-time comparison in Convex (no Node crypto available):
```typescript
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

Implement `withApiKeyAuth<Args extends { apiKey: string }, Result>(handler)`:
- Extract `apiKey` from args
- Call `validateApiKey(apiKey)`
- If invalid, throw `new Error("Invalid API key")`
- If valid, call handler with remaining args (excluding apiKey)

---

## 3. Implement healthAuth with API Key Pattern

**`convex/healthAuth.ts`:**

The red phase should have updated this to accept `apiKey` and `userId` args. Now:
- Call `validateApiKey(args.apiKey)` at the start of handler
- If invalid, throw `new Error("Invalid API key")`
- Return user info based on `args.userId`

Expected response format:
```typescript
{
  status: "ok",
  user: {
    subject: args.userId,
  }
}
```

Note: Fastify files (`src/api/health.ts`, `src/api/mcp.ts`) should already use the new pattern from red phase. Verify they call `convex.query(api.healthAuth.check, { apiKey, userId })`.

---

## 4. Implement Logout Session Revocation

**`src/routes/auth.ts`:**

The logout handler should:
1. Have auth middleware (verify this was added in red phase)
2. Get sessionId from `request.user?.sessionId`
3. If sessionId exists, call WorkOS to revoke:
   ```typescript
   await workos.userManagement.revokeSession({ sessionId });
   ```
4. Wrap in try/catch - log errors but continue
5. Always clear cookie and redirect

Check WorkOS SDK for exact method signature. May be:
- `revokeSession({ sessionId })`
- `deleteSession(sessionId)`
- Check the types/docs

---

## 5. Fix Any Remaining Test Failures

After implementing the above, run `bun run test`.

Common issues to check:
- Mock setup may need updates for new patterns
- Type mismatches between Fastify and Convex
- Logout tests may need auth tokens since logout now requires middleware

---

## Constraints

- **No `any` casts** - Use proper types
- **No test bypasses** - No `NODE_ENV === "test"` in production code
- **Use `bun run test`** - Not `bun test` (env var loading)
- **Don't skip tests** - All tests should pass, not be skipped
- **Match existing patterns** - Follow codebase conventions

---

## Execution Order

1. **Run `bun run test`** - Document current failures
2. **Verify Jose** - Should already work from red phase
3. **Implement `validateApiKey` and `withApiKeyAuth`** in `convex/auth/apiKey.ts`
4. **Run `bun run test`** - Convex tests should now pass
5. **Verify `convex/healthAuth.ts`** - Should already call validateApiKey from red phase
6. **Implement logout session revocation** - Replace stub with actual WorkOS call
7. **Run `bun run test`** - All tests should pass
8. **Run `bun run check`** - All checks should pass

---

## Verification

After green phase:

```bash
bun run check
```

Expected:
- Format: pass
- Lint: pass
- Typecheck: pass
- Tests: **ALL PASS** (0 failures)

If any tests fail, debug and fix. Do not skip tests or mark them as expected failures.

---

## Do NOT

- Skip or disable failing tests
- Add `any` casts to make types work
- Add test-only code paths in production
- Leave "Not implemented" stubs
- Change test expectations to match broken implementation
- Use `bun test` instead of `bun run test`
