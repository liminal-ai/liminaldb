# Dev Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development for creating test users, debugging authentication sessions and tokens, and seeding the database with sample prompt data. These scripts are run manually from the command line and have no cross-module dependencies.

## Responsibilities

- Create test users for local development and QA
- Investigate and debug WorkOS session state
- Decode and inspect authentication tokens (v1 and v2 approaches)
- Seed the Convex database with sample prompt data

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
