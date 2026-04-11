# Dev Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development and debugging. These scripts handle seeding the database with sample prompts, creating test users, and investigating session/token issues. Each script is independently executable and has no exports or cross-module dependencies.

## Responsibilities

- Seed the database with sample prompt data for local development
- Create test user accounts for manual and automated testing
- Inspect and debug session state for troubleshooting auth issues
- Investigate and decode tokens (v1 and v2) for diagnosing authentication flows

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
