# Convex Migrations

## Overview

A set of Convex data migration scripts used to backfill, seed, and verify data in the LiminalDB backend. Each migration is a standalone Convex function that operates on specific tables or configurations, relying on shared model modules for domain logic and constants.

## Responsibilities

- Backfill search text fields on existing prompt documents for full-text search support
- Seed the database with a predefined set of global tags from tagConstants
- Seed default ranking configuration from the ranking model
- Check and report the status of applied migrations

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
