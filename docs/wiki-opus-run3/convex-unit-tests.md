# Convex Unit Tests

## Overview

Unit test suite for the LiminalDB Convex backend. Organized into three domains — **auth** (API key validation, row-level security, health endpoint auth), **prompts** (CRUD, slug operations, search, ranking, merge, validation, usage tracking), and **tags** (tag CRUD, tag constants). Tests use mock Convex contexts from shared fixtures to isolate model-layer logic from the Convex runtime.

## Responsibilities

- Verify API key authentication and validation logic
- Test row-level security (RLS) policy enforcement
- Validate health endpoint authentication behavior
- Test prompt CRUD operations (insert, get-by-slug, delete-by-slug, slug-exists)
- Verify prompt search functionality
- Test prompt ranking/scoring algorithms
- Validate prompt field merging logic
- Enforce prompt input validation rules
- Track prompt usage metrics
- Test tag creation, association, and querying
- Verify tag constant definitions and constraints
- Ensure limits/sync behavior correctness

## Structure Diagram

```mermaid
flowchart LR
  subgraph Tests
    subgraph Auth
      A1[apiKey.test.ts]
      A2[rls.test.ts]
      A3[healthAuth.test.ts]
      A4[limitsSync.test.ts]
    end
    subgraph Prompts
      P1[insertPrompts.test.ts]
      P2[getPromptBySlug.test.ts]
      P3[deleteBySlug.test.ts]
      P4[slugExists.test.ts]
      P5[searchPrompts.test.ts]
      P6[ranking.test.ts]
      P7[mergeFields.test.ts]
      P8[validation.test.ts]
      P9[usageTracking.test.ts]
    end
    subgraph Tags
      T1[tagConstants.test.ts]
      T2[tags.test.ts]
    end
  end

  subgraph Fixtures
    F1[mockConvexCtx.ts]
    F2[merge.ts]
  end

  subgraph "Convex Backend"
    M1[auth/apiKey.ts]
    M2[auth/rls.ts]
    M3[auth/types.ts]
    M4[model/prompts.ts]
    M5[model/merge.ts]
    M6[model/ranking.ts]
    M7[model/tags.ts]
    M8[model/tagConstants.ts]
  end

  A1 --> M1
  A2 --> M2
  A3 --> M1
  A3 --> M3
  P1 --> M4
  P1 --> F1
  P2 --> M4
  P2 --> F1
  P3 --> M4
  P3 --> F1
  P4 --> M4
  P4 --> F1
  P5 --> M4
  P5 --> F1
  P6 --> M6
  P7 --> M5
  P7 --> F2
  P8 --> M4
  P9 --> M4
  P9 --> F1
  T1 --> M8
  T2 --> M7
  T2 --> M8
```

## Entity Table

| Name | Kind | Role | Public Entrypoints | Depends On | Used By |
| --- | --- | --- | --- | --- | --- |
| apiKey.test.ts | file | Tests API key validation and extraction | none | convex/auth/apiKey.ts | none |
| rls.test.ts | file | Tests row-level security policy enforcement | none | convex/auth/rls.ts | none |
| healthAuth.test.ts | file | Tests authentication for health/status endpoints | none | convex/auth/apiKey.ts, convex/auth/types.ts | none |
| limitsSync.test.ts | file | Tests limits and sync behavior | none | none | none |
| insertPrompts.test.ts | file | Tests prompt insertion including upsert, dedup, and edge cases (largest test file at 459 LOC) | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts, convex/_generated/dataModel.d.ts | none |
| getPromptBySlug.test.ts | file | Tests fetching prompts by slug identifier | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| deleteBySlug.test.ts | file | Tests prompt deletion by slug | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| slugExists.test.ts | file | Tests slug existence checking | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| searchPrompts.test.ts | file | Tests prompt search/query functionality | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| ranking.test.ts | file | Tests prompt ranking and scoring algorithms | none | convex/model/ranking.ts | none |
| mergeFields.test.ts | file | Tests field merging logic for prompt updates | none | convex/model/merge.ts, tests/fixtures/merge.ts | none |
| validation.test.ts | file | Tests prompt input validation rules | none | convex/model/prompts.ts | none |
| usageTracking.test.ts | file | Tests prompt usage metric tracking | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| tagConstants.test.ts | file | Tests tag constant definitions and constraints | none | convex/model/tagConstants.ts | none |
| tags.test.ts | file | Tests tag CRUD and association operations | none | convex/model/tags.ts, convex/model/tagConstants.ts, convex/_generated/server.d.ts | none |

