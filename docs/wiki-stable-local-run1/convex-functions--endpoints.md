# Convex Functions & Endpoints

## Overview

This module defines the Convex backend API surface for LiminalDB. It includes CRUD endpoints for prompts, user preference management, health checks, database triggers, and shared function wrappers (`mutation`/`internalMutation`) that integrate trigger support. All public endpoints use API-key authentication via `convex/auth/apiKey.ts`, and user preference endpoints additionally enforce row-level security via `convex/auth/rls.ts`.

## Responsibilities

- Provide custom `mutation` and `internalMutation` wrappers that wire in database triggers from `convex/triggers.ts`
- Expose full CRUD operations for prompts (insert, get, list, update, delete, search, ranked listing, tag listing, flag updates, usage tracking)
- Manage per-user theme and general preferences with row-level security
- Offer unauthenticated and authenticated health-check endpoints
- Define database triggers that react to document changes
- Export a `NotImplementedError` utility class for unimplemented code paths

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
