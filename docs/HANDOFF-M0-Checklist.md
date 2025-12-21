# Handoff: M0 Production Hello World Checklist

**Date:** 2025-12-21
**From:** Architecture planning session (Winston + John party mode)
**To:** Implementation agent

---

## Objective

Create a comprehensive M0 implementation checklist document that sequences the production hello world setup from zero to fully verified local and staging environments.

---

## Document Requirements

### Format
- **Checklist format** - not standard feature/story format
- **Properly sequenced** - dependencies flow naturally
- **Grouped appropriately** - logical clusters of related work
- **Actor tagged** - each step marked as `[MODEL]` or `[HUMAN]` indicating who executes

### Content Per Step
- **What it needs** - prerequisites, inputs, context
- **What it produces** - outputs, artifacts, state changes
- **Reference** - inline context OR link to architecture doc section

### Content Per Group
- **Group purpose** - what this cluster accomplishes
- **Architecture reference** - link to relevant section(s) in `docs/architecture.md`
- **External links** - documentation URLs for tools/services being configured

### Final Sections
After the main construction checklist:

1. **Local Environment Done Checklist**
   - All automated tests that must pass
   - All manual verifications to perform
   - Expected state when complete

2. **Staging Environment Done Checklist**
   - All automated tests that must pass
   - All manual verifications to perform
   - Expected state when complete

---

## Architecture Reference

The approved architecture document is at `docs/architecture.md`. Key sections for M0:

| Section | Relevance to M0 |
|---------|-----------------|
| 3. System Overview | High-level architecture diagram |
| 4. Core Decisions | All technology choices with versions |
| 5. Auth Architecture | WorkOS setup, JWT flows |
| 6. MCP Architecture | fastify-mcp integration |
| 7. Project Structure | Layer organization |
| 8. Dependencies | Package versions, external services |
| 11. Testing Strategy | Testing pyramid |
| 12. CI/CD Pipeline | Blacksmith deployment |
| Appendix A | Environment variables |

---

## M0 Scope Summary

From the architecture doc, M0 delivers:

**Stack wired end-to-end:**
- Fastify + Bun server running
- Convex schema deployed
- WorkOS auth configured (local + staging environments)
- MCP endpoint responding
- Static widget serving

**Deployed to staging:**
- Fly.io staging instance
- Convex staging deployment
- Blacksmith CI/CD pipeline (merge to main = deploy)

**Testing pyramid:**
- Unit tests for utilities
- Integration tests for Convex connectivity
- Integration tests for MCP protocol
- Auth flow verification

**No product functionality** - just infrastructure proving all layers connect.

---

## Key External Documentation

| Tool | Docs URL |
|------|----------|
| Bun | https://bun.sh/docs |
| Fastify | https://fastify.dev/docs/latest/ |
| Convex | https://docs.convex.dev/ |
| WorkOS AuthKit | https://workos.com/docs/user-management |
| MCP SDK | https://modelcontextprotocol.io/docs |
| fastify-mcp | https://github.com/haroldadmin/fastify-mcp |
| Fly.io | https://fly.io/docs/ |
| Blacksmith | https://blacksmith.sh/docs |
| Biome | https://biomejs.dev/guides/getting-started/ |

---

## Human-Required Steps (Known)

The following require human action (account setup, secrets, external config):

1. **WorkOS** - Configure redirect URIs, CORS origins for local/staging environments
2. **Convex** - Create project, get deployment URLs
3. **Fly.io** - Create app, configure secrets
4. **Blacksmith** - Connect to GitHub repo
5. **Domain** - DNS configuration (if custom domain for staging)

---

## Notes from Planning Session

- User has existing 3 WorkOS environments (local, staging, prod) from previous project - just needs reconfiguration
- Prefer real auth at all layers (not mock auth locally)
- M0 is local + staging only, no prod deployment
- Cost target: ~$5/mo for M0 (staging only)
- Model-friendly architecture is explicit NFR - prefer patterns models handle well

---

## Execution

When creating the checklist document:

1. Read `docs/architecture.md` thoroughly
2. Read `docs/product-brief.md` for product context
3. Sequence from empty repo state to verified staging deployment
4. Mark each step with `[MODEL]` or `[HUMAN]`
5. Include all verification steps in the Done checklists
6. Link to architecture sections and external docs throughout

Output file: `docs/M0-Checklist.md`
