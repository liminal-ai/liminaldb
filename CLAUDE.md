# PromptDB Development Notes

Use 'bd' for task tracking.

## Context Cleaning (Coding Agent Manager)

When context is high (>70%), clone your session to reduce tokens.

### Quick Clean (removes all tool calls + thinking)

```bash
bun run quick-clean <session-guid>
```

Returns: `claude --dangerously-skip-permissions --resume <new-session-id>`

Tell user to exit and run that command.

### Full Clone API

```bash
curl -X POST http://localhost:4010/api/v2/clone \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "<session-guid>",
    "toolRemoval": 100,
    "toolHandlingMode": "truncate",
    "thinkingRemoval": 100
  }'
```

Options:
- `toolRemoval`: 0-100 (percentage of turns from oldest)
- `toolHandlingMode`: "remove" | "truncate" (truncate keeps 3 lines/250 chars)
- `thinkingRemoval`: 0-100 (always use 100)

Extract session ID from response `outputPath`, return resume command to user.

**Important:** Clone only works between turns. User must exit current session and resume the cloned one.

## Troubleshooting

**"Connection refused"** - Coding Agent Manager not running on port 4010.

**"Session not found"** - Check session GUID.

**Verify service:** `curl http://localhost:4010/health`
