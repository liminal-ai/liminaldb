# PromptDB

Prompt management tool providing MCP access to AI collaboration wisdom.

## Overview

PromptDB captures emerging AI collaboration patterns and provides frictionless access across every chat surface. Built on the Model Context Protocol (MCP), it works natively in ChatGPT, Claude, Cursor, VS Code, and any MCP-compatible environment.

## Stack

- **Runtime:** Bun
- **API:** Fastify
- **Database:** Convex
- **Auth:** WorkOS AuthKit
- **Protocol:** MCP (Model Context Protocol)
- **Deployment:** Fly.io

## Project Status

**Current Phase:** M0 - Stack Architecture Standup

Building the production foundation with full auth integration before feature work begins.

## Development

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- [Docker](https://docker.com) (for local Convex)
- WorkOS account (AuthKit)

### Local Setup

```bash
# Install dependencies
bun install

# Copy environment template
cp .env.example .env.local
# Edit .env.local with your credentials

# Start Convex local backend
bun run convex:dev

# Start Fastify server (separate terminal)
bun run dev
```

### Testing

```bash
# Run all tests
bun run test

# Quality gates
bun run lint
bun run typecheck
```

## Documentation

- [Product Brief](./docs/product-brief.md)
- [Architecture](./docs/architecture.md)
- [Auth Architecture](./docs/auth-architecture.md)
- [M0 Checklist](./docs/M0-Checklist-ACTIVE.md)

## License

Private - All rights reserved
