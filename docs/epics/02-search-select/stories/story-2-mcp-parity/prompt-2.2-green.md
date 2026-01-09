# Prompt 2.2: TDD Green

**Story:** MCP Parity (Story 2)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the MCP tool handlers to make all Story 2 tests pass.

## Prerequisites

Prompt 2.1 must be complete — stubs and tests in place:
- `src/lib/mcp.ts` — 5 tool stubs (list_prompts, search_prompts, list_tags, update_prompt, track_prompt_use)
- `tests/service/prompts/mcpTools.test.ts` — 9 new tests (ERROR)
- Story 1 Convex queries/mutations implemented and working

## Reference Documents

- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 5: MCP Tool Parity
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-43..50

---

## Deliverables

### Implement MCP Tools — `src/lib/mcp.ts`

Replace stubs with implementations that call existing Convex queries/mutations:

```typescript
import { convex } from "./convex";
import { config } from "./config";
import { api } from "../../convex/_generated/api";

// list_prompts - Returns ranked prompts with optional limit
server.registerTool(
  "list_prompts",
  {
    title: "List Prompts",
    description: "List prompts sorted by ranking (usage, recency, pinned, favorited)",
    inputSchema: {
      limit: z.number().optional().describe("Maximum number of prompts to return"),
    },
  },
  async (args, extra) => {
    const userId = getUserIdFromExtra(extra);

    const prompts = await convex.query(api.prompts.listPromptsRanked, {
      apiKey: config.convexApiKey,
      userId,
      limit: args.limit,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ prompts }),
        },
      ],
    };
  }
);

// search_prompts - Search with query and optional tags
server.registerTool(
  "search_prompts",
  {
    title: "Search Prompts",
    description: "Search prompts by query string with optional tag filter",
    inputSchema: {
      query: z.string().describe("Search query to match against prompt content"),
      tags: z.array(z.string()).optional().describe("Filter by tags (ANY-of)"),
      limit: z.number().optional().describe("Maximum number of results"),
    },
  },
  async (args, extra) => {
    const userId = getUserIdFromExtra(extra);

    const prompts = await convex.query(api.prompts.searchPrompts, {
      apiKey: config.convexApiKey,
      userId,
      query: args.query,
      tags: args.tags,
      limit: args.limit,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ prompts }),
        },
      ],
    };
  }
);

// list_tags - Returns user's unique tags
server.registerTool(
  "list_tags",
  {
    title: "List Tags",
    description: "List all unique tags used by this user's prompts",
    inputSchema: {},
  },
  async (_args, extra) => {
    const userId = getUserIdFromExtra(extra);

    const tags = await convex.query(api.prompts.listTags, {
      apiKey: config.convexApiKey,
      userId,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ tags }),
        },
      ],
    };
  }
);

// update_prompt - Modify existing prompt by slug
server.registerTool(
  "update_prompt",
  {
    title: "Update Prompt",
    description: "Update an existing prompt by slug",
    inputSchema: {
      slug: SlugSchema.describe("The prompt slug to update"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      content: z.string().optional().describe("New content"),
      tags: z.array(z.string()).optional().describe("New tags"),
      pinned: z.boolean().optional().describe("Pin/unpin the prompt"),
      favorited: z.boolean().optional().describe("Favorite/unfavorite the prompt"),
    },
  },
  async (args, extra) => {
    const userId = getUserIdFromExtra(extra);
    const { slug, pinned, favorited, ...contentUpdates } = args;

    // Handle flag updates separately
    if (pinned !== undefined || favorited !== undefined) {
      await convex.mutation(api.prompts.updatePromptFlags, {
        apiKey: config.convexApiKey,
        userId,
        slug,
        pinned,
        favorited,
      });
    }

    // Handle content updates if any
    const hasContentUpdates = Object.values(contentUpdates).some((v) => v !== undefined);
    if (hasContentUpdates) {
      await convex.mutation(api.prompts.updatePrompt, {
        apiKey: config.convexApiKey,
        userId,
        slug,
        ...contentUpdates,
      });
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ updated: true }),
        },
      ],
    };
  }
);

// track_prompt_use - Increment usage count
server.registerTool(
  "track_prompt_use",
  {
    title: "Track Prompt Use",
    description: "Track that a prompt was used (increments usage count and updates last-used timestamp)",
    inputSchema: {
      slug: SlugSchema.describe("The prompt slug that was used"),
    },
  },
  async (args, extra) => {
    const userId = getUserIdFromExtra(extra);

    await convex.mutation(api.prompts.trackPromptUse, {
      apiKey: config.convexApiKey,
      userId,
      slug: args.slug,
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success: true }),
        },
      ],
    };
  }
);
```

**Helper function** (add near existing helpers):

```typescript
function getUserIdFromExtra(extra: { authInfo?: { extra?: unknown } }): string {
  const userInfo = extra.authInfo?.extra as { userId?: string } | undefined;
  const userId = userInfo?.userId;
  if (!userId) {
    throw new Error("User not authenticated");
  }
  return userId;
}
```

---

## Constraints

- Do not modify Convex queries/mutations (Story 1 complete)
- Do not implement draft routes (Story 3)
- Do not modify UI files (Stories 4-5)
- Follow existing MCP tool patterns in the file

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # All 307 tests should PASS
```

### Manual Verification

Using MCP inspector or CLI:

1. `list_prompts` with limit: Returns ranked prompts
2. `search_prompts` with query: Returns matching prompts
3. `search_prompts` with tags: Filters by tags (ANY-of)
4. `list_tags`: Returns unique tags
5. `update_prompt` with pinned: Updates pin status
6. `track_prompt_use`: Increments usage count

## Done When

- [ ] All 307 tests PASS (298 + 9)
- [ ] TypeScript compiles
- [ ] MCP tools callable and return expected data
- [ ] No console errors

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
