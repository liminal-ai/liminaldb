# Tests: Service Unit

## Overview

Comprehensive unit test suite covering server-side functionality across auth, MCP, prompts, drafts, preferences, merge logic, and Redis caching. All 22 test files share a common pattern: they mock the auth middleware and token extractor, use shared test fixtures, and exercise production route/API handlers in isolation. The suite is organized into four subdirectories (auth, mcp, prompts, lib) plus standalone files for drafts, preferences, and Redis cache.

## Responsibilities

- Validate auth middleware behavior including token extraction, JWT verification, and route protection
- Test MCP protocol endpoints: auth challenges, resource listing, tool invocation, and well-known discovery
- Cover all prompts CRUD operations: create, read, update, delete, list, merge, import/export
- Verify edge cases and schema validation for prompts API
- Test draft persistence via Redis-backed routes
- Validate user preferences API
- Unit-test the merge algorithm independently of HTTP layer
- Verify Redis caching behavior in isolation
- Ensure feature flags are correctly gated in prompt operations

## Structure Diagram

```mermaid
flowchart LR
  subgraph TestSuites["Test Suites"]
    subgraph Auth["auth/"]
      A1[mcp.test]
      A2[middleware.test]
      A3[routes.test]
    end
    subgraph MCP["mcp/"]
      M1[auth-challenge.test]
      M2[resources.test]
      M3[toolHandlers.test]
      M4[tools.test]
      M5[well-known.test]
    end
    subgraph Prompts["prompts/"]
      P1[createPrompts.test]
      P2[deletePrompt.test]
      P3[edgeCases.test]
      P4[flagsUsage.test]
      P5[getPrompt.test]
      P6[importExport.test]
      P7[listPrompts.test]
      P8[mcpTools.test]
      P9[mergePrompt.test]
      P10[updatePrompt.test]
    end
    D1[drafts.test]
    PR1[preferences.test]
    LM1[merge.test]
    RC1[redis-cache.test]
  end

  subgraph SharedDeps["Shared Dependencies"]
    FIX[fixtures/index.ts]
    MOCK[fixtures/mockConvexClient.ts]
    RMOCK[__mocks__/redis.ts]
    MFIX[fixtures/merge.ts]
  end

  subgraph ProductionCode["Production Code Under Test"]
    AUTH_MW[middleware/auth.ts]
    TOKEN[lib/auth/tokenExtractor.ts]
    MCP_API[api/mcp.ts]
    R_PROMPTS[routes/prompts.ts]
    R_DRAFTS[routes/drafts.ts]
    R_AUTH[routes/auth.ts]
    R_IE[routes/import-export.ts]
    R_WK[routes/well-known.ts]
    L_MERGE[lib/merge.ts]
    L_MCP[lib/mcp.ts]
    L_REDIS[lib/redis.ts]
  end

  Auth --> AUTH_MW & TOKEN & FIX
  A1 --> MCP_API
  A3 --> R_AUTH
  MCP --> AUTH_MW & TOKEN & MCP_API
  M3 --> L_MCP
  M5 --> R_WK
  Prompts --> AUTH_MW & TOKEN & FIX
  P1 & P2 & P3 & P5 & P10 --> R_PROMPTS
  P6 --> R_IE
  P4 & P7 & P9 --> MOCK
  P8 --> MCP_API
  D1 --> R_DRAFTS & L_REDIS & RMOCK
  LM1 --> L_MERGE & MFIX
```

## Entity Table

