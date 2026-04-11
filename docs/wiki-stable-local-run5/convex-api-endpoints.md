# Convex API Endpoints

## Overview

This module defines the public-facing Convex query and mutation endpoints for LiminalDB. It is organized into three endpoint files: **prompts** (CRUD, search, ranking, tagging, and usage tracking for prompts), **health** (unauthenticated and authenticated health checks), and **userPreferences** (theme and general preference management). All authenticated endpoints delegate to shared API-key auth (`convex/auth/apiKey.ts`) and, for user preferences, row-level security (`convex/auth/rls.ts`). Business logic for prompts is further delegated to the model layer (`convex/model/prompts.ts`).

## Responsibilities

- Expose CRUD operations for prompts (insert, get, update, delete by slug)
- Provide ranked listing, full-text search, and tag listing for prompts
- Track prompt usage via the trackPromptUse mutation
- Manage user theme and general preferences with RLS-scoped access
- Offer unauthenticated and authenticated health-check queries
- Enforce API-key authentication on all protected endpoints

## Source Coverage

- convex/health.ts
- convex/healthAuth.ts
- convex/prompts.ts
- convex/userPreferences.ts

## Cross-Module Context

- convex/health.ts -> convex/_generated/server.d.ts (import)
- convex/healthAuth.ts -> convex/_generated/server.d.ts (import)
- convex/healthAuth.ts -> convex/auth/apiKey.ts (import)
- convex/prompts.ts -> convex/_generated/server.d.ts (import)
- convex/prompts.ts -> convex/auth/apiKey.ts (import)
- convex/prompts.ts -> convex/functions.ts (import)
- convex/prompts.ts -> convex/model/prompts.ts (import)
- convex/userPreferences.ts -> convex/_generated/server.d.ts (import)
- convex/userPreferences.ts -> convex/auth/apiKey.ts (import)
- convex/userPreferences.ts -> convex/auth/rls.ts (import)
- convex/userPreferences.ts -> convex/functions.ts (import)
