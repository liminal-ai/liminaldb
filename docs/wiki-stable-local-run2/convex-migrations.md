# Convex Migrations

## Overview

Data migration scripts for the LiminalDB Convex backend. This module contains one-off or repeatable migration functions for backfilling search text on prompts, seeding global tags, seeding ranking configuration, and checking migration status. Each migration is an exported Convex function that can be invoked via the Convex dashboard or CLI.

## Responsibilities

- Backfill search text fields on existing prompt documents via `backfillSearchText`
- Seed the database with a predefined set of global tags from `tagConstants`
- Seed default ranking configuration from the `ranking` model
- Expose a `migrationStatus` query to check the state of migrations

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
