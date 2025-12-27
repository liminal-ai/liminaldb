# Phase 3: Test Framework Refactor

## Overview

Migrate from Bun's built-in test runner to Vitest and establish a comprehensive, multi-dimensional test organization that supports flexible groupings across test types, application tiers, and named collections.

## Goals

1. **Migrate to Vitest** - Better ecosystem support, watch mode, coverage, and projects feature
2. **Multi-dimensional test taxonomy** - Classify tests by mock level, tier, and named groups
3. **Flexible project configuration** - Run any slice of tests with a single command
4. **Prepare for frontend** - Establish patterns for UI component and E2E testing
5. **Minimal test file changes** - Vitest API is largely compatible with Bun test

## Current State

### Test Runner
- Bun's built-in test runner (`bun test`)
- 199 tests across 3 categories: `service`, `convex`, `integration`

### Directory Structure
```
tests/
├── service/           # Isolated mocks (Convex client mocked)
│   ├── auth/
│   ├── mcp/
│   └── prompts/
├── convex/            # Real Convex local backend
│   ├── auth/
│   └── prompts/
└── integration/       # Real staging environment
    └── convex/
```

### Package Scripts
```json
{
  "test": "bun test --env-file .env.local",
  "test:unit": "bun test --env-file .env.local tests/unit",
  "test:service": "bun test --env-file .env.local tests/service tests/convex",
  "test:convex": "bun test --env-file .env.local tests/convex",
  "test:integration": "bun test --env-file .env.local tests/integration"
}
```

---

## Target State

### Test Taxonomy

Tests are classified across three dimensions that can be combined:

#### Dimension 1: Mock Level (Test Fidelity)

| Level | Description | Speed | Confidence |
|-------|-------------|-------|------------|
| `isolated` | Full mocks, no real dependencies | Fast | Lower |
| `integrated` | Real Convex local, mocked externals | Medium | Medium |
| `wide` | Real services, staging environment | Slow | High |

**Current Mapping:**
- `tests/service/**` → `isolated`
- `tests/convex/**` → `integrated`
- `tests/integration/**` → `wide`

#### Dimension 2: Application Tier

| Tier | Description |
|------|-------------|
| `api` | REST routes, HTTP handlers |
| `mcp` | MCP tools, transport, resources |
| `convex` | Database functions, model layer |
| `ui` | Frontend components (future) |

#### Dimension 3: Named Groups (Cross-cutting)

| Group | Purpose | Run Frequency |
|-------|---------|---------------|
| `smoke` | Quick sanity check, <30s total | Every commit |
| `regression` | Full comprehensive suite | Pre-merge |
| `critical` | Must-pass for deployment | Pre-deploy |

### File Naming Convention

To enable flexible glob matching, tests can include group suffixes:

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
├── integration/
│   ├── prompts-api.test.ts
│   └── prompts-api.critical.test.ts        # Also in critical group
└── ui/                                      # Future
    ├── components/
    │   └── PromptList.test.tsx
    └── e2e/
        └── create-prompt.e2e.test.ts
```

### Vitest Projects Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Global settings
    globals: true,

    projects: [
      // ============================================
      // BACKEND: By Mock Level
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
          testTimeout: 30000, // Integration tests need more time
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

      // ============================================
      // FRONTEND (future)
      // ============================================
      {
        extends: true,
        test: {
          name: 'ui-unit',
          include: ['tests/ui/components/**/*.test.{ts,tsx}'],
          exclude: ['**/*.browser.test.{ts,tsx}'],
          environment: 'happy-dom',
          setupFiles: ['./tests/ui/setup.ts'],
        }
      },
      {
        extends: true,
        test: {
          name: 'ui-browser',
          include: ['tests/ui/**/*.browser.test.{ts,tsx}'],
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
        }
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['tests/ui/e2e/**/*.e2e.test.ts'],
          browser: {
            enabled: true,
            provider: 'playwright',
            instances: [{ browser: 'chromium' }],
          },
          testTimeout: 60000,
        }
      },
    ]
  }
})
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
    "test:regression": "vitest run",

    "test:ui": "vitest --project ui-unit",
    "test:ui:browser": "vitest --project ui-browser",
    "test:e2e": "vitest --project e2e",

    "test:backend": "vitest --project service --project convex",
    "test:all": "vitest run"
  }
}
```

---

## Frontend Testing Strategy

### The Testing Trophy Model

```
          ┌──────────────┐
          │     E2E      │  Critical user journeys only
          ├──────────────┤
          │  Integration │  API + component integration
          ├──────────────┤
          │  Component   │  ← "Service mocks" for frontend
          ├──────────────┤
          │    Static    │  TypeScript, Biome
          └──────────────┘
```

### Component Testing: The Frontend "Service Mocks"

Just as backend service tests mock Convex and test handler logic in isolation, frontend component tests should:

- Mock API calls (MSW or vi.mock)
- Render components in isolation
- Test user interactions and state changes
- Run fast with happy-dom

### Recommended Stack

| Layer | Tool | Environment | Speed | Purpose |
|-------|------|-------------|-------|---------|
| Static | TypeScript + Biome | Node | Instant | Catch type errors |
| Component | Vitest + Testing Library | happy-dom | ~1s | TDD, logic testing |
| Visual | Vitest Browser Mode | Playwright | ~5s | CSS, layout issues |
| E2E | Playwright | Real browser | ~30s+ | Critical paths |

### Component Test Example