| Name | Kind | Role | Public Entrypoints | Depends On | Used By |
| --- | --- | --- | --- | --- | --- |
| auth/mcp.test.ts | test-file | Tests MCP endpoint auth enforcement | none | src/api/mcp.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| auth/middleware.test.ts | test-file | Tests auth middleware token validation and user context injection | none | src/lib/auth/index.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| auth/routes.test.ts | test-file | Tests auth route handlers (login, callback, session) | none | src/routes/auth.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| drafts/drafts.test.ts | test-file | Tests draft CRUD operations with Redis-backed storage | none | src/routes/drafts.ts, src/lib/redis.ts, src/schemas/drafts.ts, src/middleware/auth.ts, tests/__mocks__/redis.ts, tests/fixtures/index.ts | none |
| lib/merge.test.ts | test-file | Unit tests for three-way merge algorithm | none | src/lib/merge.ts, tests/fixtures/merge.ts | none |
| mcp/auth-challenge.test.ts | test-file | Tests MCP auth challenge flow for unauthenticated requests | none | src/api/mcp.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts | none |
| mcp/resources.test.ts | test-file | Tests MCP resource listing and reading | none | src/api/mcp.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| mcp/toolHandlers.test.ts | test-file | Unit tests for MCP tool handler implementations | none | src/lib/mcp.ts | none |
| mcp/tools.test.ts | test-file | Tests MCP tool registration and invocation via API | none | src/api/mcp.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| mcp/well-known.test.ts | test-file | Tests .well-known MCP discovery endpoint | none | src/routes/well-known.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts | none |
| preferences.test.ts | test-file | Tests user preferences get/set API | none | src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| prompts/createPrompts.test.ts | test-file | Tests prompt creation with validation | none | src/routes/prompts.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| prompts/edgeCases.test.ts | test-file | Tests boundary conditions and schema validation for prompts | none | src/routes/prompts.ts, src/schemas/prompts.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| prompts/importExport.test.ts | test-file | Tests bulk import/export of prompts (largest test file at 724 LOC) | none | src/routes/import-export.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| prompts/mergePrompt.test.ts | test-file | Tests prompt merge conflict detection and resolution via API | none | src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts, tests/fixtures/mockConvexClient.ts | none |
| prompts/mcpTools.test.ts | test-file | Tests prompt operations via MCP tool interface | none | src/api/mcp.ts, src/middleware/auth.ts, src/lib/auth/tokenExtractor.ts, tests/fixtures/index.ts | none |
| redis-cache.test.ts | test-file | Tests Redis caching layer in isolation | none | none | none |

## Key Flow

```mermaid
sequenceDiagram
    participant TR as Test Runner
    participant TF as Test File
    participant FIX as Fixtures
    participant MW as Auth Middleware (mocked)
    participant TE as Token Extractor (mocked)
    participant ROUTE as Route / API Handler
    participant CONVEX as Convex Client (mocked)

    TR->>TF: Execute test suite
    TF->>FIX: Load test data & mock user
    TF->>TE: Mock token extraction (return valid/invalid JWT)
    TF->>MW: Mock auth middleware (inject user context)
    TF->>ROUTE: Send HTTP request (supertest)
    ROUTE->>MW: Check authorization
    MW-->>ROUTE: User context / 401
    ROUTE->>CONVEX: Query/Mutate (mocked)
    CONVEX-->>ROUTE: Mock response data
    ROUTE-->>TF: HTTP response
    TF->>TF: Assert status, body, headers
```

## Flow Notes

| Step | Actor/Component | Action | Output / Side Effect |
| --- | --- | --- | --- |
| 1 | Test Runner | Executes a test file which loads fixtures and sets up mocks for auth middleware and token extractor | Isolated test environment with mocked dependencies |
| 2 | Test File | Sends an HTTP request via supertest to the route or API handler under test | Request reaches the production handler with mocked auth context |
| 3 | Route Handler | Processes request, interacts with mocked Convex client or Redis for data operations | Returns HTTP response with status code and JSON body |
| 4 | Test File | Asserts on response status, body content, headers, and any side effects | Pass/fail test result |

## Source Coverage

- tests/service/auth/mcp.test.ts
- tests/service/auth/middleware.test.ts
- tests/service/auth/routes.test.ts
- tests/service/drafts/drafts.test.ts
- tests/service/lib/merge.test.ts
- tests/service/mcp/auth-challenge.test.ts
- tests/service/mcp/resources.test.ts
- tests/service/mcp/toolHandlers.test.ts
- tests/service/mcp/tools.test.ts
- tests/service/mcp/well-known.test.ts
- tests/service/preferences.test.ts
- tests/service/prompts/createPrompts.test.ts
- tests/service/prompts/deletePrompt.test.ts
- tests/service/prompts/edgeCases.test.ts
- tests/service/prompts/flagsUsage.test.ts
- tests/service/prompts/getPrompt.test.ts
- tests/service/prompts/importExport.test.ts
- tests/service/prompts/listPrompts.test.ts
- tests/service/prompts/mcpTools.test.ts
- tests/service/prompts/mergePrompt.test.ts
- tests/service/prompts/updatePrompt.test.ts
- tests/service/redis-cache.test.ts

## Cross-Module Context

