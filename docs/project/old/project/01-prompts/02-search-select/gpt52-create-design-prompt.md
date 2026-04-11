# GPT-5.2 Prompt: Create Technical Design for Epic 02

## Product Overview

**LiminalDB** captures AI collaboration wisdom and provides frictionless access across every chat surface.

```
User develops prompt patterns → Wisdom scatters across surfaces → Lost
                                        ↓
                              LiminalDB captures in flow → Available everywhere
```

**Core value proposition:**
- Interface IS the chat - invoke prompts via MCP from Claude Code, Cursor, VS Code, ChatGPT
- Cross-surface portability - wisdom follows you across AI surfaces
- Chat-native prompt management - users invoke prompts from where they already are

**Target user:** AI power user who uses AI daily, crafts prompts carefully, hates friction.

---

## Project Status

**Epic 01 (Complete):** Prompt CRUD - backend + web frontend + MCP tools working. 278 tests passing.

**Epic 02 (Current):** Search & Select - the feature spec is complete and ready for technical design.

**Tech Stack:**
- **Convex** - serverless database (source of truth)
- **Fastify** - REST API layer on Bun runtime
- **Vanilla JS** - frontend (intentional choice, avoids framework overhead)
- **WorkOS AuthKit** - authentication
- **Bun** - runtime and package manager
- **Vitest** - testing
- **Biome** - linting/formatting
- **Redis (Upstash)** - NEW for this epic: durable drafts and user state

---

## Your Task

Create a comprehensive technical design document for the Search & Select feature.

### Required Reading

Before writing the tech design, read and understand these documents:

**SDD Methodology (read all):**
```
/docs/reference/sdd/meta-spec-design.md          # Core SDD methodology
/docs/reference/sdd/tech-design.template.md      # Tech design template to follow
/docs/reference/sdd/feature-spec.template.md     # Feature spec structure (for context)
/docs/reference/sdd/ui-tdd-test-approach.md      # UI testing patterns
```

**Feature Spec (the "what"):**
```
/docs/epics/02-search-select/01.search.select.feature.md
```

**Architecture Reference (existing patterns):**
```
/docs/architecture.md                  # System architecture, tech decisions
/docs/ui-arch-patterns-design.md       # Shell/portlet patterns, components, message protocol
/docs/auth-design.md                   # Auth implementation details
/docs/auth-architecture.md             # Auth design decisions
```

---

## Tech Design Requirements

Follow the template in `/docs/reference/sdd/tech-design.template.md`. Your design should include:

### High Altitude (System View)
- System context diagram showing Redis integration
- External contracts (API changes, Redis key patterns)
- Error response shapes

### Medium Altitude (Module Boundaries)
- Module architecture (new files, modified files)
- Module responsibility matrix
- Component interaction diagrams

### Medium Altitude (Flow-by-Flow)
For each major flow from the feature spec:
1. Search flow
2. Ranked list flow
3. Pin/favorite flow
4. Durable drafts flow
5. MCP parity flow

Include:
- Sequence diagrams with AC references
- Skeleton requirements (what stubs to create)
- TC-to-test mapping

### Low Altitude (Interface Definitions)
- New TypeScript types
- Convex schema changes
- Redis data structures
- API endpoint signatures
- MCP tool signatures

### Testing Strategy
- Test pyramid for this feature
- Mock boundaries (what to mock, what runs real)
- TC-to-test-file mapping

### Skeleton → TDD Red → TDD Green Workplan
- Phase breakdown with deliverables
- Exit criteria per phase

### File Location
Please save file here: /Users/leemoore/promptdb/docs/epics/02-search-select/02.search.select.tech-design.md
---

## Key Design Decisions to Address

1. **Convex Search Index:** How to implement `searchText` field and search index. When/how is `searchText` populated (trigger vs model layer)?

2. **Redis Integration:**
   - Connection architecture (Fastify plugin, singleton)
   - Key patterns for drafts and user state
   - TTL strategy for drafts (24h as specified)
   - Cross-tab polling mechanism

3. **Ranking Implementation:**
   - Score computation formula
   - Where ranking is computed (Convex query)
   - Configurable weights approach

4. **Draft Staging:**
   - How frontend detects drafts exist in Redis
   - Line edit → draft accumulation flow
   - Save/discard mechanics

5. **MCP Tool Design:**
   - New tool signatures (list_prompts, search_prompts, list_tags, update_prompt)
   - Return shapes
   - Error handling

6. **Schema Migration:**
   - Adding new fields to existing prompts table
   - Default values for existing records

---

## Constraints

- Follow existing patterns from architecture docs
- Shell/portlet message protocol for UI changes
- No breaking changes to existing API endpoints
- Redis is for drafts and user state only (not search/cache)
- Convex handles search via built-in search indexes
- All ACs must be traceable to implementation

---

## Output

Write the tech design to:
```
/docs/epics/02-search-select/02.search.select.tech-design.md
```

Use the template structure but adapt representation (tables, diagrams, prose) based on content type per the "Varying Representation" guidance in meta-spec-design.md.

---

## Working Style

- Be thorough but concise
- Diagrams over prose where relationships are complex
- Tables for repetitive patterns
- Code samples for interface definitions
- Reference ACs and TCs explicitly
- Flag any assumptions or open questions
- Do not implement - design only

The tech design should be complete enough that a developer (human or AI) can implement each phase without needing clarification.
