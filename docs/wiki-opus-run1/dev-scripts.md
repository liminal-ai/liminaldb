# Dev Scripts

## Overview

A collection of standalone TypeScript utility scripts used during development and debugging. These scripts are run manually from the command line to seed test data, create test users, and investigate authentication sessions and tokens. None of the scripts export reusable modules; each is a self-contained entry point.

## Responsibilities

- Seed the database with sample prompt data for local development and testing
- Create test user accounts for authentication and authorization testing
- Inspect and debug active sessions to troubleshoot authentication issues
- Decode and analyze JWT tokens to verify claims and expiration (v1 and v2 variants)

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
