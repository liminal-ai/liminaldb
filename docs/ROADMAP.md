# LiminalDB Roadmap

## How We Got Here

This project started as **PromptDB** under the company name **Praxen**—a corporate-sounding brand meant to signal enterprise readiness. The original plan was straightforward: build a prompt storage and retrieval system, get it into the ChatGPT app store, and grow from there.

Then reality intervened.

### The ChatGPT Store Problem

OpenAI's app store has a monetization problem. Their documentation insists that apps can only charge for specific goods—not digital subscriptions. Yet the store is filled with subscription-based services (Canva, Zapier, Notion). The rules appear to be selectively enforced, with incumbents grandfathered in while new entrants face restrictions.

This created an uncomfortable choice: either give away a top-tier experience for free indefinitely, hoping OpenAI eventually figures out subscriptions, or find another path.

We chose the other path.

### The Pivot

The project is now **LiminalDB** under **LiminalBuilder**—a brand that reflects what this actually is: an indie developer building tools in the threshold space between how we work now and how we'll work with AI.

"Liminal" isn't accidental. It traces back to the earliest iteration of this work: a multi-provider LLM chat app called `liminal-type-chat` (yes, a nod to that Phuture track). The name stuck because it captures something true about the work—building in the in-between, where things are becoming but not yet formed.

The corporate branding didn't fit. LiminalBuilder does.

---

## The Vision

There's a larger picture emerging from nine months of circling the same set of problems.

**Power users working with AI are underserved.** They use multiple surfaces—Claude Code, Cursor, ChatGPT, Claude.ai, GitHub Copilot—and each one is an island. Prompts live in markdown files, scattered across chat histories, copy-pasted between tools. Context gets lost. Skills and expertise exist as tribal knowledge, not portable assets.

LiminalDB is the first piece: a shared layer for prompts, skills, and context that shows up wherever you work. Not perfect sync across incompatible surfaces—that's impossible. But way better than copy-paste.

### The Product Suite

```
LiminalBuilder (studio brand)
├── LiminalDB      → prompts, skills, context storage
├── LiminalTools   → MCPs, utilities, add-ons
└── LiminalChat    → roundtable LLM, multi-provider chat
```

**Pricing model:**
- $5/month → single utility
- $10/month → full suite
- Add-ons → premium features per utility

Users bring their own inference. We sell the organization layer, not the compute.

### The Longer Game

The utilities aren't the endgame—they're R&D that pays for itself. Each one builds fluency in the primitives. That fluency becomes dangerous when applied to vertical solutions.

The progression:
1. **Build** products, generate light revenue, establish credibility
2. **Consult** on AI enablement, train teams, fast-build solutions
3. **Vertical IDEs** built from primitives, sold at premium per-seat pricing

Domain expert + build speed + refined primitives = high-value vertical solutions, built fast, sold well.

---

## Current State

We're in **Feature 1: Prompt CRUD**, with the foundational layers complete:

| Layer | Status |
|-------|--------|
| Convex (schema, model, triggers) | Done |
| Fastify REST API | Done |
| MCP tools (save, get, delete) | Done |
| Vitest framework | Done |
| Web frontend | Next |

The backend works. You can create prompts, retrieve them by slug, delete them—via REST or MCP. 199 tests pass. Now we need the human-facing pieces.

---

## Feature Roadmap

### Feature 1: Prompt CRUD
*Get the thin slice working end-to-end.*

**Completed stories:**
1. Convex layer (schema, model functions, triggers for tag sync)
2. Fastify API (POST/GET/DELETE with auth, validation, error handling)
3. MCP tools (save_prompts, get_prompt, delete_prompt)
4. Test framework migration (Bun → Vitest)

**Remaining stories:**
- **Web frontend build** — search interface, view prompt, basic management
- **MCP behavior refinement** — canvas output for ChatGPT, plain text for CLI clients, template parameter merging

### Feature 2: Skills
*Skills are big prompts with attachments.*

The schema extends naturally: a skill has a slug, main content, tags—plus attachments. Those attachments might be markdown files, CSVs, Python scripts, reference documents.

This feature brings in **Redis** for text handling and caching. Skills can be large; we need infrastructure that handles that gracefully.

Key questions to resolve:
- Storage: blobs vs text with mime types?
- Delivery: zip download, inline expansion, MCP resource URIs?
- Multi-file skills: how to package and present?

### Feature 3: ChatGPT Widgets
*Maybe. Depends on timing and value.*

If ChatGPT's app store situation improves, or if the Skybridge/MCP UI standard gains traction, we'll build:
- PiP widget (low-profile prompt picker)
- Inline cards (prompt display)
- Fullscreen viewer (batch prompt review)

The web frontend will be built modular enough to adapt. But widgets aren't blocking the core product.

### Feature 4: Search
*Search as a pillar feature, not an afterthought.*

Redis + Convex gives us the foundation:
- Full-text search across prompts and skills
- Tag-based filtering
- Typeahead suggestions
- Recent/frequent access patterns

Search ergonomics matter. This isn't just "find by keyword"—it's "surface the right prompt in the moment you need it."

### Features 5-6: Refinements & Ergonomics
*Iterative, goal-directed, not rigidly scoped.*

Once the core is working, we enter a refinement phase:

- **Interface polish** — lean, fast, no friction
- **AI utilities** — not chat, but smart helpers:
  - Parse documents for prompt candidates
  - Help build and package skills
  - Generate metadata, suggest tags
  - Cheap models (GLM 4.7, MiniMax), built-in limits, add-ons for more
- **Template refinement** — parameter merging, variable handling, preview
- **Integration depth** — sync `/prompts` across IDEs and CLIs

The goal: dogfood with 2-3 power users, collect feedback, iterate until it's ready for broader release.

---

## Integration Strategy

LiminalDB lives where you work:

```
┌─────────────────────────────────────────────────┐
│                  LiminalDB                       │
│         (web app + backend + MCP)               │
└──────────────────────┬──────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │ Claude  │   │  Cursor  │   │ ChatGPT  │
   │  Code   │   │          │   │          │
   └─────────┘   └──────────┘   └──────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
              MCP (protocol layer)
```

The web app is primary—owns auth, owns billing. MCP is the distribution layer. Surface-specific widgets (when built) are convenience layers that authenticate against the backend.

Users don't have to wait for ChatGPT to approve anything. Configure the MCP, point it at your account, and your prompts are available.

---

## What Success Looks Like

**Short term (Feature 1-2):**
- Working prompt and skill management
- Usable from web, MCP, and major IDE surfaces
- Clean enough to dogfood daily

**Medium term (Features 3-6):**
- Refined search and discovery
- AI-assisted prompt/skill creation
- 2-3 power users providing regular feedback
- Light revenue from early adopters

**Longer term:**
- Skills library with curated content
- Consulting engagements building on credibility
- First vertical IDE experiments
- LiminalChat as reference implementation for MCP UI standard

---

## Domains

| Domain | Purpose |
|--------|---------|
| liminalbuilder.com | Studio brand, main site |
| liminaldb.com | Core product |
| liminaltools.com | Utilities, MCPs |
| liminalchat.com | Multi-LLM chat (future) |

---

*Last updated: December 2024*
