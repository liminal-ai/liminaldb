# Story 1: Shared Tags Foundation

## Context

Freeform tagging creates chaos - inconsistent vocabulary, duplicate detection complexity, race conditions, and no basis for AI-assisted tagging. Users don't need unlimited flexibility; they need good defaults that just work. A curated shared vocabulary enables AI tagging, simplifies the UI, and sets up future network effects like sharing and discovery.

## Direction

Replace custom tags with 19 fixed shared tags across three dimensions: purpose (what it is), domain (what it's about), and task (what it does). Users pick from chips/pills grouped by dimension. AI can reliably suggest from a fixed list. No tag creation, no tag management, no complexity.

## Scope

### In
- 19 shared tags seeded at user creation
- Chip/pill selector UI grouped by purpose/domain/task
- Remove custom tag creation capability
- Update existing tag filtering/search to work with shared tags

### Out / Later
- Custom tags (future advanced config if requested)
- Tag suggestions from users (separate story)
- AI auto-tagging (Story 2)

## Tags

**Purpose (5):** instruction, reference, persona, workflow, snippet

**Domain (7):** code, writing, analysis, planning, design, data, communication

**Task (7):** review, summarize, explain, debug, transform, extract, translate

---

## Phase A: Build

### Goal
Working shared tag system. Users can select from 19 tags via chip UI. Tags persist and filter correctly. No custom tag creation.

### Open Questions
- Exact chip/pill styling and grouping layout
- How to handle existing prompts with custom tags (migrate? grandfather?)
- Tag selector placement in create/edit form

---

## Phase B: Harden

### Goal
Production-ready, tested, documented shared tags system.

### Standards Checklist
- [ ] Unit tests for tag seeding
- [ ] Integration tests for tag selection/filtering
- [ ] UI component tests for chip selector
- [ ] Update ui-patterns.md with tag selector component
- [ ] Error handling for edge cases
- [ ] Migration path for existing custom tags documented
