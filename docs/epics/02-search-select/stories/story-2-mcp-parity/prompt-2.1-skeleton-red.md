# Prompt 2.1: Skeleton + TDD Red

**Story:** MCP Parity (Story 2)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Create MCP tool stubs and write tests that assert MCP routing/argument wiring. Note: these tests use the mocked MCP transport in `tests/service/prompts/mcpTools.test.ts`, so they validate request/argument flow and may pass even before tool handlers are implemented. Functional behavior is exercised in green phase.

## Prerequisites

Story 1 must be complete — these Convex queries/mutations exist and work:
- `listPromptsRanked()`
- `searchPrompts()`
- `updatePromptFlags()`
- `trackPromptUse()`
- `listTags()`
- All 291 tests PASS (278 + 13 from Story 1)

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-43..50, AC-21
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 5: MCP Tool Parity

---

## Deliverables

### MCP Tool Stubs — Modify `src/lib/mcp.ts`

Add these new MCP tools using the existing `registerTool` pattern:

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
    inputSchema: {},
  },
  async (_args, _extra) => {
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

### `tests/service/prompts/mcpTools.test.ts` — 9 tests (MODIFY EXISTING FILE)

**TC-19, TC-41..48**

Extend the existing Fastify + `/mcp` tests (same pattern as `save_prompts` / `get_prompt` / `delete_prompt`): each new describe block should create its own `app` with `registerMcpRoutes` and `createMockDeps()`.

```typescript
describe("MCP Tools - list_prompts", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.query.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-41: returns ranked prompts", async () => {
    mockToolResponse = { prompts: [{ slug: "a" }] };

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "list_prompts", arguments: {} },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(lastToolCall?.name).toBe("list_prompts");
  });

  test("TC-42: respects limit parameter", async () => {
    mockToolResponse = { prompts: [] };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "list_prompts", arguments: { limit: 5 } },
        id: 1,
      },
    });

    expect(lastToolCall?.args).toEqual({ limit: 5 });
  });
});

describe("MCP Tools - search_prompts", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.query.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-43: returns matching prompts for query", async () => {
    mockToolResponse = { prompts: [{ slug: "sql" }] };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "search_prompts", arguments: { query: "sql" } },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("search_prompts");
    expect(lastToolCall?.args).toEqual({ query: "sql" });
  });

  test("TC-44: filters by tags", async () => {
    mockToolResponse = { prompts: [] };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "search_prompts",
          arguments: { query: "test", tags: ["sql", "database"] },
        },
        id: 1,
      },
    });

    expect(lastToolCall?.args).toEqual({
      query: "test",
      tags: ["sql", "database"],
    });
  });
});

describe("MCP Tools - list_tags", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.query.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-45: returns unique tags", async () => {
    mockToolResponse = { tags: ["a", "b"] };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "list_tags", arguments: {} },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("list_tags");
  });
});

describe("MCP Tools - update_prompt", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.mutation.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-46: updates prompt by slug", async () => {
    mockToolResponse = { updated: true };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "update_prompt", arguments: { slug: "test-prompt", name: "Updated" } },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("update_prompt");
  });
});

describe("MCP Tools - errors", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.mutation.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-47: returns clear error message on failure", async () => {
    mockToolResponse = { error: "Invalid slug" };

    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "update_prompt", arguments: { slug: "bad", name: "Bad" } },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});

describe("MCP Tools - track_prompt_use", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    lastToolCall = null;
    mockToolResponse = null;
    mockConvex.mutation.mockClear();
    app = Fastify({ logger: false });
    app.register(cookie, { secret: process.env.COOKIE_SECRET });
    registerMcpRoutes(app, createMockDeps());
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  test("TC-19 / TC-48: increments usage count", async () => {
    mockToolResponse = { success: true };

    await app.inject({
      method: "POST",
      url: "/mcp",
      headers: {
        authorization: `Bearer ${createTestJwt()}`,
        "content-type": "application/json",
      },
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "track_prompt_use", arguments: { slug: "test-prompt" } },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("track_prompt_use");
  });
});
```

---

## Constraints

- Do not implement actual functionality - stubs throw errors
- Do not modify Story 1 Convex files (they should be implemented)
- MCP tools should call Convex queries/mutations (when implemented)
- Tests assert MCP routing/argument wiring via the mocked transport
- Existing 291 tests must continue to pass

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # 291 existing PASS, 9 new ERROR
```

## Done When

- [ ] 5 MCP tool stubs added to `src/lib/mcp.ts`
- [ ] `tests/service/prompts/mcpTools.test.ts` extended with 9 tests
- [ ] New tests ERROR with NotImplementedError
- [ ] Existing 291 tests still PASS
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (291 PASS, 9 ERROR).
