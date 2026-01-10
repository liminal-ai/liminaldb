---
stepsCompleted: [1, 2, 3]
inputDocuments:
  - brainstorming-session-2025-12-17-chatgpt-apps-and-more.md
  - openai-chatgpt-app-store-research.md
  - ROADMAP.md
workflowType: 'product-brief'
lastStep: 3
project_name: 'liminaldb'
user_name: 'Leemoore'
date: '2025-12-31'
---

# Product Brief: LiminalDB

**Date:** 2025-12-31 | **Author:** Leemoore | **Version:** 0.2 (Pivot Update)

---

## About This Document

This is a **lean product brief** - intentionally minimal and functional. It evolves with each feature delivery.

**What's here now:** Core vision, target user, feature-based roadmap.

**What's deferred:** Marketing positioning, pricing strategy, competitive research, revenue modeling. These layer in as capability grows and merits deeper product discussion.

**Iteration rhythm:** Revisit and refine after each feature milestone. The brief stays fluid and responsive to building and learning.

**Related documents:** See `ROADMAP.md` for the full strategic context and feature breakdown.

---

## Executive Summary

**LiminalDB** captures emerging AI collaboration wisdom and provides frictionless access across every chat surface.

```
User develops prompt patterns → Wisdom scatters across surfaces → Lost
                                        ↓
                              LiminalDB captures in flow → Available everywhere
```

**Brand context:** LiminalDB is the flagship product of **LiminalBuilder** - an indie studio building tools in the threshold space between how we work now and how we'll work with AI.

**Differentiators:** Chat-native | Cross-surface MCP | Model-assisted | Inference arbitrage

**Current focus:** Feature 1 (Prompt CRUD) - backend complete, web frontend next

---

## Distribution Strategy

### Primary: Web App + MCP

LiminalDB's primary distribution is via:
- **Web application** - owns auth, owns billing, full management UI
- **MCP (Model Context Protocol)** - prompts available in Claude Code, Cursor, VS Code, and any MCP-enabled surface

Users don't wait for platform approvals. Configure the MCP, point it at your account, and your prompts are available.

### Future: ChatGPT App Store (Deprioritized)

OpenAI opened app submissions Dec 2025, but with significant constraints:

**The monetization problem:**
- Apps cannot charge for digital goods (subscriptions not allowed in-app)
- Store is filled with subscription services (Canva, Zapier, Notion) that appear grandfathered
- No timeline for when this will change

**Current decision:** ChatGPT widgets are deprioritized (Feature 3). The core product ships via web + MCP first. If OpenAI's policies improve or the Skybridge/MCP UI standard gains traction, we'll revisit.

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
┌─────────────────────────────────────────────────────────────┐
│  Chat Surface (ChatGPT, Claude, Cursor, VS Code)            │
│                                                             │
│  User: "save this as my code review prompt"                 │
│           ↓                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  LiminalDB MCP                                      │   │
│  │  - Save / Retrieve / List / Compose                 │   │
│  │  - Tags, not hierarchies                            │   │
│  │  - Model-assisted refinement                        │   │
│  │  - Harvest wisdom from sessions                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
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

## Monetization

**Direct subscription via web:**

| Tier | Price | Access |
|------|-------|--------|
| Single utility | $5/month | LiminalDB only |
| Full suite | $10/month | LiminalDB + LiminalTools + future products |
| Add-ons | Variable | Premium features per utility |

**Key principle:** Users bring their own inference. We sell the organization layer, not the compute.

---

## Development Status & Roadmap

See the [main README](../README.md) for current roadmap and technical details.

See [epics/README.md](./epics/README.md) for detailed development history.

---

## Open Questions

*Parking lot for decisions to revisit:*

1. ~~Final product name~~ → Resolved: LiminalDB
2. Composition syntax/patterns (how prompts combine)
3. Version history (cut from v1, revisit later)

---
