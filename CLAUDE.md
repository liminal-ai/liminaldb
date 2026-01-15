# PromptDB Development Notes

Personal prompt library accessible via web UI and MCP from any AI chat surface. Save prompts via natural language, retrieve from any MCP-enabled surface (Claude Code, Cursor, ChatGPT, VS Code).

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
bun run test           # All tests
bun run check          # Format + lint + typecheck + test
bun run test:smoke     # Quick auth + API smoke tests
```

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
