# Bun Test Runner

> Source: https://bun.sh/docs/test

Bun ships with a fast, built-in, Jest-compatible test runner.

## Features

- TypeScript and JSX support
- Lifecycle hooks
- Snapshot testing
- UI & DOM testing
- Watch mode with `--watch`
- Script pre-loading with `--preload`

## Run Tests

```bash
bun test
```

## Writing Tests

```typescript
import { expect, test } from "bun:test";

test("2 + 2", () => {
  expect(2 + 2).toBe(4);
});
```

Test files match patterns:
- `*.test.{js|jsx|ts|tsx}`
- `*_test.{js|jsx|ts|tsx}`
- `*.spec.{js|jsx|ts|tsx}`
- `*_spec.{js|jsx|ts|tsx}`

## Filtering Tests

```bash
bun test <filter>                     # Filter by file path
bun test --test-name-pattern addition # Filter by test name
bun test ./test/specific-file.test.ts # Run specific file
```

## Common Options

```bash
bun test --timeout 20          # Per-test timeout in ms (default: 5000)
bun test --bail                # Stop after first failure
bun test --watch               # Watch mode
bun test --rerun-each 100      # Run each test N times
bun test --coverage            # Generate coverage
```

## Lifecycle Hooks

```typescript
import { beforeAll, beforeEach, afterEach, afterAll } from "bun:test";

beforeAll(() => { /* runs once before all tests */ });
beforeEach(() => { /* runs before each test */ });
afterEach(() => { /* runs after each test */ });
afterAll(() => { /* runs once after all tests */ });
```

## Mocks

```typescript
import { test, expect, mock } from "bun:test";

const random = mock(() => Math.random());

test("random", () => {
  const val = random();
  expect(random).toHaveBeenCalled();
  expect(random).toHaveBeenCalledTimes(1);
});
```

## Snapshots

```typescript
import { test, expect } from "bun:test";

test("snapshot", () => {
  expect({ a: 1 }).toMatchSnapshot();
});
```

Update snapshots:
```bash
bun test --update-snapshots
```

## CI/CD Integration

GitHub Actions:
```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun test
```

JUnit XML reports:
```bash
bun test --reporter=junit --reporter-outfile=./bun.xml
```