```typescript
// tests/ui/components/PromptList.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { PromptList } from '@/components/PromptList'

// Mock API layer
vi.mock('@/api/prompts', () => ({
  fetchPrompts: vi.fn().mockResolvedValue([
    { slug: 'test-1', name: 'Test Prompt', tags: ['api'] }
  ])
}))

describe('PromptList', () => {
  it('renders prompts from API', async () => {
    render(<PromptList />)

    // Wait for async data
    expect(await screen.findByText('Test Prompt')).toBeInTheDocument()
    expect(screen.getByText('api')).toBeInTheDocument()
  })

  it('handles delete action', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(<PromptList onDelete={onDelete} />)

    const deleteBtn = await screen.findByRole('button', { name: /delete/i })
    await user.click(deleteBtn)

    expect(onDelete).toHaveBeenCalledWith('test-1')
  })
})
```

### Visual Regression Test Example

```typescript
// tests/ui/components/PromptCard.browser.test.tsx
import { render } from 'vitest-browser-react'
import { page, expect } from '@vitest/browser/context'
import { PromptCard } from '@/components/PromptCard'

describe('PromptCard Visual', () => {
  it('renders correctly', async () => {
    render(<PromptCard prompt={{ slug: 'test', name: 'Test', tags: [] }} />)

    await expect.element(page.getByText('Test')).toBeVisible()
    await expect(page.screenshot()).toMatchSnapshot()
  })
})
```

### E2E Test Example

```typescript
// tests/ui/e2e/create-prompt.e2e.test.ts
import { test, expect } from 'vitest'
import { page } from '@vitest/browser/context'

test('user can create and view a prompt', async () => {
  // Login
  await page.goto('/login')
  await page.getByLabel('Email').fill('test@example.com')
  await page.getByLabel('Password').fill('password')
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Navigate to create
  await page.getByRole('link', { name: 'New Prompt' }).click()

  // Fill form
  await page.getByLabel('Name').fill('E2E Test Prompt')
  await page.getByLabel('Slug').fill('e2e-test-prompt')
  await page.getByLabel('Content').fill('Test content')
  await page.getByRole('button', { name: 'Create' }).click()

  // Verify created
  await expect(page.getByText('E2E Test Prompt')).toBeVisible()
})
```

---

## Migration Plan

### Phase 3.1: Install Vitest

```bash
# Remove bun test reliance (keep bun as runtime)
# Install Vitest and dependencies
bun add -d vitest @vitest/coverage-v8
```

### Phase 3.2: Create vitest.config.ts

Create initial config with current test structure mapped to projects.

### Phase 3.3: Update Test Files

Vitest API is mostly compatible. Main changes:

```typescript
// Before (Bun)
import { describe, test, expect, mock, beforeAll } from 'bun:test'

// After (Vitest)
import { describe, test, expect, vi, beforeAll } from 'vitest'

// mock() → vi.fn()
// mock.module() → vi.mock()
```

### Phase 3.4: Add Smoke/Critical Tags

Identify and tag critical tests:

1. **Smoke tests** (~10 tests, <30s)
   - Health endpoint returns 200
   - Auth middleware rejects invalid token
   - Can create a prompt (service mock)
   - Can retrieve a prompt (service mock)

2. **Critical tests** (~20 tests)
   - Full CRUD round-trip (integration)
   - Auth flow with real WorkOS
   - MCP tool invocation with auth
   - Duplicate slug rejection

### Phase 3.5: Update CI

```yaml
# .github/workflows/ci.yml
jobs:
  test:
    steps:
      - name: Smoke Tests
        run: bun run test:smoke

      - name: Full Test Suite
        run: bun run test:regression

  deploy:
    needs: test
    steps:
      - name: Critical Tests
        run: bun run test:critical
```

### Phase 3.6: Prepare Frontend (Stub)

Create placeholder structure for future UI tests:

```
tests/ui/
├── setup.ts              # Testing library setup
├── components/
│   └── .gitkeep
└── e2e/
    └── .gitkeep
```

---

## Dependencies

```json
{
  "devDependencies": {
    "vitest": "^3.2.0",
    "@vitest/coverage-v8": "^3.2.0",
    "@vitest/browser": "^3.2.0",           // For browser tests (future)
    "vitest-browser-react": "^0.1.0",       // For React browser tests (future)
    "@testing-library/react": "^16.0.0",    // For component tests (future)
    "@testing-library/user-event": "^14.0.0", // For user interactions (future)
    "happy-dom": "^17.0.0",                 // Fast DOM simulation (future)
    "playwright": "^1.50.0"                 // Browser provider (future)
  }
}
```

**Note:** Only `vitest` and `@vitest/coverage-v8` needed initially. Frontend dependencies added when UI work begins.

---

## Success Criteria

1. **All 199 existing tests pass** with Vitest
2. **Can run by project**: `vitest --project service`
3. **Can run by group**: `vitest --project smoke`
4. **Coverage report** works: `vitest run --coverage`
5. **Watch mode** works: `vitest --watch`
6. **CI updated** to use new scripts
7. **Documentation** updated with new commands

---

## Open Questions

1. **happy-dom vs jsdom**: happy-dom is faster but less complete. For React with complex DOM needs, jsdom may be safer. Decision deferred to UI phase.

2. **Visual regression scope**: Test every component state, or just key UI states? Start minimal and expand based on regression frequency.

3. **E2E critical paths**: What user journeys must pass before deploy?
   - Login → Dashboard
   - Create Prompt → View Prompt → Delete Prompt
   - MCP connection flow (if applicable)

4. **Storybook**: Consider adding for component development and visual testing integration. Deferred to UI phase.

---

## References

- [Vitest Projects Documentation](https://vitest.dev/guide/projects)
- [Vitest Browser Mode](https://vitest.dev/guide/browser/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Chromatic Frontend Testing Guide](https://chromatic.com/frontend-testing-guide)
