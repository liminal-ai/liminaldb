# Phase 2: TDD Red Spec - API & MCP Layer

## Overview

This spec defines the Fastify API routes and MCP tools that expose Phase 1's Convex mutations/queries. Skeletons return `NotImplementedError`. Tests assert expected behavior and fail.

**Goal:** Tests fail for the right reasons. When we implement (TDD Green), tests pass.

**Key difference from Phase 1:** We're testing HTTP request/response handling, not database operations. Service tests mock the Convex client. Integration tests hit real HTTP endpoints.

---

## Design Decisions

### Schema Source of Truth

Zod schemas in `src/schemas/prompts.ts` are the single source of truth. Fastify uses Zod directly. Convex keeps its existing validation in `convex/model/prompts.ts` for defense in depth (no `zodToConvex` needed).

### Validation Layers

- **API layer (Fastify):** Validates incoming requests with Zod. Returns 400 on failure.
- **Convex layer:** Uses existing validation in `convex/model/prompts.ts`. Defense in depth.
- **Response validation:** None. We trust Convex responses (high trust boundary).

### Auth Pattern

Fastify routes use existing `authMiddleware` which:
1. Extracts token from Bearer header or cookie
2. Validates JWT
3. Sets `request.user` with `{ userId, email, sessionId }`

MCP tools receive auth via `extra.authInfo.extra` with same shape.

### User ID Source

User ID comes from authenticated session, NOT request body:
- Routes: `request.user.id` (set by auth middleware)
- MCP: `extra.authInfo?.extra?.userId`

