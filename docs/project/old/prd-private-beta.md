# Product Requirements Document: LiminalDB Private Beta

## Vision

LiminalDB is a personal prompt library accessible via MCP from any AI chat surface (Claude Code, Cursor, VS Code, ChatGPT) and a web UI. Save prompts via natural language, retrieve from anywhere.

The product works today in local dev and staging. The goal of this initiative is to ship a private beta: real users on a production deployment, with the UX polish, infrastructure, and security posture to support invited beta testers.

**Why now:** A second contributor (Chandana) has joined and is already shipping. Lee is available to handle infrastructure and branding. There's momentum to capitalize on.

**What happens if we do nothing:** The app stays in staging-only limbo. No real users, no feedback loop, no iteration pressure.

## User Personas

### Lee (Product Owner / Infrastructure)
- Experienced tech lead, runs multiple projects
- Primary user of the prompt library via MCP from Claude Code
- Handles infrastructure, branding, content, security
- Orchestrates with Claude Code (Opus), implements with Codex

### Chandana (Contributor / Beta Tester)
- Getting into agentic coding and new technologies
- Uses Claude Code + VS Code + OpenAI Codex
- Plans with Opus/Claude Code, implements with Codex
- First external contributor; her experience onboarding is a signal for beta readiness

### Beta Users (Invited)
- Manually invited by Lee
- Technical users who work with AI chat surfaces daily
- Need prompts accessible from whichever tool they're in
- Zero tolerance for broken flows or data loss

## Initiative Scope

### In Scope
- Production deployment on Fly.io with custom domain
- Preview build infrastructure for PR-based deploys
- UX bug fixes and polish for core workflows
- View mode simplification
- Edit/insert form modernization
- Export and import of prompt libraries (Chandana, already in progress)
- Tag system revamp (per-user tags replacing fixed global set)
- Landing/onboarding content pass
- Help sections with LLM-readable API documentation
- Code review and security audit
- Pin/favorite prompt UI with tier sorting

### Out of Scope
- Payment tiers or billing
- Open signups (invite-only)
- Team/org features (multi-tenant)
- E2E browser testing (Playwright)
- Mobile-responsive UI (desktop-first for beta)

### Stretch
- Public REST API with API key management
- Agent-friendly CLI tool

## Feature Overview

### Epic 1: Prod & Preview Infrastructure
**Owner:** Lee
**Summary:** Stand up production deployment and per-PR preview builds. LiminalDB currently runs on `promptdb-staging.fly.dev`. This epic creates the production environment on `liminaldb.com` with a full parallel stack (Fly.io prod, Convex prod cloud, WorkOS prod), plus preview builds that spin up per-PR for verification before merge.

**Key items:**
- Fly.io production app with custom domain (`liminaldb.com`, alias `db.liminalbuilder.com`)
- Convex production cloud deployment (same project, prod environment)
- WorkOS production environment wiring (3 envs: localdev, staging, prod)
- Tag-triggered manual deploy workflow (push tag to main triggers prod deploy)
- Per-PR Fly.io preview machines with Convex preview deployments
- WorkOS staging reuse for previews (wildcard redirect URIs)
- Branding cleanup (fly.toml still references `promptdb-staging`, env vars say `PromptDB`)
- CI workflow updates for preview build lifecycle

**Environment topology:**

| | Local | Staging | Prod | Preview |
|---|---|---|---|---|
| App | localhost:5001 | promptdb-staging.fly.dev | liminaldb.com | PR-specific Fly URL |
| Convex | Local backend | Staging cloud | Prod cloud | Convex preview |
| WorkOS | localdev | staging | prod | staging (shared) |
| Deploy | Manual | Push to main | Tag on main | PR open/update |

---

### Epic 2: UX Bugs & Polish
**Owner:** Chandana
**Summary:** Fix broken interactions and modernize the prompt editing experience. The core read/edit/create workflow has several bugs and rough edges that would block beta users.

**Bugs:**
- **Edit mode stacking:** Selecting a different prompt while in edit mode loads the new prompt in view mode below the edit form. Edit state is not torn down. Discard/Save buttons become unreachable. Selecting multiple prompts stacks multiple views.
- **Search bar width:** Search input in the shell header spans ~50% of viewport. Should be ~200-250px max.

**UX Refinements:**
- **Simplify view modes:** Remove Rendered/Plain mode selector. Default to Semantic view only. Keep Line Edit as a standalone toggle. Removes a decision point that doesn't serve users.
- **Edit/insert form modernization:** Current form inputs are unstyled browser defaults. Needs: styled inputs with rounded corners/padding/focus rings, visual hierarchy between field labels, monospace content textarea for structured prompt text, consistent vertical spacing, card/panel container for the form, sticky or anchored Discard/Save action bar.
- **User identity in header:** Replace raw email string with a user menu (avatar/initials) that includes logout action.
- **Pin/favorite UI:** Visual indicators in sidebar for pinned and favorited prompts. Ability to pin/favorite from prompt viewer header (existing buttons need visual polish). Tier sorting in sidebar: pinned first, then favorited, then rest, usage-sorted within each tier. (Backend already supports `pinned`, `favorited`, `usageCount` fields and ranking weights.)

---

