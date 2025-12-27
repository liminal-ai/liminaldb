# Phase 3: Test Framework Refactor

## Overview

Migrate from Bun's built-in test runner to Vitest with projects-based configuration.

## Goals

1. **Migrate to Vitest** - Better ecosystem support, watch mode, coverage, and projects feature
2. **Flexible project configuration** - Run any slice of tests with a single command
3. **Prepare for named groups** - Smoke and critical test collections

## Current State

### Test Runner
- Bun's built-in test runner (`bun test`)
- 199 tests across 3 directories: `service`, `convex`, `integration`

### Directory Structure
```
tests/
├── service/           # External dependencies mocked (Convex client)
│   ├── auth/
│   ├── mcp/
│   └── prompts/
├── convex/            # ctx.db mocked, tests model functions directly
│   ├── auth/
│   └── prompts/
└── integration/       # No mocks, real HTTP fetch to staging
    └── convex/
```

### Package Scripts
```json
{
  "test": "bun test --env-file .env.local",
  "test:service": "bun test --env-file .env.local tests/service tests/convex",
  "test:convex": "bun test --env-file .env.local tests/convex",
  "test:integration": "bun test --env-file .env.local tests/integration"
}
```

---

## Target State

### Test Categories

| Category | Description | Mocking |
|----------|-------------|---------|
| `service` | Tests Fastify handlers, MCP tools | Convex client mocked |
| `convex` | Tests Convex model functions | ctx.db mocked |
| `integration` | Full HTTP round-trip to staging | Nothing mocked |

### Named Groups (Cross-cutting)

| Group | Purpose | Run Frequency |
|-------|---------|---------------|
| `smoke` | Quick sanity check, <30s total | Every commit |
| `critical` | Must-pass for deployment | Pre-deploy |

### File Naming Convention

Tests can include group suffixes for cross-cutting collections:

```
tests/
├── service/
│   ├── prompts/
│   │   ├── createPrompts.test.ts           # Standard test
│   │   ├── createPrompts.smoke.test.ts     # Also in smoke group
│   │   └── edgeCases.test.ts
│   └── mcp/
│       └── tools.test.ts
├── convex/
│   └── prompts/
│       ├── insertPrompts.test.ts
│       └── insertPrompts.critical.test.ts  # Also in critical group
└── integration/
    ├── prompts-api.test.ts
    └── prompts-api.critical.test.ts        # Also in critical group
```

### Vitest Projects Configuration

```typescript
// vitest.config.ts
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => ({
  test: {
    // Load all env vars from .env.local (empty prefix = all vars)
    env: loadEnv(mode, process.cwd(), ''),

    projects: [
      // ============================================
      // BY DIRECTORY
      // ============================================
      {
        extends: true,
        test: {
          name: 'service',
          include: ['tests/service/**/*.test.ts'],
          exclude: ['**/*.smoke.test.ts', '**/*.critical.test.ts'],
          environment: 'node',
        }
      },
      {
        extends: true,
        test: {
          name: 'convex',
          include: ['tests/convex/**/*.test.ts'],
          exclude: ['**/*.smoke.test.ts', '**/*.critical.test.ts'],
          environment: 'node',
        }
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['**/*.smoke.test.ts', '**/*.critical.test.ts'],
          environment: 'node',
          testTimeout: 30000,
        }
      },

      // ============================================
      // NAMED GROUPS (cross-cutting)
      // ============================================
      {
        extends: true,
        test: {
          name: 'smoke',
          include: ['**/*.smoke.test.ts'],
          environment: 'node',
        }
      },
      {
        extends: true,
        test: {
          name: 'critical',
          include: ['**/*.critical.test.ts'],
          environment: 'node',
        }
      },
    ]
  }
}))
```

### Package Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:coverage": "vitest run --coverage",

    "test:service": "vitest --project service",
    "test:convex": "vitest --project convex",
    "test:integration": "vitest --project integration",

    "test:smoke": "vitest --project smoke",
    "test:critical": "vitest --project critical",

    "test:backend": "vitest --project service --project convex",
    "test:all": "vitest run"
  }
}
```

---

## Migration Plan

### Phase 3.1: Install Vitest

```bash
bun add -d vitest @vitest/coverage-v8
```

### Phase 3.2: Create vitest.config.ts

Create config with projects mapped to current test directories.

### Phase 3.3: Update Test Files

All 34 test files need import changes:

```typescript
// Before (Bun)
import { describe, test, expect, mock, beforeAll, spyOn } from 'bun:test'

// After (Vitest)
import { describe, test, expect, vi, beforeAll } from 'vitest'

// mock() → vi.fn()
// mock.module() → vi.mock() with vi.hoisted() for variables
// spyOn() → vi.spyOn()
```

For `mock.module()` patterns that reference variables:

```typescript
// Before (Bun)
const mockConvex = createMockConvexClient();
mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

// After (Vitest) - use vi.hoisted() for the variable
const mockConvex = vi.hoisted(() => createMockConvexClient());
vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));
```

### Phase 3.4: Update Fixtures

All fixture files in `tests/fixtures/` need the same import changes.

### Phase 3.5: Verify All Tests Pass

```bash
bun run test:all
```

### Phase 3.6: Update CI

CI workflow runs `bun run test:service` which will now call vitest. No workflow changes needed - scripts handle the change.

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

1. All 199 existing tests pass with Vitest
2. Can run by project: `vitest --project service`
3. Coverage report works: `vitest run --coverage`
4. Watch mode works: `vitest --watch`
5. CI passes with new scripts

---

## References

- [Vitest Projects Documentation](https://vitest.dev/guide/projects)
- [Vitest Environment Variables](https://vitest.dev/guide/features.html#environment-variables)
