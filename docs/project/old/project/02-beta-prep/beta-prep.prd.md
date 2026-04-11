# PRD: Beta Prep

This document defines the features and scope required to prepare LiminalDB for closed beta release.

**Audience:** Product planning, development agents, anyone picking up beta-prep work.

**Contents:** Two features with groupings of functionality under each. This PRD will be elaborated into feature specs before implementation.

---

## Context

LiminalDB is a prompt library with web interface and MCP integration. Users save prompts once and access them from any MCP-enabled chat surface - Claude Code, Cursor, ChatGPT, VS Code, and others.

The core prompts functionality is built and working:
- Web UI for creating, editing, searching, and organizing prompts
- MCP tools for accessing prompts from chat surfaces
- Search with ranking (usage, recency, favorites)
- Durable drafts that survive browser refresh
- Authentication via WorkOS

What's missing for beta: production infrastructure, polish based on real usage, and documentation so users can actually set it up. The product works in development but isn't ready to put in front of real people.

---

## Milestone

**Closed Beta: Friends & Family**

Get LiminalDB into the hands of trusted testers. These are technical users (developers, AI power users) who will use the product for real work and provide feedback.

Success means:
- Users can sign up and authenticate
- Users can create, search, and organize prompts via web UI
- Users can connect their preferred MCP client and access prompts from chat
- Users can import their existing prompts
- The experience feels intentional, not half-baked

---

## Feature 1: UX Polish & Import/Export

The prompts functionality works, but it was built fast. Before putting it in front of real users, we need to smooth rough edges and add missing table-stakes features.

### Search & Data Entry Refinement

Search and prompt creation/editing work, but they haven't been tested with realistic usage patterns. This grouping covers tuning based on actual use.

Search relevance needs validation: when a user searches for "sql query helper", do the right prompts surface? The ranking algorithm weights usage, recency, and favorites - but the weights may need adjustment based on real behavior.

Data entry needs a critical eye: is the flow for creating a new prompt smooth? Are error messages clear when validation fails? Do edge cases (very long prompts, special characters, duplicate slugs) behave gracefully?

Performance should be validated under realistic data loads - a user with a large library should have the same snappy experience as someone just getting started.

### Theming

The app currently has only a dark theme. Theme options are table stakes for a developer-focused tool - users have different visual preferences and work in different environments.

This includes implementing several themes (including light and dark options), adding a theme selector in the UI, and persisting the user's choice across sessions.

### Prompt Import/Export

New users shouldn't start with an empty library. Many potential users already have prompts scattered across files, notes, or other tools. They need a way to bring that content in.

Export matters too - users should feel confident that their data isn't trapped. If they want to leave or back up their prompts, they can.

The format should be JSON for structured data. Import needs clear validation and error messages when something's wrong with the file. Duplicate handling needs a decision: skip duplicates, auto-rename, or let the user choose.

### OpenAI PIP Integration

The existing web UI can be loaded as a PIP (picture-in-picture) form within ChatGPT via MCP tool call. This extends reach to users who primarily work in that surface.

This is not a native OpenAI SDK widget - it's the same web app in a different context. Work involves ensuring shell/portlet functions correctly in the PIP viewport, handling authentication in that context, and enabling prompt selection to flow back to chat.

---

## Feature 2: Infrastructure & E2E Testing

The app runs locally and on a staging environment, but there's no production deployment. Before beta users can access it, we need real infrastructure. And before we ship anything, we need end-to-end tests to catch regressions that unit tests miss.

### Production Deployment

LiminalDB needs to run on infrastructure that beta users can access via a real URL. This means deploying to Fly.io (server), connecting to Convex cloud (database), managing secrets properly, and setting up domains.

The deployment should include basic health checks so we know when something's broken. It doesn't need sophisticated monitoring for beta, but we shouldn't be blind.

### Preview Deploys

For fast iteration during beta-prep (and beyond), we want preview deployments - temporary environments spun up for each PR or branch. This lets us test changes in a real environment before merging.

Preview deploys need their own database state or a shared staging database. GitHub Actions triggers the deploy. Each preview gets a predictable URL.

### Database Seeding

Testing requires realistic data. We need scripts to clear test data and seed a fresh set of sample prompts that exercise the full feature set - various tags, different content lengths, prompts with usage history for ranking.

These scripts run in CI for preview deploys and can be run manually for local development. The seed data should be realistic enough to catch issues but not so large that it slows down tests.

### E2E Testing

The current test suite has service tests and integration tests, but no end-to-end browser tests. E2E tests complete the testing pyramid - they catch issues that only appear when the full stack runs together in a real browser.

Playwright is the tool. Critical paths to test: authentication flow, creating a prompt through the web UI, searching and selecting prompts, editing a prompt, and the core MCP operations (list, get, save). These tests run on preview builds in CI, on staging after merge, and as smoke tests on production deploys.

---

## Out of Scope

- **Skills functionality** - Covered in a separate PRD. Skills come after prompts are solid.
- **User documentation** - Setup guides and help docs deferred.
- **Mobile optimization** - Desktop-first for beta.
