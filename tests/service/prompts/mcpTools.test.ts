/**
 * Service tests for MCP prompt tools.
 * Tests via HTTP transport to /mcp endpoint with JSON-RPC.
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestJwt } from "../../fixtures";

// Mock Convex client
const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
	query: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

vi.mock("../../../src/lib/config", () => ({
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

import { registerMcpRoutes } from "../../../src/api/mcp";

process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

async function createApp() {
	const app = Fastify({ logger: false });
	app.register(cookie, { secret: process.env.COOKIE_SECRET });
	registerMcpRoutes(app);
	await app.ready();
	return app;
}

async function callTool(
	app: Awaited<ReturnType<typeof createApp>>,
	name: string,
	args: Record<string, unknown>,
	token?: string,
) {
	return app.inject({
		method: "POST",
		url: "/mcp",
		headers: {
			...(token ? { authorization: `Bearer ${token}` } : {}),
			"content-type": "application/json",
			accept: "application/json, text/event-stream",
		},
		payload: {
			jsonrpc: "2.0",
			method: "tools/call",
			params: { name, arguments: args },
			id: 1,
		},
	});
}

function readToolResult(response: Awaited<ReturnType<typeof callTool>>) {
	const contentType = response.headers["content-type"] ?? "";
	const rawBody = response.body ?? "";
	const body = contentType.includes("text/event-stream")
		? (() => {
				const dataLines = rawBody
					.split("\n")
					.filter((line) => line.startsWith("data: "));
				if (dataLines.length === 0) {
					return null;
				}
				const jsonText = dataLines
					.map((line) => line.replace(/^data:\s?/, ""))
					.join("\n");
				return JSON.parse(jsonText) as {
					result?: { content?: Array<{ text?: string }> };
				};
			})()
		: (JSON.parse(rawBody) as {
				result?: { content?: Array<{ text?: string }> };
			});
	const text = body?.result?.content?.[0]?.text;
	return text ? JSON.parse(text) : null;
}

describe("MCP Tools - save_prompts", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.mutation.mockClear();
		app = await createApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("requires authentication", async () => {
		const response = await callTool(app, "save_prompts", { prompts: [] });
		expect(response.statusCode).toBe(401);
	});

	test("calls Convex with correct arguments", async () => {
		mockConvex.mutation.mockResolvedValue(["id_1"]);

		const response = await callTool(
			app,
			"save_prompts",
			{
				prompts: [
					{
						slug: "test-prompt",
						name: "Test",
						description: "A test prompt",
						content: "Content here",
						tags: ["test"],
					},
				],
			},
			createTestJwt({ sub: "user_123" }),
		);

		expect(response.statusCode).toBe(200);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				prompts: expect.any(Array),
			}),
		);

		const result = readToolResult(response) as { ids?: string[] } | null;
		expect(result?.ids).toEqual(["id_1"]);
	});

	test("handles batch with multiple prompts", async () => {
		mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

		await callTool(
			app,
			"save_prompts",
			{
				prompts: [
					{
						slug: "prompt-a",
						name: "A",
						description: "...",
						content: "...",
						tags: [],
					},
					{
						slug: "prompt-b",
						name: "B",
						description: "...",
						content: "...",
						tags: [],
					},
				],
			},
			createTestJwt(),
		);

		const args = mockConvex.mutation.mock.calls[0]?.[1] as {
			prompts?: unknown[];
		};
		expect(args.prompts).toHaveLength(2);
	});
});

describe("MCP Tools - get_prompt", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.query.mockClear();
		app = await createApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("requires authentication", async () => {
		const response = await callTool(app, "get_prompt", { slug: "test" });
		expect(response.statusCode).toBe(401);
	});

	test("passes slug to Convex query", async () => {
		mockConvex.query.mockResolvedValue({
			slug: "test-slug",
			name: "Test",
			description: "...",
			content: "...",
			tags: [],
		});

		const response = await callTool(
			app,
			"get_prompt",
			{ slug: "test-slug" },
			createTestJwt({ sub: "user_123" }),
		);

		expect(response.statusCode).toBe(200);
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ userId: "user_123", slug: "test-slug" }),
		);

		const result = readToolResult(response) as { slug?: string } | null;
		expect(result?.slug).toBe("test-slug");
	});
});

describe("MCP Tools - delete_prompt", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.mutation.mockClear();
		app = await createApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("requires authentication", async () => {
		const response = await callTool(app, "delete_prompt", { slug: "test" });
		expect(response.statusCode).toBe(401);
	});

	test("passes slug to Convex mutation", async () => {
		mockConvex.mutation.mockResolvedValue(true);

		const response = await callTool(
			app,
			"delete_prompt",
			{ slug: "to-delete" },
			createTestJwt({ sub: "user_123" }),
		);

		expect(response.statusCode).toBe(200);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ userId: "user_123", slug: "to-delete" }),
		);

		const result = readToolResult(response) as { deleted?: boolean } | null;
		expect(result?.deleted).toBe(true);
	});
});

describe("MCP Tools - list_prompts", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.query.mockClear();
		app = await createApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("requires authentication", async () => {
		const response = await callTool(app, "list_prompts", {});
		expect(response.statusCode).toBe(401);
	});

	test("TC-41: returns ranked prompts", async () => {
		mockConvex.query.mockResolvedValue([{ slug: "a" }]);

		const response = await callTool(
			app,
			"list_prompts",
			{},
			createTestJwt({ sub: "user_123" }),
		);

		expect(response.statusCode).toBe(200);
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
			}),
		);

		const result = readToolResult(response) as { prompts?: unknown[] } | null;
		expect(result?.prompts).toEqual([{ slug: "a" }]);
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
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				limit: 5,
			}),
		);

		const result = readToolResult(response) as { prompts?: unknown[] } | null;
		expect(result?.prompts).toEqual([]);
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

	test("requires authentication", async () => {
		const response = await callTool(app, "search_prompts", { query: "test" });
		expect(response.statusCode).toBe(401);
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
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				query: "sql",
			}),
		);

		const result = readToolResult(response) as { prompts?: unknown[] } | null;
		expect(result?.prompts).toEqual([{ slug: "sql" }]);
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
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				query: "test",
				tags: ["sql", "database"],
			}),
		);

		const result = readToolResult(response) as { prompts?: unknown[] } | null;
		expect(result?.prompts).toEqual([]);
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

	test("requires authentication", async () => {
		const response = await callTool(app, "list_tags", {});
		expect(response.statusCode).toBe(401);
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
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
			}),
		);

		const result = readToolResult(response) as { tags?: string[] } | null;
		expect(result?.tags).toEqual(["a", "b"]);
	});
});

describe("MCP Tools - update_prompt", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.query.mockClear();
		mockConvex.mutation.mockClear();
		app = await createApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("requires authentication", async () => {
		const response = await callTool(app, "update_prompt", {
			slug: "test-prompt",
			name: "Updated",
		});
		expect(response.statusCode).toBe(401);
	});

	test("returns an error when updating only flags on a missing prompt", async () => {
		mockConvex.mutation.mockResolvedValue(false);

		const response = await callTool(
			app,
			"update_prompt",
			{ slug: "missing", pinned: true },
			createTestJwt({ sub: "user_123" }),
		);

		expect(response.statusCode).toBe(200);
		expect(response.body).toContain("Prompt not found");
		expect(response.body).toContain("isError");
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
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				slug: "test-prompt",
			}),
		);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				slug: "test-prompt",
			}),
		);

		const result = readToolResult(response) as { updated?: boolean } | null;
		expect(result?.updated).toBe(true);
	});
});

describe("MCP Tools - errors", () => {
	let app: Awaited<ReturnType<typeof createApp>>;

	beforeEach(async () => {
		mockConvex.query.mockClear();
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
		expect(response.body).toContain("Prompt not found");
		expect(response.body).toContain("isError");
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

	test("requires authentication", async () => {
		const response = await callTool(app, "track_prompt_use", {
			slug: "test-prompt",
		});
		expect(response.statusCode).toBe(401);
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
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				apiKey: "test_api_key",
				userId: "user_123",
				slug: "test-prompt",
			}),
		);

		const result = readToolResult(response) as { tracked?: boolean } | null;
		expect(result?.tracked).toBe(true);
	});
});
