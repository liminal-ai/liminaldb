# Convex Functions

## Overview

This module contains the Convex backend function layer for LiminalDB. It defines shared mutation/query wrappers with trigger support, CRUD endpoints for prompts, user preference queries/mutations, health-check endpoints (with and without auth), a trigger registry, and a custom error class. All public endpoints delegate to shared auth helpers (`apiKey`, `rls`) and model logic (`model/prompts`).

## Responsibilities

- Provide wrapped `mutation` and `internalMutation` constructors that integrate the trigger system
- Register table-level triggers via the triggers registry (`convex/triggers.ts`)
- Expose full CRUD + search + ranking + tag-listing endpoints for prompts
- Expose theme and general user-preference queries and mutations with row-level security
- Provide unauthenticated and authenticated health-check endpoints
- Define a reusable `NotImplementedError` for unimplemented code paths

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
