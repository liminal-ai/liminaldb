# 02: Beta Prep

## Milestone: Closed Beta (Friends & Family)

**Status:** Planning

## Vision

Ship prompts functionality to a small group of testers. Harden the product, improve UX, set up production infrastructure, and create documentation needed for users to successfully adopt.

## Capability Groups

### Data & Seeding
- Clear existing test data
- Seed realistic sample prompts
- Database re-seed scripts for preview/test environments

### Search & UX Tuning
- Tune search relevance
- Tune data entry experience
- Polish rough edges from initial build

### Theming
- Light/dark theme dropdown
- Theme persistence

### Branding
- Slight refinement (optional)
- Consistent visual identity

### Documentation
- Help documentation (in-app or linked)
- MCP setup guides for each client:
  - Claude Code
  - Claude Desktop
  - Cursor
  - VS Code
  - ChatGPT (widgets)

### Import/Export
- Batch prompt import (JSON/CSV?)
- Batch prompt export
- Single prompt export

### OpenAI Widgets
- Package existing UI components as OpenAI App SDK widgets
- Adapt for widget constraints
- Test in ChatGPT environment

### Infrastructure
- Production deployment (Fly.io)
- Preview deploys (branch-based)
- Environment management (local → preview → staging → prod)

### End-to-End Testing
- Playwright setup
- Critical path E2E scenarios
- Run on preview builds
- Run on staging deploys
- Run on prod deploys

## Features (TBD)

Features will be extracted as we elaborate this PRD:

| Feature | Scope | Status |
|---------|-------|--------|
| Data Seeding | Clear, seed, re-seed scripts | Not started |
| UX Polish | Search tuning, data entry refinement | Not started |
| Theming | Light/dark toggle | Not started |
| Documentation | Help docs, MCP setup guides | Not started |
| Import/Export | Batch prompt I/O | Not started |
| OpenAI Widgets | Widget packaging | Not started |
| Infra & Deploy | Prod, preview, environments | Not started |
| E2E Testing | Playwright pyramid top | Not started |

## Open Questions

- Import/export format: JSON? CSV? Both?
- Help docs: In-app or external site?
- Theme: Just light/dark or additional themes?
- OpenAI widgets: Which components to port first?
- Preview deploys: Per-PR or per-branch?

## Dependencies

- 01-prompts complete (it is)
- Convex cloud environment for prod
- Fly.io production app configured
