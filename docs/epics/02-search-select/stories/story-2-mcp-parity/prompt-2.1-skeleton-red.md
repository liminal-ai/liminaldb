# Prompt 2.1: Skeleton + TDD Red

**Story:** MCP Parity (Story 2)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Create MCP tool stubs and write tests that assert MCP routing/argument wiring using the **existing repo MCP test harness** (`tests/service/prompts/mcpTools.test.ts`).

This is a **TDD Red** step: tests should fail because the stubs do not yet call Convex or return the expected success payloads. Functional behavior is implemented in Prompt 2.2.

## Prerequisites

Story 1 must be complete — these Convex queries/mutations exist and work:
- `listPromptsRanked()`
- `searchPrompts()`
- `updatePromptFlags()`
- `trackPromptUse()`
- `listTags()`
- All 298 tests PASS (278 + 20 from Story 1)

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-43..50, AC-21
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 5: MCP Tool Parity

---

## Deliverables

### MCP Tool Stubs — Modify `src/lib/mcp.ts`

Add these new MCP tools using the existing `registerTool` pattern in `src/lib/mcp.ts` (same file that currently defines `save_prompts`, `get_prompt`, `delete_prompt`).

**Important repo notes:**
- This MCP server extracts user ID from `extra.authInfo.extra.userId` (see existing helpers in `src/lib/mcp.ts`).
- The repo uses a Convex HTTP client wrapper (`src/lib/convex.ts`) and passes `apiKey: config.convexApiKey` + `userId` into Convex calls.
- Tools should return JSON in `content[0].text` (stringified) for test parsing.

```typescript
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
  async (_args, _extra) => {
    throw new Error("NotImplementedError: list_prompts not implemented");
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
  async (_args, _extra) => {
    throw new Error("NotImplementedError: search_prompts not implemented");
  }
);

// list_tags - Returns user's unique tags
server.registerTool(
  "list_tags",
  {
    title: "List Tags",
    description: "List all unique tags used by this user's prompts",
  },
  // NOTE: when no inputSchema is defined, the handler signature is (extra) not (args, extra)
  async (_extra) => {
    throw new Error("NotImplementedError: list_tags not implemented");
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
  async (_args, _extra) => {
    throw new Error("NotImplementedError: update_prompt not implemented");
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
  async (_args, _extra) => {
    throw new Error("NotImplementedError: track_prompt_use not implemented");
  }
);
```

---

## Tests to Write

### `tests/service/prompts/mcpTools.test.ts` — add Story 2 tests (MODIFY EXISTING FILE)

**TC-19, TC-41..48**

Extend the existing Fastify + `/mcp` tests using the **repo’s existing helpers**:
- `createApp()` (registers `registerMcpRoutes(app)`).
- `callTool(app, name, args, token?)` (sends JSON-RPC request with the required `Accept` header for SSE).
- `readToolResult(response)` (parses JSON from `content[0].text`).

**Do not use** `createMockDeps`, `lastToolCall`, or `mockToolResponse` — those do not exist in this repo.

```typescript
describe("MCP Tools - list_prompts", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.query.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-41: returns ranked prompts", async () => {
    // In red phase, this should fail until list_prompts is implemented.
    // The green phase should set this to a ranked prompt list.
    mockConvex.query.mockResolvedValue([{ slug: "a" }]);

    const response = await callTool(
      app,
      "list_prompts",
      {},
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    // Green should call Convex listPromptsRanked with { apiKey, userId, limit? }.
    expect(mockConvex.query).toHaveBeenCalled();
  });

  test("TC-42: respects limit parameter", async () => {
    mockConvex.query.mockResolvedValue([]);

    const response = await callTool(
      app,
      "list_prompts",
      { limit: 5 },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.query).toHaveBeenCalled();
  });
});

describe("MCP Tools - search_prompts", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.query.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-43: returns matching prompts for query", async () => {
    mockConvex.query.mockResolvedValue([{ slug: "sql" }]);

    const response = await callTool(
      app,
      "search_prompts",
      { query: "sql" },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.query).toHaveBeenCalled();
  });

  test("TC-44: filters by tags", async () => {
    mockConvex.query.mockResolvedValue([]);

    const response = await callTool(
      app,
      "search_prompts",
      { query: "test", tags: ["sql", "database"] },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.query).toHaveBeenCalled();
  });
});

describe("MCP Tools - list_tags", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.query.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-45: returns unique tags", async () => {
    mockConvex.query.mockResolvedValue(["a", "b"]);

    const response = await callTool(
      app,
      "list_tags",
      {},
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.query).toHaveBeenCalled();
  });
});

describe("MCP Tools - update_prompt", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.mutation.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-46: updates prompt by slug", async () => {
    mockConvex.mutation.mockResolvedValue(true);
    mockConvex.query.mockResolvedValue({
      slug: "test-prompt",
      name: "Old",
      description: "Old",
      content: "Old",
      tags: [],
    });

    const response = await callTool(
      app,
      "update_prompt",
      { slug: "test-prompt", name: "Updated" },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.mutation).toHaveBeenCalled();
  });
});

describe("MCP Tools - errors", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.mutation.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-47: returns clear error message on failure", async () => {
    mockConvex.query.mockResolvedValue(null);

    const response = await callTool(
      app,
      "update_prompt",
      { slug: "bad", name: "Bad" },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    // Green should return isError: true + a clear message like "Prompt not found".
  });
});

describe("MCP Tools - track_prompt_use", () => {
  let app: Awaited<ReturnType<typeof createApp>>;

  beforeEach(async () => {
    mockConvex.mutation.mockClear();
    app = await createApp();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-19 / TC-48: increments usage count", async () => {
    mockConvex.mutation.mockResolvedValue(true);

    const response = await callTool(
      app,
      "track_prompt_use",
      { slug: "test-prompt" },
      createTestJwt({ sub: "user_123" }),
    );

    expect(response.statusCode).toBe(200);
    expect(mockConvex.mutation).toHaveBeenCalled();
  });
});
```

---

## Constraints

- Do not implement actual functionality - stubs throw errors
- Do not modify Story 1 Convex files (they should be implemented)
- MCP tools should call Convex queries/mutations (when implemented)
- Tests assert MCP routing/argument wiring via the mocked transport
- Existing 298 tests must continue to pass

## Verification

```bash
bun run typecheck   # Should pass
bun run test --project service tests/service/prompts/mcpTools.test.ts
```

## Done When

- [ ] 5 MCP tool stubs added to `src/lib/mcp.ts`
- [ ] `tests/service/prompts/mcpTools.test.ts` extended with Story 2 tests (TC-19, TC-41..48)
- [ ] Story 2 tests are RED (failing) because stubs do not yet call Convex / return success payloads
- [ ] Existing test suite remains green once Story 2 tests are excluded (or until green phase completes)
- [ ] TypeScript compiles

After completion, summarize: which files were modified and which TCs are covered by the new tests.