This differs from Phase 1 Convex mutations which receive `userId` as an arg (because Convex doesn't have session context).

### HTTP Status Codes

| Scenario | Status |
|----------|--------|
| Success (create) | 201 |
| Success (get/delete) | 200 |
| Not found | 404 |
| Validation error | 400 |
| Auth required | 401 |
| Duplicate slug | 409 |

---

## File Structure

```
src/
├── schemas/
│   └── prompts.ts              # NEW - Zod schemas (source of truth)
├── routes/
│   └── prompts.ts              # NEW - Fastify routes
└── lib/
    └── mcp.ts                  # UPDATE - add prompt tools

tests/
├── fixtures/
│   └── mockConvexClient.ts     # NEW - mock for convex HTTP client
├── service/
│   └── prompts/
│       ├── createPrompts.test.ts
│       ├── getPrompt.test.ts
│       ├── deletePrompt.test.ts
│       └── mcpTools.test.ts    # NEW - MCP tool tests
└── integration/
    └── prompts-api.test.ts     # NEW - HTTP integration tests
```

---

## Zod Schemas (Source of Truth)

### src/schemas/prompts.ts

```typescript
import { z } from "zod";

// Slug: lowercase, numbers, dashes. No colons (reserved for namespacing).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Tag name: alphanumeric, dashes, underscores, forward slashes
const TAG_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\-_/]*$/;

// Validation limits
export const LIMITS = {
  SLUG_MAX_LENGTH: 200,
  NAME_MAX_LENGTH: 200,
  DESCRIPTION_MAX_LENGTH: 2000,
  CONTENT_MAX_LENGTH: 100000,
  TAG_NAME_MAX_LENGTH: 100,
  MAX_TAGS_PER_PROMPT: 50,
} as const;

/**
 * Parameter schema for prompt templates
 */
export const ParameterSchema = z.object({
  name: z.string().min(1, "Parameter name required"),
  type: z.enum(["string", "string[]", "number", "boolean"]),
  required: z.boolean(),
  description: z.string().optional(),
});

/**
 * Single prompt input schema
 */
export const PromptInputSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug required")
    .max(LIMITS.SLUG_MAX_LENGTH, `Slug max ${LIMITS.SLUG_MAX_LENGTH} chars`)
    .regex(SLUG_REGEX, "Slug must be lowercase letters, numbers, dashes only. Colons reserved for namespacing."),
  name: z
    .string()
    .min(1, "Name required")
    .max(LIMITS.NAME_MAX_LENGTH, `Name max ${LIMITS.NAME_MAX_LENGTH} chars`),
  description: z
    .string()
    .min(1, "Description required")
    .max(LIMITS.DESCRIPTION_MAX_LENGTH, `Description max ${LIMITS.DESCRIPTION_MAX_LENGTH} chars`),
  content: z
    .string()
    .min(1, "Content required")
    .max(LIMITS.CONTENT_MAX_LENGTH, `Content max ${LIMITS.CONTENT_MAX_LENGTH} chars`),
  tags: z
    .array(
      z.string()
        .min(1, "Tag name required")
        .max(LIMITS.TAG_NAME_MAX_LENGTH, `Tag max ${LIMITS.TAG_NAME_MAX_LENGTH} chars`)
        .regex(TAG_NAME_REGEX, "Tag must be alphanumeric with dashes, underscores, or slashes")
    )
    .max(LIMITS.MAX_TAGS_PER_PROMPT, `Max ${LIMITS.MAX_TAGS_PER_PROMPT} tags`),
  parameters: z.array(ParameterSchema).optional(),
});

/**
 * Request body for creating prompts (batch)
 */
export const CreatePromptsRequestSchema = z.object({
  prompts: z.array(PromptInputSchema).min(1, "At least one prompt required"),
});

/**
 * Prompt DTO returned from queries
 * Note: Maps storage `tagNames` to API `tags`
 */
export const PromptDTOSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
  parameters: z.array(ParameterSchema).optional(),
});

// TypeScript types derived from Zod
export type Parameter = z.infer<typeof ParameterSchema>;
export type PromptInput = z.infer<typeof PromptInputSchema>;
export type CreatePromptsRequest = z.infer<typeof CreatePromptsRequestSchema>;
export type PromptDTO = z.infer<typeof PromptDTOSchema>;
```

---

## Skeleton Implementations

### src/routes/prompts.ts

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { authMiddleware } from "../middleware/auth";
import { CreatePromptsRequestSchema } from "../schemas/prompts";
import { NotImplementedError } from "../../convex/errors";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { config } from "../lib/config";

export function registerPromptRoutes(fastify: FastifyInstance): void {
  // All routes require authentication (inline preHandler matches existing patterns)
  fastify.post("/api/prompts", { preHandler: authMiddleware }, createPromptsHandler);
  fastify.get("/api/prompts/:slug", { preHandler: authMiddleware }, getPromptHandler);
  fastify.delete("/api/prompts/:slug", { preHandler: authMiddleware }, deletePromptHandler);
}

/**
 * POST /api/prompts
 * Create one or more prompts
 */
async function createPromptsHandler(
  request: FastifyRequest<{ Body: unknown }>,
  reply: FastifyReply
): Promise<void> {
  throw new NotImplementedError("createPromptsHandler");
}

/**
 * GET /api/prompts/:slug
 * Get a single prompt by slug
 */
async function getPromptHandler(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new NotImplementedError("getPromptHandler");
}

/**
 * DELETE /api/prompts/:slug
 * Delete a prompt by slug
 */
async function deletePromptHandler(
  request: FastifyRequest<{ Params: { slug: string } }>,
  reply: FastifyReply
): Promise<void> {
  throw new NotImplementedError("deletePromptHandler");
}
```

### Route Registration (in src/index.ts)

Add to imports:
```typescript
import { registerPromptRoutes } from "./routes/prompts";
```

Add to route registration section (after other registerXxxRoutes calls):
```typescript
registerPromptRoutes(fastify);
```

---

### MCP Tools (in src/lib/mcp.ts)

Add to existing `createMcpServer()`:

```typescript
// Register save_prompts tool
server.registerTool(
  "save_prompts",
  {
    title: "Save Prompts",
    description: "Save one or more prompts to your library",
    inputSchema: {
      type: "object",
      properties: {
        prompts: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slug: { type: "string" },
              name: { type: "string" },
              description: { type: "string" },
              content: { type: "string" },
              tags: { type: "array", items: { type: "string" } },
              parameters: { type: "array", items: { type: "object" } },
            },
            required: ["slug", "name", "description", "content", "tags"],
          },
          minItems: 1,
        },
      },
      required: ["prompts"],
    },
  },
  async (args, extra) => {
    throw new NotImplementedError("save_prompts");
  }
);

// Register get_prompt tool
server.registerTool(
  "get_prompt",
  {
    title: "Get Prompt",
    description: "Retrieve a prompt by its slug",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The prompt slug" },
      },
      required: ["slug"],
    },
  },
  async (args, extra) => {
    throw new NotImplementedError("get_prompt");
  }
);

