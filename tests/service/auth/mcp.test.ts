import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { McpDependencies } from "../../../src/api/mcp";

// Mock JWT validator to always return valid
mock.module("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mock(async () => ({ valid: true })),
}));

// Mock config to avoid validation at import time
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
import { createTestJwt } from "../../fixtures";

process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

// Create mock transport directly - no mock.module needed
const mockHandleRequest = mock(async () => {
	return new Response(JSON.stringify({ jsonrpc: "2.0", result: "ok", id: 1 }), {
		status: 200,
		headers: { "content-type": "application/json" },
	});
});

function createMockDeps(): McpDependencies {
	return {
		transport: {
			handleRequest: mockHandleRequest,
		},
		mcpServer: {
			connect: mock(async () => {}),
		} as unknown as McpDependencies["mcpServer"],
	};
}

describe("MCP Auth", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		mockHandleRequest.mockClear();
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerMcpRoutes(app, createMockDeps());
		await app.ready();
	});

	test("rejects missing bearer token", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "health_check", id: 1 },
		});

		expect(response.statusCode).toBe(401);
		expect(response.headers["content-type"]).toContain("application/json");
	});

	test("accepts bearer token and returns success response", async () => {
		const token = createTestJwt();
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "health_check", id: 1 },
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
		});

		expect(response.statusCode).toBe(200);
		// Verify the mock transport was called
		expect(mockHandleRequest).toHaveBeenCalled();
	});

	test("GET /mcp/tools returns JSON with tools when authenticated", async () => {
		const token = createTestJwt();
		const response = await app.inject({
			method: "GET",
			url: "/mcp/tools",
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		expect(response.statusCode).toBe(200);
		const payload = response.json();
		expect(Array.isArray(payload.tools)).toBe(true);
	});
});
