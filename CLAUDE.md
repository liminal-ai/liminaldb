# PromptDB Development Notes

## Context Cleaning

When the user provides a session GUID and asks to reduce context, clean the session, or remove tool calls:

```bash
bun run quick-clean <session-guid>
```

This clones the session with all tool calls and thinking blocks removed. Returns a command like:
```
claude --dangerously-skip-permissions --resume <new-session-id>
```

Show this command to the user. They must exit the current session and run that command to continue with reduced context.

## Troubleshooting

**"Connection refused"** - The Coding Agent Manager service isn't running on port 7331.

**"Session not found"** - Check the session GUID is correct.

**Verify service:**
```bash
curl http://localhost:4010/health
```
