# Convex Functions

## Overview

The Convex Functions module defines the server-side query and mutation endpoints for LiminalDB. It provides a custom function wrapper layer (`functions.ts`) that integrates trigger support, then exposes domain endpoints for prompt CRUD operations, user preferences, and health checks. All mutation-bearing endpoints authenticate via API key verification, and user preference endpoints additionally enforce row-level security.

## Responsibilities

- Wrap Convex mutation/internalMutation with trigger integration via `functions.ts`
- Expose full prompt CRUD, search, ranking, tag listing, and usage tracking endpoints (`prompts.ts`)
- Manage per-user theme and preference queries/mutations with RLS enforcement (`userPreferences.ts`)
- Provide unauthenticated and authenticated health-check endpoints (`health.ts`, `healthAuth.ts`)
- Define table-level trigger registration for reactive side-effects (`triggers.ts`)
- Provide a `NotImplementedError` utility class for unimplemented code paths (`errors.ts`)

## Source Coverage

- convex/errors.ts
- convex/functions.ts
- convex/health.ts
- convex/healthAuth.ts
- convex/prompts.ts
- convex/triggers.ts
- convex/userPreferences.ts

## Cross-Module Context

- convex/functions.ts -> convex/_generated/server.d.ts (import)
- convex/health.ts -> convex/_generated/server.d.ts (import)
- convex/healthAuth.ts -> convex/_generated/server.d.ts (import)
- convex/healthAuth.ts -> convex/auth/apiKey.ts (import)
- convex/prompts.ts -> convex/_generated/server.d.ts (import)
- convex/prompts.ts -> convex/auth/apiKey.ts (import)
- convex/prompts.ts -> convex/model/prompts.ts (import)
- convex/triggers.ts -> convex/_generated/dataModel.d.ts (import)
- convex/userPreferences.ts -> convex/_generated/server.d.ts (import)
- convex/userPreferences.ts -> convex/auth/apiKey.ts (import)
- convex/userPreferences.ts -> convex/auth/rls.ts (import)