## Key Flow

```mermaid
sequenceDiagram
  participant Runner as Test Runner
  participant Test as Test File
  participant Mock as mockConvexCtx
  participant Model as Convex Model Layer

  Runner->>Test: execute test suite
  Test->>Mock: create mock Convex context
  Mock-->>Test: ctx (mock db, auth)
  Test->>Model: call model function(ctx, args)
  Model->>Mock: ctx.db.query / ctx.db.insert
  Mock-->>Model: mock data response
  Model-->>Test: result
  Test->>Test: assert expectations
```

## Flow Notes

| Step | Actor/Component | Action | Output / Side Effect |
| --- | --- | --- | --- |
| 1 | Test Runner | Discovers and executes test files across auth, prompts, and tags suites | Test suite invocation |
| 2 | Test File | Creates a mock Convex context via mockConvexCtx fixture (for tests requiring DB interaction) | Mock context with stubbed db and auth |
| 3 | Test File | Calls the target model-layer function with mock context and test arguments | Function execution against mock data |
| 4 | Model Layer | Executes business logic, interacting with the mock db for queries/mutations | Return value or thrown error |
| 5 | Test File | Asserts return values, side effects, or error conditions match expectations | Pass/fail result reported to runner |

## Source Coverage

- tests/convex/auth/apiKey.test.ts
- tests/convex/auth/rls.test.ts
- tests/convex/healthAuth.test.ts
- tests/convex/limitsSync.test.ts
- tests/convex/prompts/deleteBySlug.test.ts
- tests/convex/prompts/getPromptBySlug.test.ts
- tests/convex/prompts/insertPrompts.test.ts
- tests/convex/prompts/mergeFields.test.ts
- tests/convex/prompts/ranking.test.ts
- tests/convex/prompts/searchPrompts.test.ts
- tests/convex/prompts/slugExists.test.ts
- tests/convex/prompts/usageTracking.test.ts
- tests/convex/prompts/validation.test.ts
- tests/convex/tags/tagConstants.test.ts
- tests/convex/tags/tags.test.ts

## Cross-Module Context

- tests/convex/auth/apiKey.test.ts -> convex/auth/apiKey.ts (usage)
- tests/convex/auth/rls.test.ts -> convex/auth/rls.ts (usage)
- tests/convex/healthAuth.test.ts -> convex/auth/apiKey.ts (usage)
- tests/convex/healthAuth.test.ts -> convex/auth/types.ts (usage)
- tests/convex/prompts/deleteBySlug.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/deleteBySlug.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/getPromptBySlug.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/getPromptBySlug.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/insertPrompts.test.ts -> convex/_generated/dataModel.d.ts (usage)
- tests/convex/prompts/insertPrompts.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/insertPrompts.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/mergeFields.test.ts -> convex/model/merge.ts (usage)
- tests/convex/prompts/mergeFields.test.ts -> tests/fixtures/merge.ts (usage)
- tests/convex/prompts/ranking.test.ts -> convex/model/ranking.ts (usage)
- tests/convex/prompts/searchPrompts.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/searchPrompts.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/slugExists.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/slugExists.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/usageTracking.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/prompts/usageTracking.test.ts -> tests/fixtures/mockConvexCtx.ts (usage)
- tests/convex/prompts/validation.test.ts -> convex/model/prompts.ts (usage)
- tests/convex/tags/tagConstants.test.ts -> convex/model/tagConstants.ts (usage)
- tests/convex/tags/tags.test.ts -> convex/_generated/server.d.ts (usage)
- tests/convex/tags/tags.test.ts -> convex/model/tagConstants.ts (usage)
- tests/convex/tags/tags.test.ts -> convex/model/tags.ts (usage)
