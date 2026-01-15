# PromptDB Development Notes

Personal prompt library accessible via web UI and MCP from any AI chat surface. Save prompts via natural language, retrieve from any MCP-enabled surface (Claude Code, Cursor, ChatGPT, VS Code).

## Core Operating Principles

### Context-Aware Assessment

When reviewing code or evaluating issues, do NOT use severity-based triage that dumps small items into "non-blocking / nice-to-have / later" buckets. That heuristic assumes future effort is cheap; with context loss between sessions, it's not.

Instead: If we have context and a fix is easy (<15 min), it goes on the "do now" list. Reserve "later" only for genuinely extensive work (significant rework, major effort that can't fit in this session).

Present the full list for user review before executing. The user validates what's actually worth doing and catches suggestions that seem reasonable but aren't. Don't self-filter small improvements into a "later" bucket.

## Project Overview

- **Stack:** Bun + Fastify + Convex + Redis + WorkOS
- **Auth:** WorkOS AuthKit (cookie for web, Bearer for MCP)
- **Tests:** 365 tests (`bun run test`)

## Directory Structure

```
src/
├── index.ts           # Fastify server entry
├── routes/            # REST + auth + app routes
├── lib/
│   ├── mcp.ts         # MCP server + tools
│   ├── convex.ts      # Convex client
│   └── auth/          # JWT validation
├── middleware/        # Auth middleware
└── ui/templates/      # HTML (shell, portlets)
convex/
├── schema.ts          # Database schema
├── prompts.ts         # Queries/mutations
└── model/             # Business logic
public/                # Static assets (CSS, JS)
tests/                 # service, integration, convex, ui
docs/
├── tech-arch/         # Architecture docs
└── project/           # Epics, stories
```

## Core Reference Files

| File | Purpose |
|------|---------|
| `docs/tech-arch/README.md` | Architecture overview |
| `docs/tech-arch/ui-patterns.md` | Shell/portlet UI patterns |
| `docs/tech-arch/auth.md` | Authentication deep dive |
| `convex/schema.ts` | Database schema |
| `src/lib/mcp.ts` | MCP tools definitions |
| `src/ui/templates/prompts.html` | Main prompts UI |

## Scripts

```bash
bun run dev            # Start server (watch mode)
bun run convex:dev     # Start local Convex
bun run test           # Unit/service tests
bun run test:integration  # Integration tests (requires local server)
bun run check          # Format + lint + typecheck + test
bun run check:local    # Full check + integration tests
bun run test:smoke     # Quick auth + API smoke tests
```

## Local Development & Verification

**Local development expects the local server running.** Keep `bun run dev` running in a terminal.

### Before Pushing to PR / Creating PR

Always run full local verification:
```bash
bun run check:local
```

This runs:
1. Format, lint, typecheck
2. Unit/service tests
3. Integration tests (against local server)

If local server isn't running, you'll see a warning. Start it with `bun run dev`.

### Why Integration Tests Matter

Integration tests run against the real server and catch issues that mocked tests miss:
- Schema validation (e.g., tag enums)
- API contract changes
- End-to-end flows

**Never skip integration tests before pushing.** CI runs them against staging after deploy - catching issues there means a broken deploy.

## Task Tracking (bd/beads)

Use `bd` for issue tracking. Issues chain together like beads.

```bash
bd list                    # List all issues
bd ready                   # Show unblocked work ready to claim
bd create "Title" -p 2     # Create issue (priority 0-4, 0=highest)
bd show <id>               # Show issue details
bd update <id> --status in_progress
bd close <id>
```

Dependencies:
```bash
bd dep add <id> <blocker>  # blocker must complete before id
bd dep tree <id>           # Visualize dependencies
```

## Context Cleaning (Coding Agent Manager)

When context is high (>70%), clone your session to reduce tokens.

```bash
curl -X POST http://localhost:4010/api/v2/clone \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<session-guid>",
    "toolRemoval": 100,
    "toolHandlingMode": "remove",
    "thinkingRemoval": 100
  }'
```

Extract session ID from response `outputPath`, return resume command to user:
`claude --dangerously-skip-permissions --resume <new-session-id>`

Options:
- `toolRemoval`: 0-100 (percentage of turns from oldest, default 100)
- `toolHandlingMode`: "remove" | "truncate" (default "remove")
- `thinkingRemoval`: 0-100 (default 100)

**Important:** Clone only works between turns. User must exit current session and resume the cloned one.

## Troubleshooting

**"Connection refused"** - Coding Agent Manager not running on port 4010.

**"Session not found"** - Check session GUID.

**Verify service:** `curl http://localhost:4010/health`
