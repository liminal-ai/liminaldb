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
