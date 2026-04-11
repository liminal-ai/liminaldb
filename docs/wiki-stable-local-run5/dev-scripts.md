# Dev Scripts

## Overview

A collection of standalone TypeScript scripts used during development and debugging. These scripts handle test user creation, session and token investigation, and seeding the database with sample prompt data. None of the scripts export reusable modules; they are intended to be run directly from the command line.

## Responsibilities

- Create test users for local development and QA workflows
- Investigate and debug user sessions against the auth system
- Decode and inspect authentication tokens (two script versions for iterative debugging)
- Seed the database with sample prompt data for development and demo purposes

## Source Coverage

- scripts/create-test-user.ts
- scripts/investigate-session.ts
- scripts/investigate-tokens-v2.ts
- scripts/investigate-tokens.ts
- scripts/seed-prompts.ts
