# Convex Migrations

## Overview

A collection of Convex data migration scripts used to backfill, seed, and track schema changes in the LiminalDB backend. Each migration is an exported Convex function that operates on the database to populate or transform data as the schema evolves.

## Responsibilities

- Backfill search text fields on existing prompt documents via `backfillSearchText`
- Seed the database with a canonical set of global tags from `tagConstants`
- Seed default ranking configuration from the `ranking` model
- Track and report migration execution status via `migrationStatus`

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
