# Convex Functions

## Overview

The Convex Functions module defines the server-side query, mutation, and internal mutation endpoints that power LiminalDB's backend. It provides CRUD operations for prompts, user preference management, health checks (with and without auth), trigger registration, and shared function wrappers that inject trigger support into Convex's built-in mutation primitives. All authenticated endpoints depend on the `convex/auth/apiKey` module for API-key validation, and prompt endpoints delegate to `convex/model/prompts` for data-access logic.

## Responsibilities

- Wrap Convex mutation/internalMutation with trigger support via `convex/functions.ts`
- Expose prompt CRUD endpoints: insert, get, list, update, delete, search, ranked listing, tag listing, flag updates, and usage tracking
- Manage user preferences (theme, general) with row-level security via `convex/auth/rls.ts`
- Provide unauthenticated (`health.ts`) and authenticated (`healthAuth.ts`) health-check queries
- Register database triggers for reactive side-effects in `convex/triggers.ts`
- Define reusable error types (`NotImplementedError`) for unimplemented features

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
