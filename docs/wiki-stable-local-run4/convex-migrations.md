# Convex Migrations

## Overview

A set of Convex migration scripts that handle one-time or repeatable data transformations: backfilling search text on prompt documents, seeding the global tags table, initializing ranking configuration, and reporting migration status. Each migration is an exported Convex function that can be invoked via the Convex dashboard or CLI.

## Responsibilities

- Backfill computed `searchText` field on existing prompt documents
- Seed the database with a predefined set of global tags from `tagConstants`
- Initialize ranking configuration from the `ranking` model defaults
- Expose a migration status query for monitoring progress

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
