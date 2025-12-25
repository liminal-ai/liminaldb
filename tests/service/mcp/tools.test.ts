/**
 * Service tests for MCP tools with authentication.
 *
 * Tests that MCP tools receive authInfo from the transport
 * and can access user context.
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, mock } from "bun:test";
import type { McpDependencies } from "../../../src/api/mcp";

// Track the authInfo passed to handleRequest
let capturedAuthInfo: unknown = null;

// Mock JWT validator to return valid
mock.module("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mock(async () => ({ valid: true })),
}));

// Mock config
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

// Set required env vars
process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

// Create mock dependencies with authInfo capture
function createMockDeps(): McpDependencies {
	return {
		transport: {
			handleRequest: mock(
				async (
					_request: Request,
					options?: { authInfo?: unknown },
				): Promise<Response> => {
					// Capture the authInfo passed to handleRequest
					capturedAuthInfo = options?.authInfo;

					// Return a mock response based on captured auth
					const userExtra = (capturedAuthInfo as { extra?: { email?: string } })
						?.extra;
					const email = userExtra?.email ?? "unknown";

					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							result: {
								content: [{ type: "text", text: `Authenticated as ${email}` }],
							},
							id: 1,
						}),
						{
							status: 200,
							headers: { "content-type": "application/json" },
						},
					);
				},
			),
		},
		mcpServer: {
			connect: mock(async () => {}),
		} as unknown as McpDependencies["mcpServer"],
	};
}

describe("MCP tools receive authInfo", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		capturedAuthInfo = null;
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerMcpRoutes(app, createMockDeps());
		await app.ready();
	});

	test("handleRequest receives authInfo with user email", async () => {
		const token = createTestJwt({ email: "test@example.com" });
		await app.inject({
			method: "POST",
			url: "/mcp",
			payload: {
				jsonrpc: "2.0",
				method: "tools/call",
				params: { name: "test_auth", arguments: {} },
				id: 1,
			},
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
		});

		expect(capturedAuthInfo).toBeDefined();
		const authInfo = capturedAuthInfo as { extra?: { email?: string } };
		expect(authInfo.extra?.email).toBe("test@example.com");
	});

	test("handleRequest receives authInfo with userId", async () => {
		const token = createTestJwt({ sub: "user_12345" });
		await app.inject({
			method: "POST",
			url: "/mcp",
			payload: {
				jsonrpc: "2.0",
				method: "tools/call",
				params: { name: "test_auth", arguments: {} },
				id: 1,
			},
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
		});

		expect(capturedAuthInfo).toBeDefined();
		const authInfo = capturedAuthInfo as { extra?: { userId?: string } };
		expect(authInfo.extra?.userId).toBe("user_12345");
	});

	test("handleRequest receives authInfo with token", async () => {
		const token = createTestJwt();
		await app.inject({
			method: "POST",
			url: "/mcp",
			payload: {
				jsonrpc: "2.0",
				method: "tools/call",
				params: { name: "test_auth", arguments: {} },
				id: 1,
			},
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
		});

		expect(capturedAuthInfo).toBeDefined();
		const authInfo = capturedAuthInfo as { token?: string };
		expect(authInfo.token).toBe(token);
	});

	test("handleRequest receives no authInfo when unauthenticated", async () => {
		// This should return 401 before reaching handleRequest
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: {
				jsonrpc: "2.0",
				method: "tools/call",
				params: { name: "test_auth", arguments: {} },
				id: 1,
			},
		});

		expect(response.statusCode).toBe(401);
		// authInfo should not have been set since we never reached handleRequest
		expect(capturedAuthInfo).toBeNull();
	});
});
