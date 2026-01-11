# 00: Architecture Standup

## Milestone: Productionized Full-Stack Foundation

**Status:** Complete

## What Was Delivered

A fully integrated full-stack "hello world" with production-grade infrastructure:

### Core Infrastructure
- **Runtime:** Bun + Fastify server
- **Database:** Convex (queries, mutations, schema)
- **Cache:** Redis/Upstash (ephemeral state)
- **Auth:** WorkOS AuthKit with JWT validation

### API Layer
- REST endpoints scaffolded
- MCP server with tool registration
- Streamable HTTP transport (2025-11-25 spec)

### Web UI
- Shell/portlet architecture
- Server-rendered HTML (no React)
- Cookie-based auth for web, Bearer for MCP/API

### Auth Integration
- Web OAuth flow (WorkOS → callback → cookie)
- MCP OAuth discovery (RFC 9728)
- API key + userId pattern to Convex
- Multi-issuer JWT validation

### Testing Foundation
- Vitest setup
- Service mock test pattern
- Integration test pattern

### Deployment
- Fly.io staging environment
- GitHub Actions CI

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| Fastify between clients and Convex | MCP control, no cold starts |
| API key + userId to Convex | Clean separation: Fastify handles auth, Convex handles data |
| Vanilla JS over React | Model-friendly, simpler build |
| Shell/portlet (iframes) | Isolation, independent deployment |

## Documentation

- [Tech Architecture](../../tech-arch/README.md)
- [Auth Deep Dive](../../tech-arch/auth.md)
- [UI Patterns](../../tech-arch/ui-patterns.md)
