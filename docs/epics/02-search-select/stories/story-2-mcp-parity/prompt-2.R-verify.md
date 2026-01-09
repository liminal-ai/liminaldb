# Prompt 2.R: Verify MCP Parity (Story 2)

**Target Model:** GPT-5.2

**Story:** MCP Parity (Story 2)

**Working Directory:** `/Users/leemoore/promptdb`

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md`
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md`
- Story: `docs/epics/02-search-select/stories/story-2-mcp-parity/story.md`
- Skeleton Prompt: `docs/epics/02-search-select/stories/story-2-mcp-parity/prompt-2.1-skeleton-red.md`
- Green Prompt: `docs/epics/02-search-select/stories/story-2-mcp-parity/prompt-2.2-green.md`

## Objective

Verify MCP tools provide parity with web UI for search, list, update, tags, and usage tracking.

## Output Requirements (GPT-5.2)

- Provide a 1-paragraph summary.
- Then provide a checklist with Pass/Fail for each section below.
- If anything fails or is blocked, add a short **Fixes** section with concrete next steps.

---

## AC Coverage

| AC | Description | Verification Method |
|----|-------------|---------------------|
| AC-43 | `list_prompts` returns ranked prompts | TC-41 (automated) |
| AC-44 | `list_prompts` supports limit | TC-42 (automated) |
| AC-45 | `search_prompts` supports query | TC-43 (automated) |
| AC-46 | `search_prompts` supports tags | TC-44 (automated) |
| AC-47 | `list_tags` returns tags | TC-45 (automated) |
| AC-48 | `update_prompt` updates prompt | TC-46 (automated) |
| AC-49 | MCP errors are clear | TC-47 (automated) |
| AC-50 | `track_prompt_use` increments usage | TC-48 (automated) |
| AC-21 | MCP usage tracking matches web | TC-19 (automated) |

---

## Verification Commands

```bash
bun run typecheck
bun run test --project service tests/service/prompts/mcpTools.test.ts
```

## Automated Tests

All of these should PASS:

| Test File | TCs | Expected |
|-----------|-----|----------|
| `tests/service/prompts/mcpTools.test.ts` | TC-19, TC-41..48 | 9 tests |
| **Story 2 Total** | | **9 tests** |
| **Running Total** | | **307 tests** |

## Manual Verification

Requires a valid auth token. Example uses JSON-RPC over `/mcp` with required Accept header.

```bash
curl -sS http://localhost:5001/mcp \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"list_prompts","arguments":{}},"id":1}'
```

Note: Response is SSE. Expect `event: message` lines with JSON inside `data: ...`.

Repeat with:
- `search_prompts` (query + tags)
- `list_tags`
- `update_prompt`
- `track_prompt_use`

---

## Checklist

### Automated
- [ ] All 9 Story 2 tests pass
- [ ] Running total 307 tests pass
- [ ] `bun run typecheck` passes

### Implementation Details
- [ ] MCP tools registered in `src/lib/mcp.ts` with correct names
- [ ] MCP user ID derived from `extra.authInfo.extra.userId`
- [ ] Convex calls include `config.convexApiKey` and `userId`
- [ ] `update_prompt` supports flags + content updates
- [ ] `track_prompt_use` calls the same Convex mutation as web usage tracking
- [ ] Errors are sanitized before returning to client

### Manual
- [ ] `list_prompts` returns ranked list
- [ ] `search_prompts` filters by query and tags
- [ ] `list_tags` returns user tags
- [ ] `update_prompt` updates prompt data
- [ ] `track_prompt_use` increments usage

---

## Story 2 Complete When

All checklist items pass and no blockers remain.
