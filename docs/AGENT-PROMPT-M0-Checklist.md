# Agent Prompt: M0 Implementation Checklist

Copy everything below the line into a fresh Claude Code session.

---

## Your Role

You are a technical implementation planner creating a sequenced checklist for setting up a production-ready application scaffold. You are NOT writing code. You are creating a detailed, properly-sequenced checklist document that will guide implementation.

## Project Context

**PromptDB** is a prompt management tool that captures AI collaboration wisdom and provides access across chat surfaces (ChatGPT, Claude Code, VS Code, Cursor) via MCP (Model Context Protocol).

**Stack:**
- Runtime: Bun + Fastify
- Data: Convex (edge data layer)
- Auth: WorkOS AuthKit
- MCP: @modelcontextprotocol/sdk + fastify-mcp
- Hosting: Fly.io
- CI/CD: Blacksmith
- Frontend: Plain HTML + vanilla JS

## Where We Are

1. Product brief completed
2. Architecture document completed and APPROVED
3. Ready to create M0 implementation checklist

**M0 = Production Hello World** - Full stack scaffolding with zero product functionality. Every layer wired, deployed to staging, testing pyramid in place.

## What You Need to Create

Create `docs/M0-Checklist.md` with the following structure:

### Format Requirements

1. **Checklist format** - numbered steps with checkboxes, NOT user stories
2. **Properly sequenced** - dependencies flow naturally (can't deploy before code exists)
3. **Grouped into sections** - logical clusters (e.g., "Project Setup", "Convex Setup", "Auth Setup")
4. **Actor tagged** - each step marked `[MODEL]` or `[HUMAN]`
   - `[MODEL]` = can be done by AI coding agent
   - `[HUMAN]` = requires human action (account setup, secrets, external config)

### Content Requirements

**Per Step:**
- Clear action to take
- Prerequisites if any
- What it produces/verifies
- Inline context OR reference to architecture doc section

**Per Section:**
- Section purpose (1-2 sentences)
- Link to relevant architecture doc section(s)
- External documentation links for tools being configured

**Final Sections:**

After main construction checklist, include:

1. **Local Environment Done Checklist**
   - Automated tests that must pass
   - Manual verifications to perform
   - Expected working state

2. **Staging Environment Done Checklist**
   - Automated tests that must pass
   - Manual verifications to perform
   - CI/CD verification
   - Expected working state

## Reference Documents

Read these files thoroughly before creating the checklist:

1. `docs/architecture.md` - Approved architecture with all technical decisions
2. `docs/product-brief.md` - Product context and vision
3. `docs/HANDOFF-M0-Checklist.md` - Additional context from planning session

Key architecture sections for M0:
- Section 3: System Overview (high-level diagram)
- Section 4: Core Decisions (tech choices + versions)
- Section 5: Auth Architecture (WorkOS flows)
- Section 6: MCP Architecture (fastify-mcp pattern)
- Section 7: Project Structure (layer organization)
- Section 8: Dependencies (package versions)
- Section 11: Testing Strategy
- Section 12: CI/CD Pipeline
- Appendix A: Environment Variables

## Known Human-Required Steps

These require human action:
- WorkOS: Configure redirect URIs, CORS for local/staging
- Convex: Create project in dashboard
- Fly.io: Create app, set secrets
- Blacksmith: Connect GitHub repo
- Environment secrets: Generate and store COOKIE_SECRET, API keys

## Important Notes

- User already has 3 WorkOS environments (local, staging, prod) from previous project
- Real auth at all layers (not mocked locally)
- M0 = local + staging only, no prod
- No product functionality - just infrastructure proving layers connect
- Health check endpoints at each layer are the M0 "feature"

## Output

Create: `docs/M0-Checklist.md`

Start by reading the reference documents, then create the checklist following the format requirements above.
