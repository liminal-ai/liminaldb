# Convex Migrations

## Overview

Data migration and seeding scripts for the LiminalDB Convex backend. This module provides one-off and repeatable operations to backfill computed fields, seed reference data (global tags, ranking configuration), and query migration status. Each script is a Convex server function that interacts with the database through the generated server API and domain model helpers.

## Responsibilities

- Backfill the `searchText` computed field on existing prompt documents
- Seed the global tags reference table from canonical tag constants
- Seed the ranking configuration table with default scoring weights
- Report the current status of registered migrations

## Structure Diagram

```mermaid
flowchart TD
  backfill[backfillSearchText] -->|imports| server["_generated/server"]
  backfill -->|imports| api["_generated/api"]
  backfill -->|imports| prompts["model/prompts"]
  status[migrationStatus] -->|imports| server
  seedTags[seedGlobalTags] -->|imports| server
  seedTags -->|imports| tagConstants["model/tagConstants"]
  seedRanking[seedRankingConfig] -->|imports| server
  seedRanking -->|imports| ranking["model/ranking"]
  subgraph migrations["convex/migrations"]
    backfill
    status
    seedTags
    seedRanking
  end
  subgraph deps["Cross-module dependencies"]
    server
    api
    prompts
    tagConstants
    ranking
  end
```

## Entity Table

| Name | Kind | Role | Public Entrypoints | Depends On | Used By |
| --- | --- | --- | --- | --- | --- |
| backfillSearchText | variable (migration) | Iterates over prompt documents and populates the searchText computed field using model/prompts helpers | backfillSearchText | _generated/api, _generated/server, model/prompts | none |
| migrationStatus | variable (query) | Returns the current execution status of registered migrations | migrationStatus | _generated/server | none |
| seedGlobalTags | variable (migration) | Seeds the global tags table from the canonical tag constants defined in model/tagConstants | seedGlobalTags | _generated/server, model/tagConstants | none |
| seedRankingConfig | variable (migration) | Seeds the ranking configuration table with default scoring weights from model/ranking | seedRankingConfig | _generated/server, model/ranking | none |

## Key Flow

```mermaid
sequenceDiagram
  actor Operator
  participant Dashboard as Convex Dashboard / CLI
  participant Migration as Migration Function
  participant Server as _generated/server
  participant Model as Domain Model
  participant DB as Convex DB

  Operator->>Dashboard: Trigger migration (e.g. backfillSearchText)
  Dashboard->>Migration: Invoke server function
  Migration->>Server: Obtain query/mutation context
  Migration->>DB: Query documents needing update
  DB-->>Migration: Document batch
  Migration->>Model: Compute derived values
  Model-->>Migration: Computed result
  Migration->>DB: Patch documents
  Migration-->>Dashboard: Migration complete / progress
  Operator->>Dashboard: Check migrationStatus
  Dashboard->>Migration: Invoke migrationStatus query
  Migration->>DB: Read migration metadata
  DB-->>Migration: Status records
  Migration-->>Dashboard: Status report
```

## Flow Notes

| Step | Actor/Component | Action | Output / Side Effect |
| --- | --- | --- | --- |
| 1 | Operator | Triggers a migration or seed function via the Convex Dashboard or CLI | Server function invocation |
| 2 | Migration Function | Queries the database for documents that need updating (e.g. prompts missing searchText, or empty reference tables) | Batch of documents to process |
| 3 | Migration Function | Calls domain model helpers (prompts, tagConstants, ranking) to compute or retrieve canonical values | Computed field values or reference data |
| 4 | Migration Function | Writes updated documents or inserts seed rows into the Convex database | Persisted changes |
| 5 | Operator | Queries migrationStatus to verify completion | Status report of all registered migrations |

## Source Coverage

- convex/migrations/backfillSearchText.ts
- convex/migrations/migrationStatus.ts
- convex/migrations/seedGlobalTags.ts
- convex/migrations/seedRankingConfig.ts

## Cross-Module Context

- convex/migrations/backfillSearchText.ts -> convex/_generated/api.d.ts (import)
- convex/migrations/backfillSearchText.ts -> convex/_generated/server.d.ts (import)
- convex/migrations/backfillSearchText.ts -> convex/model/prompts.ts (import)
- convex/migrations/migrationStatus.ts -> convex/_generated/server.d.ts (import)
- convex/migrations/seedGlobalTags.ts -> convex/_generated/server.d.ts (import)
- convex/migrations/seedGlobalTags.ts -> convex/model/tagConstants.ts (import)
- convex/migrations/seedRankingConfig.ts -> convex/_generated/server.d.ts (import)
- convex/migrations/seedRankingConfig.ts -> convex/model/ranking.ts (import)
