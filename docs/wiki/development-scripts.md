# Development Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development and debugging. These scripts handle seeding the database with sample prompts, creating test users, and investigating authentication sessions and tokens. Each script is executed independently from the command line and has no cross-module dependencies.

## Responsibilities

- Seed the Convex database with sample prompt data for local development
- Create test user records for manual and automated testing
- Inspect and debug WorkOS session state
- Decode and analyze authentication tokens (JWT) for troubleshooting

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
