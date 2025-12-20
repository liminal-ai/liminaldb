# Brainstorming Session: ChatGPT Apps, PromptDB, and Malleable IDEs

**Date:** 2025-12-17
**Type:** Random brainstorming session - wide-ranging exploration
**Status:** Ideas captured, not committed to any particular direction

---

## Context

OpenAI announced (today, Dec 17, 2025) that their ChatGPT app store is now accepting submissions. This triggered exploration of what kinds of apps make sense to build, leading to broader ideas about AI tooling and development environments.

---

## Part 1: ChatGPT App Store Opportunity

### Key Findings from Research

- **App submissions now open** - First approved apps rolling out in new year
- **MCP-based** - Apps built on Model Context Protocol (open standard)
- **Widget architecture** - HTML/JS in sandboxed iframes, no React required
- **Monetization currently limited** - Physical goods only, no digital subscriptions yet (but expected to come)
- **MCP Apps Extension** - OpenAI, Anthropic, and MCP-UI community are standardizing the widget layer so it works across platforms

### Strategic Insight: MCP Portability

Because ChatGPT apps are MCP-based, the same MCP server can work with:
- ChatGPT (with widgets)
- Claude.ai (MCP support)
- Claude Code (native MCP)
- Cursor, Codex, other MCP hosts

**ChatGPT becomes the discovery channel, not the lock-in.** Build once, deploy everywhere.

### The Inference Arbitrage Play

When your tool runs inside a chat surface (ChatGPT, Claude, etc.):
- The HOST pays for inference (reasoning, understanding, prompt improvement)
- YOU just provide the data layer (storage, sync, organization)
- Your margins are nearly 100% of subscription price
- You can offer "AI-powered" features without paying for inference

This makes you extremely competitive against standalone tools that have to pay for their own inference.

---

## Part 2: PromptDB - The Core Idea

### Concept

A conversationally-driven prompt database that lives where you prompt.

**Not interesting because it's a prompt database** (commodity).
**Interesting because the primary interface is chat-native across all surfaces.**

### Why It Works

| Criterion | PromptDB |
|-----------|----------|
| Conversational leverage | "Save my last prompt" is pure natural language |
| Beyond base ChatGPT | Persistent cross-session storage |
| Atomic actions | Save, retrieve, list, improve |
| End-to-end in chat | Full workflow without leaving |
| Composable | Works across all MCP surfaces |
| Inference arbitrage | Host pays for intelligence, you store data |

### Key Use Cases

1. **"Save what I just said as a prompt"** - ChatGPT infers intent
2. **"Save this as a work-in-progress prompt called X"** - Parking lot for iteration
3. **"Get my prompt for code reviews"** - Instant retrieval
4. **"Show me my prompts tagged 'development'"** - Browse/filter

### Cross-Surface Magic

```
Morning: ChatGPT
├── Craft prompts conversationally
├── Iterate until perfect
└── Save to PromptDB

Afternoon: Claude Code
├── "Get my 'architect review' prompt"
├── Apply immediately
└── No context switching
```

### Monetization

| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | 10 prompts, basic save/retrieve |
| Pro | $5/mo | Unlimited, templates with params, tags, version history |

**Current constraint:** Can't charge subscriptions in ChatGPT yet. Use external web UI with Stripe. ChatGPT is discovery + usage channel.

### Defensibility

- **First-mover in the paradigm** - "Chat-native prompt manager" isn't crowded
- **Refinement takes time** - Thousands of micro-decisions in UX
- **Solo builder advantage** - No design-by-committee
- **Network effects (light)** - Migration cost once prompts live there

### Target User

The person who:
- Cares enough about prompts to want to save them
- Uses multiple chat surfaces
- Hates heavyweight tools
- Values elegance over features
- Will pay $5/mo for something that "just works"

### Estimated Build Time

~20-30 hours to MVP for OpenAI submission

---

## Part 3: The Interlocking Suite

### Beyond PromptDB - Other Primitives

All solving the same core problem: **Getting the right context at the right time.**

| Module | What It Holds | Invocation |
|--------|---------------|------------|
| **PromptDB** | Instructions to the model | "Get my X prompt" |
| **RefDB / Layers** | Knowledge bases, standards, context | "Load my Convex standards" |
| **SkillsDB** | Multi-step procedures with files | Model-invoked by context |
| **Snippets** | Small reusable chunks, insertable | "Insert my error handling pattern" |
| **Doc Templates** | Artifact structures (PRDs, specs) | "Use my PRD template" |