- tests/service/auth/mcp.test.ts -> src/api/mcp.ts (usage)
- tests/service/auth/mcp.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/auth/mcp.test.ts -> src/middleware/auth.ts (usage)
- tests/service/auth/mcp.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/auth/middleware.test.ts -> src/lib/auth/index.ts (usage)
- tests/service/auth/middleware.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/auth/middleware.test.ts -> src/middleware/auth.ts (usage)
- tests/service/auth/middleware.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/auth/routes.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/auth/routes.test.ts -> src/middleware/auth.ts (usage)
- tests/service/auth/routes.test.ts -> src/routes/auth.ts (usage)
- tests/service/auth/routes.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/drafts/drafts.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/drafts/drafts.test.ts -> src/lib/redis.ts (usage)
- tests/service/drafts/drafts.test.ts -> src/middleware/auth.ts (usage)
- tests/service/drafts/drafts.test.ts -> src/routes/drafts.ts (usage)
- tests/service/drafts/drafts.test.ts -> src/schemas/drafts.ts (usage)
- tests/service/drafts/drafts.test.ts -> tests/__mocks__/redis.ts (usage)
- tests/service/drafts/drafts.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/lib/merge.test.ts -> src/lib/merge.ts (usage)
- tests/service/lib/merge.test.ts -> tests/fixtures/merge.ts (usage)
- tests/service/mcp/auth-challenge.test.ts -> src/api/mcp.ts (usage)
- tests/service/mcp/auth-challenge.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/mcp/auth-challenge.test.ts -> src/middleware/auth.ts (usage)
- tests/service/mcp/resources.test.ts -> src/api/mcp.ts (usage)
- tests/service/mcp/resources.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/mcp/resources.test.ts -> src/middleware/auth.ts (usage)
- tests/service/mcp/resources.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/mcp/toolHandlers.test.ts -> src/lib/mcp.ts (usage)
- tests/service/mcp/tools.test.ts -> src/api/mcp.ts (usage)
- tests/service/mcp/tools.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/mcp/tools.test.ts -> src/middleware/auth.ts (usage)
- tests/service/mcp/tools.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/mcp/well-known.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/mcp/well-known.test.ts -> src/middleware/auth.ts (usage)
- tests/service/mcp/well-known.test.ts -> src/routes/well-known.ts (usage)
- tests/service/preferences.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/preferences.test.ts -> src/middleware/auth.ts (usage)
- tests/service/preferences.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/createPrompts.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/createPrompts.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/createPrompts.test.ts -> src/routes/prompts.ts (usage)
- tests/service/prompts/createPrompts.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/deletePrompt.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/deletePrompt.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/deletePrompt.test.ts -> src/routes/prompts.ts (usage)
- tests/service/prompts/deletePrompt.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/edgeCases.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/edgeCases.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/edgeCases.test.ts -> src/routes/prompts.ts (usage)
- tests/service/prompts/edgeCases.test.ts -> src/schemas/prompts.ts (usage)
- tests/service/prompts/edgeCases.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/flagsUsage.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/flagsUsage.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/flagsUsage.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/flagsUsage.test.ts -> tests/fixtures/mockConvexClient.ts (usage)
- tests/service/prompts/getPrompt.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/getPrompt.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/getPrompt.test.ts -> src/routes/prompts.ts (usage)
- tests/service/prompts/getPrompt.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/importExport.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/importExport.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/importExport.test.ts -> src/routes/import-export.ts (usage)
- tests/service/prompts/importExport.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/listPrompts.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/listPrompts.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/listPrompts.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/listPrompts.test.ts -> tests/fixtures/mockConvexClient.ts (usage)
- tests/service/prompts/mcpTools.test.ts -> src/api/mcp.ts (usage)
- tests/service/prompts/mcpTools.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/mcpTools.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/mcpTools.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/mergePrompt.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/mergePrompt.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/mergePrompt.test.ts -> tests/fixtures/index.ts (usage)
- tests/service/prompts/mergePrompt.test.ts -> tests/fixtures/mockConvexClient.ts (usage)
- tests/service/prompts/updatePrompt.test.ts -> src/lib/auth/tokenExtractor.ts (usage)
- tests/service/prompts/updatePrompt.test.ts -> src/middleware/auth.ts (usage)
- tests/service/prompts/updatePrompt.test.ts -> src/routes/prompts.ts (usage)
- tests/service/prompts/updatePrompt.test.ts -> tests/fixtures/index.ts (usage)
