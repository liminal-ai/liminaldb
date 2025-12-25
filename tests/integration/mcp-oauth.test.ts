/**
 * Integration tests for MCP OAuth flow.
 *
 * Tests the complete MCP authentication flow with real:
 * - HTTP requests to running server
 * - WorkOS tokens from test user authentication
 * - Convex queries for health_check tool
 *
 * NO MOCKS - all real services.
 *
 * Prerequisites:
 * - Server running at TEST_BASE_URL (default: http://localhost:5001)
 * - Convex backend running
 * - Test user configured (TEST_USER_EMAIL, TEST_USER_PASSWORD)
 * - Environment variables set (MCP_RESOURCE_URL, WORKOS_AUTH_SERVER_URL, etc.)
 */

import { describe, expect, test } from "bun:test";
import { getTestAuth, hasTestAuth } from "../fixtures/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

/**
 * Parse SSE (Server-Sent Events) response to extract JSON data.
 * MCP SDK returns responses in SSE format when client accepts text/event-stream.
 */
function parseSSE(sseText: string): unknown {
	const lines = sseText.trim().split("\n");
	for (const line of lines) {
		if (line.startsWith("data: ")) {
			const jsonStr = line.substring(6);
			return JSON.parse(jsonStr);
		}
	}
	throw new Error("No data line found in SSE response");
}

describe("MCP OAuth Integration", () => {
	describe("Protected resource metadata endpoint", () => {
		test("GET /.well-known/oauth-protected-resource returns 200", async () => {
			const res = await fetch(
				`${BASE_URL}/.well-known/oauth-protected-resource`,
			);

			expect(res.ok).toBe(true);
			expect(res.status).toBe(200);
		});

		test("metadata has correct Content-Type", async () => {
			const res = await fetch(
				`${BASE_URL}/.well-known/oauth-protected-resource`,
			);

			expect(res.headers.get("content-type")).toContain("application/json");
		});

		test("metadata contains required RFC 9728 fields", async () => {
			const res = await fetch(
				`${BASE_URL}/.well-known/oauth-protected-resource`,
			);
			const body = (await res.json()) as {
				resource?: string;
				authorization_servers?: string[];
			};

			expect(body.resource).toBeDefined();
			expect(typeof body.resource).toBe("string");
			expect(body.authorization_servers).toBeDefined();
			expect(Array.isArray(body.authorization_servers)).toBe(true);
			expect(body.authorization_servers?.length).toBeGreaterThan(0);
		});

		test("metadata authorization_servers contains valid URL", async () => {
			const res = await fetch(
				`${BASE_URL}/.well-known/oauth-protected-resource`,
			);
			const body = (await res.json()) as { authorization_servers?: string[] };

			const authServer = body.authorization_servers?.[0];
			expect(authServer).toMatch(/^https?:\/\//);
		});
	});

	describe("MCP endpoint authentication", () => {
		test("POST /mcp without token returns 401", async () => {
			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/list",
					params: {},
					id: 1,
				}),
			});

			expect(res.status).toBe(401);
		});

		test("POST /mcp without token returns WWW-Authenticate header", async () => {
			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/list",
					params: {},
					id: 1,
				}),
			});

			const wwwAuth = res.headers.get("www-authenticate");
			expect(wwwAuth).toBeDefined();
			expect(wwwAuth).toContain("Bearer");
			expect(wwwAuth).toContain("resource_metadata");
		});
	});

	describe("MCP with real authentication", () => {
		test("POST /mcp with valid token succeeds", async () => {
			if (!hasTestAuth()) {
				throw new Error("Test auth not configured");
			}
			const auth = await getTestAuth();
			if (!auth) throw new Error("Failed to get test auth");

			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${auth.accessToken}`,
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/list",
					params: {},
					id: 1,
				}),
			});

			expect(res.ok).toBe(true);

			const sseText = await res.text();
			const body = parseSSE(sseText) as {
				jsonrpc: string;
				id: number;
			};
			expect(body.jsonrpc).toBe("2.0");
			expect(body.id).toBe(1);
		});

		test("test_auth tool returns correct user email", async () => {
			if (!hasTestAuth()) {
				throw new Error("Test auth not configured");
			}
			const auth = await getTestAuth();
			if (!auth) throw new Error("Failed to get test auth");

			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${auth.accessToken}`,
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/call",
					params: {
						name: "test_auth",
						arguments: {},
					},
					id: 1,
				}),
			});

			expect(res.ok).toBe(true);

			const sseText = await res.text();
			const body = parseSSE(sseText) as {
				result?: {
					content?: Array<{ type: string; text?: string }>;
				};
			};
			expect(body.result).toBeDefined();

			// The content should mention the authenticated email
			if (body.result?.content) {
				const textContent = body.result.content.find(
					(c: { type: string }) => c.type === "text",
				);
				expect(textContent?.text).toContain(auth.email);
			}
		});

		test("health_check tool connects to Convex successfully", async () => {
			if (!hasTestAuth()) {
				throw new Error("Test auth not configured");
			}
			const auth = await getTestAuth();
			if (!auth) throw new Error("Failed to get test auth");

			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: {
					authorization: `Bearer ${auth.accessToken}`,
					"content-type": "application/json",
					accept: "application/json, text/event-stream",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					method: "tools/call",
					params: {
						name: "health_check",
						arguments: {},
					},
					id: 1,
				}),
			});

			expect(res.ok).toBe(true);

			const sseText = await res.text();
			const body = parseSSE(sseText) as {
				result?: {
					content?: Array<{ type: string; text?: string }>;
				};
			};
			expect(body.result).toBeDefined();

			// The tool returns plain text, not JSON
			if (body.result?.content) {
				const textContent = body.result.content.find(
					(c: { type: string }) => c.type === "text",
				);
				// Verify the response indicates successful connection
				expect(textContent?.text).toContain("Health check passed");
				expect(textContent?.text).toContain("Convex connected");
			}
		});
	});
});
