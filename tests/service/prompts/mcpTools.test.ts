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
			handleRequest: mock(
				async (
					request: Request,
					_options?: { authInfo?: unknown },
				): Promise<Response> => {
					// Parse the JSON-RPC request to get tool name and args
					const body = (await request.clone().json()) as {
						params?: { name?: string; arguments?: unknown };
						id?: number;
					};
					lastToolCall = {
						name: body.params?.name ?? "",
						args: body.params?.arguments,
					};

					// Return mock response
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							result: {
								content: [
									{ type: "text", text: JSON.stringify(mockToolResponse) },
								],
							},
							id: body.id,
						}),
						{ status: 200, headers: { "content-type": "application/json" } },
					);
				},
			),
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
		mockToolResponse = {
			slug: "test-slug",
			name: "Test",
			description: "...",
			content: "...",
			tags: [],
		};

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
