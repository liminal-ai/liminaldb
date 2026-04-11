# Tests: Convex Unit

## Overview

Unit test suite for the Convex backend layer of LiminalDB. The tests are organized into three domains — **auth** (API key validation, row-level security, health endpoint auth), **prompts** (CRUD operations, validation, ranking, search, usage tracking, merge logic), and **tags** (tag model and constants). Tests use a shared `mockConvexCtx` fixture to simulate the Convex database context without a live backend.

## Responsibilities

- Verify API key authentication and validation logic
- Test row-level security (RLS) enforcement for multi-tenant data isolation
- Validate health endpoint authentication flows
- Test prompt CRUD operations (insert, get-by-slug, delete-by-slug, slug-exists)
- Verify prompt search and ranking algorithms
- Ensure prompt field merge logic correctness
- Validate prompt input constraints and error handling
- Test usage tracking for prompt access
- Verify tag CRUD operations and tag constant definitions
- Test plan-based limits synchronization

## Structure Diagram

```mermaid
flowchart LR
  subgraph Tests
    subgraph Auth
      A1[apiKey.test.ts]
      A2[rls.test.ts]
      A3[healthAuth.test.ts]
    end
    subgraph Prompts
      P1[insertPrompts.test.ts]
      P2[getPromptBySlug.test.ts]
      P3[deleteBySlug.test.ts]
      P4[slugExists.test.ts]
      P5[searchPrompts.test.ts]
      P6[validation.test.ts]
      P7[ranking.test.ts]
      P8[mergeFields.test.ts]
      P9[usageTracking.test.ts]
    end
    subgraph Tags
      T1[tagConstants.test.ts]
      T2[tags.test.ts]
    end
    L1[limitsSync.test.ts]
  end

  subgraph Fixtures
    F1[mockConvexCtx.ts]
    F2[merge.ts]
  end

  subgraph "Convex Backend (SUT)"
    C1[auth/apiKey.ts]
    C2[auth/rls.ts]
    C3[auth/types.ts]
    C4[model/prompts.ts]
    C5[model/merge.ts]
    C6[model/ranking.ts]
    C7[model/tags.ts]
    C8[model/tagConstants.ts]
  end

  A1 --> C1
  A2 --> C2
  A3 --> C1
  A3 --> C3
  P1 --> C4
  P1 --> F1
  P2 --> C4
  P2 --> F1
  P3 --> C4
  P3 --> F1
  P4 --> C4
  P4 --> F1
  P5 --> C4
  P5 --> F1
  P6 --> C4
  P7 --> C6
  P8 --> C5
  P8 --> F2
  P9 --> C4
  P9 --> F1
  T1 --> C8
  T2 --> C7
  T2 --> C8
```

## Entity Table

| Name | Kind | Role | Public Entrypoints | Depends On | Used By |
| --- | --- | --- | --- | --- | --- |
| apiKey.test.ts | file | Tests API key validation and lookup logic | none | convex/auth/apiKey.ts | none |
| rls.test.ts | file | Tests row-level security rules for tenant isolation | none | convex/auth/rls.ts | none |
| healthAuth.test.ts | file | Tests authentication for health/status endpoints | none | convex/auth/apiKey.ts, convex/auth/types.ts | none |
| limitsSync.test.ts | file | Tests plan-based limits synchronization | none | none | none |
| insertPrompts.test.ts | file | Tests prompt creation including upsert, deduplication, and tag handling (largest test file at 459 LOC) | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts, convex/_generated/dataModel.d.ts | none |
| getPromptBySlug.test.ts | file | Tests prompt retrieval by slug identifier | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| deleteBySlug.test.ts | file | Tests prompt deletion by slug | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| slugExists.test.ts | file | Tests slug existence checks | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| searchPrompts.test.ts | file | Tests prompt search/filtering | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| validation.test.ts | file | Tests prompt input validation and error paths | none | convex/model/prompts.ts | none |
| ranking.test.ts | file | Tests prompt ranking/scoring algorithm | none | convex/model/ranking.ts | none |
| mergeFields.test.ts | file | Tests field-level merge logic for prompt updates | none | convex/model/merge.ts, tests/fixtures/merge.ts | none |
| usageTracking.test.ts | file | Tests prompt access/usage counter logic | none | convex/model/prompts.ts, tests/fixtures/mockConvexCtx.ts | none |
| tagConstants.test.ts | file | Tests tag constant definitions and constraints | none | convex/model/tagConstants.ts | none |
| tags.test.ts | file | Tests tag CRUD operations and associations | none | convex/model/tags.ts, convex/model/tagConstants.ts | none |

## Key Flow

```mermaid
sequenceDiagram
  participant Runner as Test Runner
  participant Test as Prompt Test
  participant Mock as mockConvexCtx
  participant SUT as model/prompts.ts

  Runner->>Test: execute test case
  Test->>Mock: createMockCtx()
  Mock-->>Test: mock db context
  Test->>Mock: seed test data (insert)
  Test->>SUT: call function under test (e.g. insertPrompt)
  SUT->>Mock: db.query / db.insert / db.patch
  Mock-->>SUT: return mock results
  SUT-->>Test: return result
  Test->>Test: assert expectations
```

## Flow Notes

| Step | Actor/Component | Action | Output / Side Effect |
| --- | --- | --- | --- |
| 1 | Test Runner | Discovers and executes test files across auth, prompts, and tags suites | Individual test cases invoked |
| 2 | Test File | Creates a mock Convex database context via mockConvexCtx fixture (for tests that need DB interaction) | Simulated Convex mutation/query context |
| 3 | Test File | Seeds any required test data into the mock context | Pre-populated mock database state |
| 4 | Test File | Calls the system-under-test function from the Convex backend module | Function executes against mock context |
| 5 | Test File | Asserts return values, side effects, and error conditions | Test pass/fail result |

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
