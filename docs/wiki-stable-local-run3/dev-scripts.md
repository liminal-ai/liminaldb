# Dev Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development for seeding data, creating test users, and debugging authentication sessions and tokens. These scripts are run manually and have no exports or cross-module dependencies.

## Responsibilities

- Seed the database with sample prompt data (`seed-prompts.ts`, 275 LOC)
- Create test user accounts for local development (`create-test-user.ts`)
- Investigate and debug session state (`investigate-session.ts`)
- Inspect and decode authentication tokens (`investigate-tokens.ts`, `investigate-tokens-v2.ts`)

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