// Register delete_prompt tool
server.registerTool(
  "delete_prompt",
  {
    title: "Delete Prompt",
    description: "Delete a prompt by its slug",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The prompt slug" },
      },
      required: ["slug"],
    },
  },
  async (args, extra) => {
    throw new NotImplementedError("delete_prompt");
  }
);
```

---

## Mock Infrastructure

### tests/fixtures/mockConvexClient.ts

```typescript
import { mock } from "bun:test";

export interface MockConvexClient {
  mutation: ReturnType<typeof mock>;
  query: ReturnType<typeof mock>;
}

/**
 * Create a mock Convex HTTP client for service tests.
 * Unlike Phase 1 which mocked ctx.db, this mocks the entire Convex client.
 */
export function createMockConvexClient(): MockConvexClient {
  return {
    mutation: mock(() => Promise.resolve([])),
    query: mock(() => Promise.resolve(null)),
  };
}

/**
 * Mock the convex module to use our mock client.
 * Call this before importing routes.
 */
export function mockConvexModule(mockClient: MockConvexClient): void {
  mock.module("../../src/lib/convex", () => ({
    convex: mockClient,
  }));
}
```

---

## Test Conditions

### Service Tests: POST /api/prompts

**File:** `tests/service/prompts/createPrompts.test.ts`

```typescript
import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

// Mock convex client before importing routes
const mockConvex = createMockConvexClient();
mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

// Mock JWT validator
mock.module("../../../src/lib/auth/jwtValidator", () => ({
  validateJwt: mock(async () => ({ valid: true })),
}));

// Mock config
mock.module("../../../src/lib/config", () => ({
  config: {
    convexApiKey: "test_api_key",
    convexUrl: "http://localhost:9999",
  },
}));

const { registerPromptRoutes } = await import("../../../src/routes/prompts");

