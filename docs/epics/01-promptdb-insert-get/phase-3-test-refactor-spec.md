# Phase 3: Test Framework Refactor

## Overview

Migrate from Bun's built-in test runner to Vitest with projects-based configuration.

## Goals

1. **Migrate to Vitest** - Better ecosystem, watch mode, coverage
2. **Project-based configuration** - Different configs for different test types
3. **Named collections via CLI** - Smoke, regression via patterns, not projects

---

## Current State

**Test Runner:** Bun's built-in test runner (`bun test`)

**Test Count:** 199 tests across 38 files

**Directory Structure:**

```text
tests/
├── fixtures/      # Shared test utilities (4 files)
├── service/       # Fastify handlers, MCP tools (13 files)
├── convex/        # Convex model functions (10 files)
└── integration/   # Full HTTP to staging (11 files)
```

**Current Scripts:**
- `test:service` runs `tests/service` + `tests/convex`
- `test:integration` runs `tests/integration`

---

## Target State

### Vitest Projects

Projects exist for **configuration differences**, not for grouping.

| Project | Includes | Config |
|---------|----------|--------|
| `service` | `tests/service/**`, `tests/convex/**` | Node, default timeout |
| `integration` | `tests/integration/**` | Node, 30s timeout, env vars loaded |

### Named Collections

Named collections (smoke, regression) are **CLI patterns**, not projects. This avoids duplicate test runs.

```bash
# Run smoke tests (hand-picked files)
vitest tests/service/auth/*.test.ts tests/integration/prompts-api.test.ts

# Run all backend tests
vitest --project service

# Run deployment validation
vitest --project integration
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    env: loadEnv(mode, process.cwd(), ''),
    projects: [
      {
        extends: true,
        test: {
          name: 'service',
          include: ['tests/service/**/*.test.ts', 'tests/convex/**/*.test.ts'],
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: 30000,
        }
      },
    ]
  }
}))
```

### Package Scripts

```json
{
  "test": "vitest",
  "test:service": "vitest --project service",
  "test:integration": "vitest --project integration",
  "test:smoke": "vitest tests/service/auth/*.test.ts tests/integration/prompts-api.test.ts"
}
```

---

## Migration Steps

### 1. Install Vitest

```bash
bun add -d vitest @vitest/coverage-v8
```

### 2. Create vitest.config.ts

Create config per Target State section above.

### 3. Update Fixtures

Update all 4 files in `tests/fixtures/`:

**Import changes:**

```typescript
// Before
import { mock, type Mock } from 'bun:test'

// After
import { vi, type MockInstance } from 'vitest'
```

**Function changes:**

```typescript
// Before (Bun)
const mockFn = mock(() => Promise.resolve([]))

// After (Vitest)
const mockFn = vi.fn(() => Promise.resolve([]))
```

**Type changes:**

```typescript
// Before (Bun)
interface MockReplyType {
  code: Mock<(status: number) => MockReplyType>
}

// After (Vitest)
interface MockReplyType {
  code: MockInstance<(status: number) => MockReplyType>
}
```

### 4. Update Test Files

All 34 test files need changes.

**Import changes:**

```typescript
// Before
import { describe, test, expect, mock, beforeAll, beforeEach, afterEach, spyOn } from 'bun:test'

// After
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
```

**mock() → vi.fn():**

```typescript
// Before (Bun)
const mockFn = mock(() => value)

// After (Vitest)
const mockFn = vi.fn(() => value)
```

**spyOn() → vi.spyOn():**

```typescript
// Before (Bun)
const consoleSpy = spyOn(console, 'error').mockImplementation(() => {})

// After (Vitest)
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
```

**mock.module() → vi.mock() with vi.hoisted():**

```typescript
// Before (Bun) - dynamic import required
const mockConvex = createMockConvexClient();
mock.module("../src/lib/convex", () => ({ convex: mockConvex }));
const { registerPromptRoutes } = await import("../src/routes/prompts");

// After (Vitest) - static import works due to hoisting
const mockConvex = vi.hoisted(() => createMockConvexClient());
vi.mock("../src/lib/convex", () => ({ convex: mockConvex }));
import { registerPromptRoutes } from "../src/routes/prompts";
```

**Note:** Vitest hoists `vi.mock()` calls to the top of the file. This means `await import()` patterns used after `mock.module()` can be converted to static imports.

### 5. Verify Tests Pass

```bash
bun run test
```

### 6. Update CI

CI runs `bun run test:service`. Scripts handle the change - no workflow edits needed.

---

## Files Requiring Migration

**Fixtures (4):**
- `tests/fixtures/mockConvexClient.ts`
- `tests/fixtures/mockConvexCtx.ts`
- `tests/fixtures/mockWorkos.ts`
- `tests/fixtures/mockReply.ts`

**Service tests (13):**
- `tests/service/auth/mcp.test.ts`
- `tests/service/auth/middleware.test.ts`
- `tests/service/auth/routes.test.ts`
- `tests/service/mcp/auth-challenge.test.ts`
- `tests/service/mcp/resources.test.ts`
- `tests/service/mcp/tools.test.ts`
- `tests/service/mcp/well-known.test.ts`
- `tests/service/mcp/toolHandlers.test.ts`
- `tests/service/prompts/createPrompts.test.ts`
- `tests/service/prompts/deletePrompt.test.ts`
- `tests/service/prompts/getPrompt.test.ts`
- `tests/service/prompts/mcpTools.test.ts`
- `tests/service/prompts/edgeCases.test.ts`

**Convex tests (10):**
- `tests/convex/auth/apiKey.test.ts`
- `tests/convex/auth/rls.test.ts`
- `tests/convex/healthAuth.test.ts`
- `tests/convex/limitsSync.test.ts`
- `tests/convex/prompts/deleteBySlug.test.ts`
- `tests/convex/prompts/findOrCreateTag.test.ts`
- `tests/convex/prompts/getPromptBySlug.test.ts`
- `tests/convex/prompts/insertPrompts.test.ts`
- `tests/convex/prompts/slugExists.test.ts`
- `tests/convex/prompts/validation.test.ts`

**Integration tests (11):**
- `tests/integration/auth-api.test.ts`
- `tests/integration/auth-cookie.test.ts`
- `tests/integration/auth-mcp.test.ts`
- `tests/integration/convex.test.ts`
- `tests/integration/health.test.ts`
- `tests/integration/healthAuth.test.ts`
- `tests/integration/mcp-oauth.test.ts`
- `tests/integration/mcp.test.ts`
- `tests/integration/prompts-api.test.ts`
- `tests/integration/convex/convexCalls.test.ts`
- `tests/integration/convex/prompts.test.ts`

---

## Dependencies

```json
{
  "devDependencies": {
    "vitest": "^3.2.0",
    "@vitest/coverage-v8": "^3.2.0"
  }
}
```

---

## Success Criteria

1. All 199 tests pass with Vitest
2. `vitest --project service` runs service + convex tests
3. `vitest --project integration` runs integration tests
4. Watch mode works: `vitest --watch`
5. CI passes unchanged

---

## Future Considerations (Not In Scope)

**Frontend testing:** When UI grows beyond static HTML, add `ui` project with happy-dom environment.

**Browser E2E:** OAuth providers block automated browsers. If needed, use agent-assisted testing (Claude Chrome extension) for semi-supervised flows. Not Playwright.

**Widget HTML testing:** MCP widget responses can be tested via integration tests - fetch + HTML structure assertions. No browser needed.
