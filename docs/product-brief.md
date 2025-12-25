---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - brainstorming-session-2025-12-17-chatgpt-apps-and-more.md
  - openai-chatgpt-app-store-research.md
workflowType: 'product-brief'
lastStep: 3
project_name: 'promptdb'
user_name: 'Leemoore'
date: '2025-12-20'
---

# Product Brief: PromptDB

**Date:** 2025-12-20 | **Author:** Leemoore | **Version:** 0.1 (Lean)

---

## About This Document

This is a **lean product brief** - intentionally minimal and functional. It evolves with each feature delivery.

**What's here now:** Core vision, target user, initial scope.

**What's deferred:** Marketing positioning, pricing strategy, competitive research, revenue modeling. These layer in as capability grows and merits deeper product discussion.

**Iteration rhythm:** Revisit and refine after each milestone. The brief stays fluid and responsive to building and learning.

---

## Executive Summary

**PromptDB** (working name) captures emerging AI collaboration wisdom and provides frictionless access across every chat surface.

```
User develops prompt patterns → Wisdom scatters across surfaces → Lost
                                        ↓
                              PromptDB captures in flow → Available everywhere
```

**Differentiators:** Chat-native | Cross-surface MCP | Model-assisted | Inference arbitrage

**Milestones:** M0 Stack Standup | M1 Dogfood (~Dec 27-28) | M2 App Store (Jan 2)

---

## ChatGPT App Store Context

OpenAI opened app submissions Dec 2025. First approved apps roll out in the new year.

**What it means to be in the store:**
- Apps built on **MCP (Model Context Protocol)** - same protocol works in Claude, Cursor, VS Code
- Apps extend ChatGPT via tools (actions) and optional widgets (UI in iframes)
- Users discover via @ mention, tools menu, or proactive suggestions
- **ChatGPT becomes discovery channel, not lock-in** - MCP portability means build once, run everywhere

**Key requirements:**
1. Clear purpose beyond base ChatGPT
2. Reliable, low latency, complete (no demos)
3. Privacy policy required
4. Tools must be atomic with accurate annotations (read vs write)

**Monetization (current):**
- No digital goods yet (subscriptions not allowed in-app)
- Monetize via external web UI + Stripe
- Future: OpenAI exploring digital goods

**Strategic value:** Early entry in new ecosystem. Inference arbitrage economics.

---

## Core Vision

### The Problem

Prompting mastery is foundational yet impossible to compound:

1. Users develop patterns that work
2. Wisdom scatters across surfaces - used once, never generalized
3. Saving interrupts flow, retrieval requires surface-switching
4. Models change faster than libraries can adapt

### Why Existing Solutions Fail

| Solution | Failure Mode |
|----------|--------------|
| Note apps | Out of flow, manual copy-paste |
| Prompt libraries | UI-first, not chat-native |
| Built-in memory | Surface-locked, not portable |

### The Solution

```
┌─────────────────────────────────────────────────────────┐
│  Chat Surface (ChatGPT, Claude, Cursor, VS Code)        │
│                                                         │
│  User: "save this as my code review prompt"             │
│           ↓                                             │
│  ┌─────────────────────────────────────────────────┐   │
│  │  PromptDB MCP                                    │   │
│  │  - Save / Retrieve / List / Compose              │   │
│  │  - Tags, not hierarchies                         │   │
│  │  - Model-assisted refinement                     │   │
│  │  - Harvest wisdom from sessions                  │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key Differentiators

1. **Interface IS the chat** - invoke, don't visit
2. **Portability as core** - wisdom follows you across surfaces
3. **Inference arbitrage** - host pays for AI, you pay for storage
4. **Harvest feature** - "review this session, extract valuable prompts"
5. **Uncrowded space** - chat-native prompt management has few players

---

## Core Use Cases

**1. Retrieve** - User asks agent to find a prompt by name, description, or topic.
> "Get my code review prompt" → Agent retrieves, delivers in context

**2. Refine & Save** - User asks agent to tighten/generalize current prompt and save it.
> "Generalize that prompt for any language and save it" → Agent confirms prompt text, name, slug, topics → User approves or adjusts → Saved

**3. Harvest** - User instructs agent to review full chat history and extract prompt candidates.
> "Review this session and find prompts worth saving" → Agent extracts candidates → Presents to user → User selects what to save

*Each feature milestone selects which use cases to implement.*

---

## Data Model (Simple)

Everything is a **prompt**. Types (snippet, template, etc.) are classifications, not separate entities.

```
Prompt
├── content (the text)
├── name (human label)
├── slug (machine key)
├── type (prompt | snippet | template | ...)
├── topics (tags)
└── metadata (created, updated, surface)
```

---

## Target Users

**Primary:** The AI Power User

```
Uses AI daily across surfaces → Cares about prompt quality → Hates friction
         ↓                              ↓                         ↓
   ChatGPT + Claude + Cursor    Iterates until it works    Won't break flow
```

**Defining behaviors:**
- Crafts prompts carefully, frustrated when good ones get lost
- Switches between surfaces regularly
- Values elegance over feature count
- Already tried notes for prompts - didn't stick
- Will pay $5/mo for "just works"

**Not target (v1):**
- Casual users (don't care enough)
- Enterprise teams (no approval workflows yet)
- Marketplace browsers (we're not a library to browse)

---

## Scope

*To be defined in Feature.md for each milestone.*

### Development Approach: Production Hello World

First feature is always infrastructure standup with zero product function:
- Full stack wired end-to-end (frontend, backend, MCP, API)
- Modern stable versions, resolve any version friction
- Automated deployment to staging
- Testing pyramid with 1+ test per layer
- Health checks, logging, error handling scaffolds

De-risks infrastructure before feature work.

### Milestones

**M0 (Stack Standup):** Production hello world - all layers connected, deployed, tested, zero product logic

**M1 (Dogfood):** First real function - basic CRUD, harvest, works in Claude Code + VS Code

**M2 (App Store):** ChatGPT widget, web UI, Stripe billing, submission package

---

## Open Questions

*Parking lot for decisions to revisit:*

1. Final product name (PromptDB is working name)
2. Composition syntax/patterns (how prompts combine)
3. Version history (cut from v1, revisit later)

---