describe("POST /api/prompts", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    registerPromptRoutes(app);
    await app.ready();
    mockConvex.mutation.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    test("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        payload: { prompts: [] },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("validation", () => {
    test("returns 400 with empty prompts array", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: { prompts: [] },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json()).toHaveProperty("error");
    });

    test("returns 400 with invalid slug format", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [{
            slug: "Invalid:Slug",
            name: "Test",
            description: "Test",
            content: "Test",
            tags: [],
          }],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/slug/i);
    });

    test("returns 400 with empty name", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [{
            slug: "valid-slug",
            name: "",
            description: "Test",
            content: "Test",
            tags: [],
          }],
        },
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toMatch(/name/i);
    });
  });

  describe("success paths", () => {
    test("calls Convex mutation with correct payload", async () => {
      mockConvex.mutation.mockResolvedValue(["prompt_id_1"]);

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt({ sub: "user_123" })}` },
        payload: {
          prompts: [{
            slug: "ai-meta-cognitive-check",
            name: "Meta Cognitive Experience Check",
            description: "Use when you want AI to introspect on its processing",
            content: "As you process this, note any shifts...",
            tags: ["introspection", "claude", "esoteric"],
            parameters: [{
              name: "target_section",
              type: "string",
              required: false,
              description: "Content section to focus on",
            }],
          }],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(), // api.prompts.insertPrompts
        expect.objectContaining({
          userId: "user_123",
          prompts: expect.arrayContaining([
            expect.objectContaining({
              slug: "ai-meta-cognitive-check",
              tags: ["introspection", "claude", "esoteric"],
            }),
          ]),
        })
      );
    });

    test("returns created IDs on success", async () => {
      mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [
            { slug: "prompt-a", name: "A", description: "...", content: "...", tags: [] },
            { slug: "prompt-b", name: "B", description: "...", content: "...", tags: [] },
          ],
        },
      });

      expect(response.statusCode).toBe(201);
      expect(response.json()).toEqual({ ids: ["id_1", "id_2"] });
    });

    test("batch with multiple tags passes all tags to mutation", async () => {
      mockConvex.mutation.mockResolvedValue(["id_1"]);

      await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [{
            slug: "multi-tag",
            name: "Multi Tag",
            description: "Has many tags",
            content: "Content here",
            tags: ["tag-a", "tag-b", "tag-c"],
          }],
        },
      });

      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          prompts: expect.arrayContaining([
            expect.objectContaining({
              tags: ["tag-a", "tag-b", "tag-c"],
            }),
          ]),
        })
      );
    });

    test("batch with shared tags includes tag in both prompts", async () => {
      mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

      await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [
            { slug: "prompt-a", name: "A", description: "...", content: "...", tags: ["shared", "unique-a"] },
            { slug: "prompt-b", name: "B", description: "...", content: "...", tags: ["shared", "unique-b"] },
          ],
        },
      });

      const call = mockConvex.mutation.mock.calls[0];
      const payload = call[1];
      expect(payload.prompts[0].tags).toContain("shared");
      expect(payload.prompts[1].tags).toContain("shared");
    });
  });

  describe("error handling", () => {
    test("returns 409 on duplicate slug error from Convex", async () => {
      mockConvex.mutation.mockRejectedValue(
        new Error('Slug "existing-slug" already exists for this user')
      );

      const response = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
        payload: {
          prompts: [{
            slug: "existing-slug",
            name: "Test",
            description: "Test",
            content: "Test",
            tags: [],
          }],
        },
      });

      expect(response.statusCode).toBe(409);
    });
  });
});
```

### Service Tests: GET /api/prompts/:slug

**File:** `tests/service/prompts/getPrompt.test.ts`

```typescript
import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

const mockConvex = createMockConvexClient();
mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

mock.module("../../../src/lib/auth/jwtValidator", () => ({
  validateJwt: mock(async () => ({ valid: true })),
}));

mock.module("../../../src/lib/config", () => ({
  config: { convexApiKey: "test_api_key", convexUrl: "http://localhost:9999" },
}));

const { registerPromptRoutes } = await import("../../../src/routes/prompts");

describe("GET /api/prompts/:slug", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    registerPromptRoutes(app);
    await app.ready();
    mockConvex.query.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    test("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/prompts/some-slug",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("success paths", () => {
    test("calls Convex query with correct args", async () => {
      mockConvex.query.mockResolvedValue({
        slug: "test-slug",
        name: "Test",
        description: "Desc",
        content: "Content",
        tags: ["tag1"],
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts/test-slug",
        headers: { authorization: `Bearer ${createTestJwt({ sub: "user_123" })}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockConvex.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user_123",
          slug: "test-slug",
        })
      );
    });

    test("returns prompt DTO with tags array", async () => {
      mockConvex.query.mockResolvedValue({
        slug: "test-slug",
        name: "Test Prompt",
        description: "A test prompt",
        content: "The content",
        tags: ["introspection", "claude"],
        parameters: undefined,
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts/test-slug",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        slug: "test-slug",
        name: "Test Prompt",
        description: "A test prompt",
        content: "The content",
        tags: ["introspection", "claude"],
      });
    });

    test("returns prompt with parameters when present", async () => {
      mockConvex.query.mockResolvedValue({
        slug: "template-prompt",
        name: "Template",
        description: "Has params",
        content: "Hello {{name}}",
        tags: [],
        parameters: [{
          name: "name",
          type: "string",
          required: true,
          description: "The name",
        }],
      });

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts/template-prompt",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.json().parameters).toEqual([{
        name: "name",
        type: "string",
        required: true,
        description: "The name",
      }]);
    });
  });

  describe("not found", () => {
    test("returns 404 when prompt not found", async () => {
      mockConvex.query.mockResolvedValue(null);

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts/nonexistent",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.statusCode).toBe(404);
      expect(response.json()).toHaveProperty("error");
    });
  });
});
```

### Service Tests: DELETE /api/prompts/:slug

**File:** `tests/service/prompts/deletePrompt.test.ts`

```typescript
import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

const mockConvex = createMockConvexClient();
mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

mock.module("../../../src/lib/auth/jwtValidator", () => ({
  validateJwt: mock(async () => ({ valid: true })),
}));

mock.module("../../../src/lib/config", () => ({
  config: { convexApiKey: "test_api_key", convexUrl: "http://localhost:9999" },
}));

const { registerPromptRoutes } = await import("../../../src/routes/prompts");

