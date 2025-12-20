# Handoff: M0 Feature.md Creation

**Date:** 2025-12-20
**From:** Product Brief Session
**To:** Feature Implementation Planning Session

---

## What Was Accomplished

1. **Product Brief v0.1** completed and committed: `docs/product-brief.md`
2. **Research docs** committed: brainstorming session + OpenAI app store research
3. **Milestone structure** defined: M0 (Stack) → M1 (Dogfood) → M2 (App Store)

---

## What's Next

Create **Feature.md for M0: Production Hello World** (Stack Standup)

This is infrastructure-only with zero product function:
- Full stack wired end-to-end (frontend, backend, MCP endpoints, API)
- Modern stable versions, resolve version friction
- Automated deployment to staging
- Testing pyramid with 1+ test per layer
- Health checks, logging, error handling scaffolds

---

## User's Feature.md Format

User has a battle-tested spec format. Follow this structure:

```
Feature.md
├── Role/Context
├── User Flows / Scenarios (what user can do)
├── In Scope / Out of Scope
├── Acceptance Criteria (numbered, grouped by capability)
└── Test Conditions (numbered, traceable to AC)
```

**Key principle:** AC → TC traceability. Every test condition traces back to an acceptance criterion.

---

## User Preferences

1. **Format weaving** - Mix headings, diagrams (ASCII/mermaid), numbered lists, prose, tables
2. **No hyperbole** - No "battle-tested", "enterprise-grade", flex language
3. **Lean and functional** - Cut the fluff, be direct
4. **Error on the side of over-planning** - Upfront investment prevents drift
5. **Production Hello World first** - De-risk infrastructure before features

---

## Tech Stack (from brainstorming doc)

- **Convex** - Edge database, real-time
- **Fastify + Bun** - API layer, MCP endpoint
- **Plain HTML/JS** - Widgets, no React required
- **MCP** - Model Context Protocol for chat surface integration

---

## Files to Read

1. `docs/product-brief.md` - Product vision, use cases, milestones
2. `brainstorming-session-2025-12-17-chatgpt-apps-and-more.md` - Technical architecture details

---

## Pending Todos

1. Draft Feature.md for M0 (Stack Standup)
2. Draft Feature.md for M1 (Dogfood)
3. Plan M2 (App Store submission)

---