### Epic 3: Tag System Revamp
**Owner:** Chandana
**Summary:** Replace the fixed global tag system (19 tags across 3 dimensions) with user-owned tags. New accounts get seeded with a starter set; users can then create, edit, and delete their own tags.

**Key items:**
- Schema migration: tags become per-user, not global
- Seed new accounts with default starter tags
- Tag CRUD: create new tags, rename, delete (with prompt reassignment or orphan handling)
- Decide whether to keep dimensions (purpose/domain/task) or flatten to a single tag namespace
- MCP tool updates (`save_prompts`, `update_prompt`, `search_prompts`, `list_tags`)
- Tag selector UI updates for user-owned tags
- Migration path for existing data (current global tags → user-owned copies)

---

### Epic 4: Content, Branding & Security
**Owner:** Lee
**Summary:** Polish the landing/onboarding content, add LLM-readable help documentation, and conduct security and code review before inviting beta users.

**Key items:**
- **Landing/onboarding content pass:** Home, Getting Started, AI Assistants, Code Editors, Developer, Help tabs are all placeholder. Needs real content that communicates the product value and gets users set up.
- **Help sections with LLM-readable API docs:** Help content should include structured text that LLMs can consume to understand how to use the LiminalDB API (llms.txt style or structured reference). This enables LLM tools to self-serve API usage without human intervention.
- **Deep code review:** Overall quality, consistency, and correctness audit across the codebase.
- **Security audit:** Auth flows, input validation, data isolation, cookie security, Convex access patterns. Must pass before real users hit production. Particular attention to: RLS enforcement, API key handling, JWT validation, CORS configuration.

---

### Epic 5 (Stretch): Public API & CLI
**Owner:** Chandana
**Summary:** Expose a public REST API with API key authentication and build an agent-friendly CLI wrapper. This extends LiminalDB beyond MCP-only access.

**Key items:**
- **API key management:** User-facing UI to generate and revoke API keys. Stored securely. Check if WorkOS offers a CLI/device OAuth flow as an alternative or complement.
- **REST API endpoints:** Public API that mirrors MCP tool functionality (list, get, save, update, delete, search prompts) but accessible via API key auth. Not dependent on MCP protocol.
- **CLI tool:** Thin wrapper over the REST API. Agent-ergonomic: structured JSON output by default, clean exit codes, pipe-friendly. Unix utility style. Reference: `~/code/agent-cli-utils/ccs-cloner` for ergonomic patterns.
- **Dependency:** CLI depends on API key + REST API stories shipping first.

---

## Architectural / Operational Considerations

### Infrastructure
- Fly.io VPS (no cold starts) for all environments
- Convex cloud with local/staging/prod/preview deployments from single project
- WorkOS AuthKit with 3 environments + wildcard redirects for previews
- Blacksmith CI runners (already configured)
- Vercel DNS for domain management (liminaldb.com already registered on praxen team)

### Security
- Defense in depth: Fastify auth boundary + Convex user scoping + RLS rules
- All data access scoped to authenticated user
- HttpOnly cookies for web, Bearer tokens for MCP
- Security audit required before beta users (Epic 4)

### Testing
- 423 unit/service tests currently passing
- Integration tests run post-deploy against staging
- Preview builds should run integration tests before merge
- No E2E (Playwright) in scope for beta

### Frontend
- Vanilla HTML + JS (no framework) — intentionally model-friendly
- Shell + portlet (iframe) architecture
- Semantic view mode as the single default (removing Rendered/Plain)

## Success Metrics

### User Outcomes
- Beta users can save a prompt from MCP and retrieve it within 30 seconds
- Zero data loss incidents during beta
- Core workflow (list, view, edit, save) has no blocking bugs

### Business Outcomes
- Production running on liminaldb.com with real users
- At least 3 beta users actively using the product
- Chandana is productive and shipping independently

### Operational Outcomes
- Preview builds working for every PR
- CI catches regressions before merge
- Security audit complete with no critical findings

## Risks and Open Questions

| Risk | Mitigation |
|------|------------|
| Convex preview deployments may have cold start or provisioning delays | Test preview lifecycle early in Epic 1 |
| Tag system revamp touches schema, model, MCP, and UI simultaneously | Epic 3 should be sequenced after Epic 2 stabilizes the UI |
| WorkOS wildcard redirects for previews may have edge cases | Validate early with a manual preview deploy |
| Stretch epics (API/CLI) depend on auth decisions that affect core product | Resolve API key vs OAuth approach in Epic 5 design phase before implementation |

### Open Questions
- Tag dimensions: keep purpose/domain/task grouping for user-owned tags, or flatten?
- Preview build cleanup: auto-destroy Fly machines on PR close, or manual?
- API key scoping: full access or per-capability permissions?

## Epic Priority and Sequencing

```
Epic 1 (Prod & Preview) ──────────────┐
                                       ├── Beta Launch
Epic 2 (UX Bugs & Polish) ────────────┤
                                       │
Epic 4 (Content, Branding & Security) ─┘

Epic 3 (Tag Revamp) ── after Epic 2 UI stabilizes

Epic 5 (Stretch: API & CLI) ── after core beta is solid
```

**Parallel tracks:**
- Lee: Epic 1 → Epic 4
- Chandana: Export/Import (in progress) → Epic 2 → Epic 3 → Epic 5