describe("DELETE /api/prompts/:slug", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    app = Fastify();
    registerPromptRoutes(app);
    await app.ready();
    mockConvex.mutation.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("authentication", () => {
    test("returns 401 without auth token", async () => {
      const response = await app.inject({
        method: "DELETE",
        url: "/api/prompts/some-slug",
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("success paths", () => {
    test("calls Convex mutation with correct args", async () => {
      mockConvex.mutation.mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/prompts/test-slug",
        headers: { authorization: `Bearer ${createTestJwt({ sub: "user_123" })}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockConvex.mutation).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "user_123",
          slug: "test-slug",
        })
      );
    });

    test("returns { deleted: true } on success", async () => {
      mockConvex.mutation.mockResolvedValue(true);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/prompts/existing-slug",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ deleted: true });
    });

    test("returns { deleted: false } when prompt not found", async () => {
      mockConvex.mutation.mockResolvedValue(false);

      const response = await app.inject({
        method: "DELETE",
        url: "/api/prompts/nonexistent",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ deleted: false });
    });
  });
});
```

### Service Tests: MCP Tools

**File:** `tests/service/prompts/mcpTools.test.ts`

Uses the same pattern as existing `tests/service/mcp/tools.test.ts` - HTTP injection to `/mcp` with JSON-RPC payloads.

```typescript
/**
 * Service tests for MCP prompt tools.
 * Tests via HTTP transport to /mcp endpoint with JSON-RPC.
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import type { McpDependencies } from "../../../src/api/mcp";
import { createTestJwt } from "../../fixtures";

// Track tool calls and return mock responses
let lastToolCall: { name: string; args: unknown } | null = null;
let mockToolResponse: unknown = null;

// Mock Convex client
const mockConvex = {
  mutation: mock(() => Promise.resolve([])),
  query: mock(() => Promise.resolve(null)),
};

mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

mock.module("../../../src/lib/auth/jwtValidator", () => ({
  validateJwt: mock(async () => ({ valid: true })),
}));

mock.module("../../../src/lib/config", () => ({
  config: {
    convexApiKey: "test_api_key",
    convexUrl: "http://localhost:9999",
    workosApiKey: "test_workos_key",
    workosClientId: "test_client_id",
    workosRedirectUri: "http://localhost:5001/auth/callback",
    cookieSecret: "test_cookie_secret",
    nodeEnv: "test",
    isProduction: false,
    isTest: true,
  },
}));

const { registerMcpRoutes } = await import("../../../src/api/mcp");

process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

function createMockDeps(): McpDependencies {
  return {
    transport: {
      handleRequest: mock(async (request: Request, options?: { authInfo?: unknown }): Promise<Response> => {
        // Parse the JSON-RPC request to get tool name and args
        const body = await request.clone().json();
        lastToolCall = { name: body.params?.name, args: body.params?.arguments };

        // Return mock response
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            result: {
              content: [{ type: "text", text: JSON.stringify(mockToolResponse) }],
            },
            id: body.id,
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }),
    },
    mcpServer: {
      connect: mock(async () => {}),
    } as unknown as McpDependencies["mcpServer"],
  };
}

describe("MCP Tools - save_prompts", () => {
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

  test("requires authentication", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "save_prompts",
          arguments: { prompts: [] },
        },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("calls tool with correct arguments", async () => {
    mockToolResponse = { ids: ["id_1"] };

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
        params: {
          name: "save_prompts",
          arguments: {
            prompts: [{
              slug: "test-prompt",
              name: "Test",
              description: "A test prompt",
              content: "Content here",
              tags: ["test"],
            }],
          },
        },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(lastToolCall?.name).toBe("save_prompts");
    expect(lastToolCall?.args).toHaveProperty("prompts");
  });

  test("handles batch with multiple prompts", async () => {
    mockToolResponse = { ids: ["id_1", "id_2"] };

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
          name: "save_prompts",
          arguments: {
            prompts: [
              { slug: "prompt-a", name: "A", description: "...", content: "...", tags: [] },
              { slug: "prompt-b", name: "B", description: "...", content: "...", tags: [] },
            ],
          },
        },
        id: 1,
      },
    });

    const args = lastToolCall?.args as { prompts: unknown[] };
    expect(args.prompts).toHaveLength(2);
  });
});

describe("MCP Tools - get_prompt", () => {
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

  test("requires authentication", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "get_prompt", arguments: { slug: "test" } },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("passes slug to tool handler", async () => {
    mockToolResponse = { slug: "test-slug", name: "Test", description: "...", content: "...", tags: [] };

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
        params: { name: "get_prompt", arguments: { slug: "test-slug" } },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("get_prompt");
    expect(lastToolCall?.args).toEqual({ slug: "test-slug" });
  });
});

describe("MCP Tools - delete_prompt", () => {
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

  test("requires authentication", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/mcp",
      payload: {
        jsonrpc: "2.0",
        method: "tools/call",
        params: { name: "delete_prompt", arguments: { slug: "test" } },
        id: 1,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  test("passes slug to tool handler", async () => {
    mockToolResponse = { deleted: true };

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
        params: { name: "delete_prompt", arguments: { slug: "to-delete" } },
        id: 1,
      },
    });

    expect(lastToolCall?.name).toBe("delete_prompt");
    expect(lastToolCall?.args).toEqual({ slug: "to-delete" });
  });
});
```

---

## Integration Tests

**File:** `tests/integration/prompts-api.test.ts`

```typescript
import { describe, test, expect, beforeAll, afterEach } from "bun:test";

/**
 * HTTP API integration tests for prompts.
 * These run against deployed staging to verify full round-trip.
 *
 * Prerequisites:
 * - TEST_BASE_URL set to staging
 * - Valid test user credentials
 */

function getBaseUrl(): string {
  const url = process.env.TEST_BASE_URL;
  if (!url) throw new Error("TEST_BASE_URL not configured");
  return url;
}

async function getAuthToken(): Promise<string> {
  // Use WorkOS to get a real token for the test user
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  const clientId = process.env.WORKOS_CLIENT_ID;
  const apiKey = process.env.WORKOS_API_KEY;

  if (!email || !password || !clientId || !apiKey) {
    throw new Error("Test user credentials not configured");
  }

  const { WorkOS } = await import("@workos-inc/node");
  const workos = new WorkOS(apiKey);

  const { accessToken } = await workos.userManagement.authenticateWithPassword({
    email,
    password,
    clientId,
  });

  return accessToken;
}

describe("Prompts API Integration", () => {
  let baseUrl: string;
  let authToken: string;
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    baseUrl = getBaseUrl();
    authToken = await getAuthToken();
  });

  afterEach(async () => {
    // Cleanup created prompts
    for (const slug of createdSlugs) {
      try {
        await fetch(`${baseUrl}/api/prompts/${slug}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${authToken}` },
        });
      } catch {
        // Ignore cleanup errors
      }
    }
    createdSlugs.length = 0;
  });

  function trackSlug(slug: string): string {
    createdSlugs.push(slug);
    return slug;
  }

  describe("POST /api/prompts → GET /api/prompts/:slug round trip", () => {
    test("create and retrieve prompt", async () => {
      const slug = trackSlug(`api-test-${Date.now()}`);

      // Create
      const createRes = await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug,
            name: "API Integration Test",
            description: "Created via HTTP API",
            content: "Test content",
            tags: ["api-test"],
          }],
        }),
      });

      expect(createRes.status).toBe(201);
      const { ids } = await createRes.json();
      expect(ids).toHaveLength(1);

      // Retrieve
      const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(getRes.status).toBe(200);
      const prompt = await getRes.json();
      expect(prompt.slug).toBe(slug);
      expect(prompt.name).toBe("API Integration Test");
      expect(prompt.tags).toContain("api-test");
    });

    test("create prompt with tags and verify tags returned", async () => {
      const slug = trackSlug(`tags-test-${Date.now()}`);

      await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug,
            name: "Tags Test",
            description: "Multiple tags",
            content: "Content",
            tags: ["tag-a", "tag-b", "tag-c"],
          }],
        }),
      });

      const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const prompt = await getRes.json();
      expect(prompt.tags).toContain("tag-a");
      expect(prompt.tags).toContain("tag-b");
      expect(prompt.tags).toContain("tag-c");
    });
  });

  describe("DELETE /api/prompts/:slug", () => {
    test("delete existing prompt", async () => {
      const slug = trackSlug(`delete-test-${Date.now()}`);

      // Create
      await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug,
            name: "To Delete",
            description: "Will be deleted",
            content: "Content",
            tags: [],
          }],
        }),
      });

      // Delete
      const deleteRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(deleteRes.status).toBe(200);
      const { deleted } = await deleteRes.json();
      expect(deleted).toBe(true);

      // Verify gone
      const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      expect(getRes.status).toBe(404);

      // Remove from cleanup since we deleted it
      const idx = createdSlugs.indexOf(slug);
      if (idx > -1) createdSlugs.splice(idx, 1);
    });
  });

  describe("error cases", () => {
    test("401 without auth", async () => {
      const res = await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompts: [] }),
      });

      expect(res.status).toBe(401);
    });

    test("400 with invalid slug", async () => {
      const res = await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug: "Invalid:Slug",
            name: "Test",
            description: "Test",
            content: "Test",
            tags: [],
          }],
        }),
      });

      expect(res.status).toBe(400);
    });

    test("409 on duplicate slug", async () => {
      const slug = trackSlug(`dupe-test-${Date.now()}`);

      // First create
      await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug,
            name: "First",
            description: "First",
            content: "First",
            tags: [],
          }],
        }),
      });

      // Second create with same slug
      const res = await fetch(`${baseUrl}/api/prompts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompts: [{
            slug,
            name: "Dupe",
            description: "Dupe",
            content: "Dupe",
            tags: [],
          }],
        }),
      });

      expect(res.status).toBe(409);
    });
  });
});
```

---

## TDD Red Checklist

When skeleton and tests are in place, run tests and verify:

**REST API Tests:**

| Test | Expected Failure |
|------|------------------|
| POST /api/prompts 401 without auth | ❌ NotImplementedError |
| POST /api/prompts 400 empty array | ❌ NotImplementedError |
| POST /api/prompts 400 invalid slug | ❌ NotImplementedError |
| POST /api/prompts calls mutation | ❌ NotImplementedError |
| POST /api/prompts returns IDs | ❌ NotImplementedError |
| POST /api/prompts tag handling | ❌ NotImplementedError |
| GET /api/prompts/:slug 401 | ❌ NotImplementedError |
| GET /api/prompts/:slug returns DTO | ❌ NotImplementedError |
| GET /api/prompts/:slug 404 | ❌ NotImplementedError |
| DELETE /api/prompts/:slug 401 | ❌ NotImplementedError |
| DELETE /api/prompts/:slug success | ❌ NotImplementedError |
| DELETE /api/prompts/:slug not found | ❌ NotImplementedError |

**MCP Tool Tests:**

| Test | Expected Failure |
|------|------------------|
| save_prompts requires auth | ❌ NotImplementedError |
| save_prompts validates input | ❌ NotImplementedError |
| save_prompts calls mutation | ❌ NotImplementedError |
| save_prompts batch handling | ❌ NotImplementedError |
| save_prompts duplicate slug | ❌ NotImplementedError |
| get_prompt requires auth | ❌ NotImplementedError |
| get_prompt returns DTO | ❌ NotImplementedError |
| get_prompt not found | ❌ NotImplementedError |
| delete_prompt requires auth | ❌ NotImplementedError |
| delete_prompt success | ❌ NotImplementedError |
| delete_prompt not found | ❌ NotImplementedError |

**Integration Tests:**

| Test | Expected Failure |
|------|------------------|
| Create and retrieve round trip | ❌ NotImplementedError |
| Create with tags | ❌ NotImplementedError |
| Delete existing prompt | ❌ NotImplementedError |
| 401 without auth | ❌ NotImplementedError |
| 400 invalid slug | ❌ NotImplementedError |
| 409 duplicate slug | ❌ NotImplementedError |

---

## Execution Order

1. Verify zod installed (already in package.json)
2. Create `src/schemas/prompts.ts` with Zod schemas
3. Create `tests/fixtures/mockConvexClient.ts`
4. Create `src/routes/prompts.ts` skeleton
5. Register routes in `src/index.ts` (import + call `registerPromptRoutes`)
6. Create `tests/service/prompts/createPrompts.test.ts`
7. Create `tests/service/prompts/getPrompt.test.ts`
8. Create `tests/service/prompts/deletePrompt.test.ts`
9. Add MCP tools to `src/lib/mcp.ts`
10. Create `tests/service/prompts/mcpTools.test.ts`
11. Create `tests/integration/prompts-api.test.ts`
12. Run tests, verify failures match expected

---

## Notes

- User ID comes from authenticated session (`request.user.id`), not request body
- Validation happens at API layer with Zod; Convex provides defense in depth
- Integration tests use unique slugs with timestamps to avoid collision
- Integration tests clean up after each test
- MCP tools use same Convex client as REST routes
- `tags` in response maps from `tagNames` in storage (same as Phase 1)
- HTTP 409 for duplicate slug (Conflict), not 400 (Bad Request)
- Service tests use `afterEach` to close Fastify app (prevents resource leaks)
- MCP tool tests use HTTP injection to `/mcp` with JSON-RPC payloads (same pattern as existing MCP tests)
