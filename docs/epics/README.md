# Development History

Detailed record of completed work. See main [README](../../README.md) for current roadmap.

## Test Count Progression

| Milestone | Tests |
|-----------|-------|
| M0 Local Complete | 130 |
| Epic 01 Complete | 199 |
| Epic 02 Story 1 | 278 |
| Epic 02 Complete | 341 |

## Epic 01: Prompt Insert/Get

Full prompt lifecycle via REST API and MCP.

| Phase | Deliverables |
|-------|--------------|
| Phase 1 | Convex schema, prompts table, tags, triggers |
| Phase 2 | REST API (POST/GET/DELETE /api/prompts) |
| Phase 3 | Vitest migration from Bun test |
| Phase 4 | Web UI (shell, portlets, viewer, editor) |
| Phase 5 | UI refinement, history management |
| Phase 6 | Insert/edit modes, batch staging |

**Specs:** [01-promptdb-insert-get/](./01-promptdb-insert-get/)

## Epic 02: Search & Select

Search, ranking, and durable drafts.

| Story | Deliverables |
|-------|--------------|
| Story 0 | Redis infrastructure (Upstash) |
| Story 1 | Search backend, ranking algorithm |
| Story 2 | MCP parity (list, search, update, track) |
| Story 3 | Durable drafts backend (Redis) |
| Story 4 | UI search, pin/favorite |
| Story 5 | UI drafts integration |

**Specs:** [02-search-select/](./02-search-select/)

## M0: Stack Architecture

Foundation work before feature development.

- Fastify + Bun server
- Convex local + cloud
- WorkOS AuthKit (OAuth, MCP OAuth discovery)
- MCP integration with RFC 9728
- CI/CD pipeline (GitHub Actions + Blacksmith)
- Staging deployment (Fly.io)
