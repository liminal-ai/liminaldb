# Dev Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development and debugging. These scripts handle seeding the database with sample prompts, creating test users, and investigating authentication sessions and tokens. Each script is independently executable and has no internal dependencies on other scripts or application modules.

## Responsibilities

- Seed the Convex database with sample prompt data for development and testing
- Create test user accounts for local development workflows
- Inspect and debug authentication sessions against WorkOS
- Decode and investigate JWT tokens for troubleshooting auth issues

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
