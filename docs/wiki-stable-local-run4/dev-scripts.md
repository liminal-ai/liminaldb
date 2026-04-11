# Dev Scripts

## Overview

A collection of standalone TypeScript scripts used during development and debugging. These scripts handle test user creation, authentication session and token investigation, and seeding the database with sample prompts. None of the scripts export reusable modules; they are intended to be run directly from the command line.

## Responsibilities

- Create test users for local development and QA workflows
- Investigate and debug authentication sessions against WorkOS/Convex
- Decode and inspect JWT tokens for auth troubleshooting (v1 and v2 variants)
- Seed the Convex database with sample prompt data for development and demos

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