### How They Interlock

```
USER: "Review this PR"

SkillsDB activates: "pr-review" skill
├── Pulls prompt from PromptDB: "code-review-checklist"
├── Loads context from RefDB: "convex-standards"
└── Follows multi-step workflow

All portable via MCP → works everywhere
```

### The Moat: Synergistic Lock-In

Individual tools = easy to switch
Interlocking suite = switching cost compounds

### One Product, Modular Capabilities

Instead of 5 separate apps, one umbrella product with modules you enable:

| Tier | Cost |
|------|------|
| First module | Free |
| +1 module | $1/mo |
| +2 modules | $2/mo |
| All modules | $3-4/mo |

Creates incentive to bundle. Synergy is the upsell.

---

## Part 4: Social Layer (Future)

### Concept

Prompts, layers, skills, and skill packs can be shared publicly.

### Features to Explore

- Public/private toggle on saved items
- Upvotes, saves, forks
- Follow creators
- Creator profiles with reputation
- Premium creator subscriptions ($3/mo to access someone's private prompts)
- Team/org sharing (enterprise tier)

### Where Sharing Happens

- **NOT in chat** - Chat is for using
- **Web UI** - Full social experience, browsing, discovery
- **ChatGPT widget** - Social UI via iframe

### Needs Its Own Session

Revenue share, moderation, discovery algorithms, etc. - too much to tackle alongside core product.

---

## Part 5: Technical Architecture

### Stack

```
┌─────────────────────────────────────────────────────────┐
│  Convex (Edge)                                          │
│  ├── Table definitions                                  │
│  ├── DTOs                                               │
│  └── Queries / Mutations                                │
└─────────────────────────────────────────────────────────┘
                          ↑
                          │
┌─────────────────────────────────────────────────────────┐
│  Fastify + Bun                                          │
│  ├── /api/*   ← Regular endpoints (web app uses these)  │
│  └── /mcp     ← MCP endpoint (chat surfaces use this)   │
└─────────────────────────────────────────────────────────┘
        ↑                                   ↑
        │                                   │
┌───────────────────┐             ┌───────────────────┐
│  Web App          │             │  ChatGPT / Claude │
│  (REST calls)     │             │  (MCP calls)      │
└───────────────────┘             └───────────────────┘
```

### Why This Stack

| Choice | Benefit |
|--------|---------|
| Convex | Real-time, edge, no infra to manage |
| Fastify + Bun | Fast, lightweight, easy MCP endpoint |
| Plain HTML/JS | No build complexity, works everywhere |
| Shared widgets | One codebase, two surfaces |

### Widget Requirements

- **No React required** - Plain HTML, CSS, vanilla JS works
- `window.openai` bridge for ChatGPT integration
- Sandboxed iframe with CSP restrictions

### Data Flow in Widgets

| Channel | Who Sees It |
|---------|-------------|
| `structuredContent` | Model + Widget |
| `content` | Model + Widget |
| `_meta` | **Widget only** - model never sees |
| `widgetState` | Model + Widget - persists for widget instance |
| Direct fetch to your API | Widget only |

**Key insight:** `_meta` lets you send large payloads to the widget without bloating model context. But this is ChatGPT-specific - other MCP hosts don't have widgets, so not portable.

### Authentication

- OAuth 2.1 with PKCE
- Use existing IdP (Auth0, Stytch, Clerk)
- You handle token verification server-side
- Widgets run in sandboxed iframe with strict CSP

---

## Part 6: Malleable IDE Vision (Medium-Term)

### The Bigger Idea

A browser-based development environment where:
- The harness/IDE itself is editable and evolves with your project
- You can spawn mini-UIs on demand for specific debugging/investigation tasks
- Everything has a contextual chat/composer attached
- You can generate new APIs and UIs within the environment
- Voice-driven with generative UI responses

### Why Generative UI Makes Sense Here

Not: "Model generates random UI from primitives"
But: "Model selects and configures purpose-built composites for the workflow"

### Specific IDE Scenarios

**Debugging / State Investigation:**
- "What's happening in this object right now?" → Expandable tree viewer
- "Trace this value through the code" → Data flow visualization

**Performance / Profiling:**
- "Why is this slow?" → Flame graph scoped to context
- "Show me the database queries" → Query list with timing

**API Development:**
- "Let me hit this endpoint" → Transient request builder
- "What shape does this API return?" → Schema explorer

**Meta-Development:**
- "I need to see these three values while I work" → Mini-dashboard that pins
- "Make me a feature flag toggler" → Quick UI that persists

### The Architecture: Portlets and Iframes

Going retro - portal architecture from 2005-2012, but AI-composed:

```
┌─────────────────────────────────────────────────────────┐
│  Parent Orchestrator (message bus)                       │
│                                                          │
│  ┌──────────────┐  ┌────────────────────────────────┐   │
│  │  Navigator   │  │  Main Content Area             │   │
│  │  (iframe)    │  │  (iframe)                      │   │
│  │              │  │                                │   │
│  │  [portlets]  │  │  [current view]               │   │
│  │              │  │                                │   │
│  └──────────────┘  └────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Mini-composer (always available)                    ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

### Why Iframes Work Here

| Problem | Iframe Solution |
|---------|-----------------|
| State isolation | Each portlet is its own world |
| Component lifecycle | iframe handles it |
| Moving components | Change iframe src or swap containers |
| Cloning | Just copy the src + params |
| Model reasoning | "this iframe at this URL" is simple |

### Communication: postMessage + Shared Backend

```javascript
// Iframe → Parent
window.parent.postMessage({ type: 'STATUS_CHANGED', data: {...} }, '*');

// Parent → Iframe
iframe.contentWindow.postMessage({ type: 'REFRESH' }, '*');

// Or: All iframes subscribe to Convex/Redis
// One updates, all see it via reactivity
```

### Component Registry in Redis

Generated components stored with:
- Template reference
- State/data
- Refresh configuration
- Placement metadata

Model can reference by ID: "Add comp_abc123 to the sidebar"

### Build Mode vs Run Mode

**Build Mode:**
- Generative UI streams into chat
- Iterate on component ("no, make it like this")
- Save approved version to Redis registry

**Compose Mode:**
- Pull components from registry
- Arrange in page layout
- Each component is an iframe portlet

**Run Mode:**
- Pages load from saved compositions
- Portlets do their thing
- Can drop into build mode to add/modify

### Work Tree Parallel

"Make three variations of this component" → See all three, pick the best, discard the rest.

Like git worktrees but for UI components.

---

## Part 7: Research Artifacts Saved

- `docs/ref/openai-chatgpt-app-store-research.md` - Full documentation summary
- This file - Brainstorming session capture

---

## Part 8: Random Observations

### Tool Selection and RLHF Patterns

When switched from WebSearch to Firecrawl for searching:
- Stopped putting "2024" in searches (a known bad habit from 2024-era RLHF)
- Used "2025" correctly or no year at all

**Hypothesis:** RLHF patterns are tool-specific. Different tool = different activation pattern = stale habits don't fire.

**Practical implication:** If an agent has bad habits with a particular tool, swapping in an equivalent tool might break the pattern.

### The AI-Friendly Stack Pattern

Keeps emerging across different contexts:
- **Convex** - Real-time data, edge functions
- **Redis** - Scratch pad, ephemeral state, component registry
- **Fastify/Bun** - Lightweight API layer
- **Vanilla JS/HTML** - Simple, fast, no build complexity

Models can code within this stack effortlessly. Good primitives, clear boundaries.

---

## Next Steps (When Ready)

1. **Sleep on PromptDB** - Decide if 20-30 hours is worth it vs other priorities
2. **If yes to PromptDB:**
   - Define MCP tool set (save, get, list, search, delete)
   - Build Convex schema
   - Build Fastify MCP endpoint
   - Build minimal web UI
   - Build ChatGPT widget
   - Submit for review
3. **Malleable IDE** - Longer-term exploration, prototype the harness architecture
4. **Social layer** - Separate brainstorming session when core product validated

---

## Summary

This session started with "OpenAI app store is open, what should we build?" and expanded into:

1. **PromptDB** - A concrete, buildable product with clear value prop and inference arbitrage economics
2. **Suite expansion** - RefDB, SkillsDB, Snippets as interlocking modules
3. **Malleable IDE** - A bigger vision for AI-native development environments using portal/portlet architecture with generative UI

The thread connecting everything: **Getting the right context at the right time**, whether that's prompts in a chat surface or debugging tools in a development harness.
