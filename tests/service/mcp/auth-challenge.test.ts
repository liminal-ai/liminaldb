/**
 * Service tests for MCP WWW-Authenticate header behavior.
 *
 * Tests that MCP endpoints return proper WWW-Authenticate headers
 * pointing to the protected resource metadata (RFC 9728).
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, vi } from "vitest";
import type { McpDependencies } from "../../../src/api/mcp";

// Hoisted mocks
const mockValidateJwt = vi.hoisted(() =>
	vi.fn(async () => ({ valid: false, error: "Invalid token" })),
);

vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mockValidateJwt,
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

vi.mock("../../../src/lib/redis", () => ({
	getCachedPreferences: vi.fn().mockResolvedValue(null),
	setCachedPreferences: vi.fn().mockResolvedValue(undefined),
	invalidateCachedPreferences: vi.fn().mockResolvedValue(undefined),
}));

import { registerMcpRoutes } from "../../../src/api/mcp";

// Set required env vars
process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";
process.env.MCP_RESOURCE_URL = "http://localhost:5001/mcp";
process.env.BASE_URL = "http://localhost:5001";

// Create mock dependencies - transport is never reached because auth fails first
function createMockDeps(): McpDependencies {
	return {
		transport: {
			handleRequest: vi.fn(async () => {
				return new Response(
					JSON.stringify({ jsonrpc: "2.0", result: "ok", id: 1 }),
					{
						status: 200,
						headers: { "content-type": "application/json" },
					},
				);
			}),
		},
		mcpServer: {
			connect: vi.fn(async () => {}),
		} as unknown as McpDependencies["mcpServer"],
	};
}

describe("MCP WWW-Authenticate header", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerMcpRoutes(app, createMockDeps());
		await app.ready();
	});

	test("POST /mcp without token returns 401", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "tools/list", id: 1 },
		});

		expect(response.statusCode).toBe(401);
	});

	test("401 response has WWW-Authenticate header", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "tools/list", id: 1 },
		});

		expect(response.headers["www-authenticate"]).toBeDefined();
	});

	test("WWW-Authenticate contains Bearer scheme", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "tools/list", id: 1 },
		});

		const wwwAuth = response.headers["www-authenticate"] as string;
		expect(wwwAuth).toContain("Bearer");
	});

	test("WWW-Authenticate contains resource_metadata URL", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "tools/list", id: 1 },
		});

		const wwwAuth = response.headers["www-authenticate"] as string;
		expect(wwwAuth).toContain("resource_metadata=");
		expect(wwwAuth).toContain("/.well-known/oauth-protected-resource");
	});
});
