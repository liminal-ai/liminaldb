/**
 * Service tests for MCP resources (widgets).
 *
 * Tests that MCP resources are correctly registered and return
 * the expected content, including the health widget for ChatGPT.
 */

import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, vi } from "vitest";
import type { McpDependencies } from "../../../src/api/mcp";

// Track resources/list and resources/read calls
let _lastRequest: { method: string; params?: unknown } | null = null;

// Hoisted mocks
const mockValidateJwt = vi.hoisted(() => vi.fn(async () => ({ valid: true })));

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

import { registerMcpRoutes } from "../../../src/api/mcp";
import { createTestJwt } from "../../fixtures";

// Set required env vars
process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

// JSON-RPC request body type
interface JsonRpcRequest {
	jsonrpc: string;
	method: string;
	params?: unknown;
	id: number;
}

// Response types for test assertions
interface ResourcesListResponse {
	result?: {
		resources?: Array<{ uri: string; mimeType?: string }>;
	};
}

interface ResourcesReadResponse {
	result?: {
		contents?: Array<{
			uri: string;
			mimeType: string;
			text: string;
			_meta?: Record<string, unknown>;
		}>;
	};
}

// Create mock dependencies that return resources
function createMockDeps(): McpDependencies {
	return {
		transport: {
			handleRequest: vi.fn(async (request: Request): Promise<Response> => {
				const body = (await request.json()) as JsonRpcRequest;
				_lastRequest = body;

				// Handle resources/list
				if (body.method === "resources/list") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							result: {
								resources: [
									{
										uri: "ui://widget/health",
										name: "health-widget",
										description: "Health check status widget for ChatGPT",
										mimeType: "text/html+skybridge",
									},
								],
							},
							id: body.id,
						}),
						{
							status: 200,
							headers: { "content-type": "application/json" },
						},
					);
				}

				// Handle resources/read
				if (body.method === "resources/read") {
					const params = body.params as { uri?: string };
					if (params?.uri === "ui://widget/health") {
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								result: {
									contents: [
										{
											uri: "ui://widget/health",
											mimeType: "text/html+skybridge",
											text: "<!DOCTYPE html><html><body>Health Widget</body></html>",
											_meta: {
												"openai/widgetPrefersBorder": true,
												"openai/widgetDomain": "https://chatgpt.com",
												"openai/widgetCSP": {
													connect_domains: [],
													resource_domains: [],
												},
											},
										},
									],
								},
								id: body.id,
							}),
							{
								status: 200,
								headers: { "content-type": "application/json" },
							},
						);
					}
				}

				// Default response
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						result: {},
						id: body.id,
					}),
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

describe("MCP resources", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		_lastRequest = null;
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerMcpRoutes(app, createMockDeps());
		await app.ready();
	});

	describe("resources/list", () => {
		test("returns health widget resource", async () => {
			const token = createTestJwt();
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				payload: {
					jsonrpc: "2.0",
					method: "resources/list",
					params: {},
					id: 1,
				},
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
			});

			expect(response.statusCode).toBe(200);
			const body = response.json() as ResourcesListResponse;
			expect(body.result).toBeDefined();
			expect(body.result?.resources).toBeDefined();
			expect(Array.isArray(body.result?.resources)).toBe(true);

			const healthWidget = body.result?.resources?.find(
				(r) => r.uri === "ui://widget/health",
			);
			expect(healthWidget).toBeDefined();
			expect(healthWidget?.mimeType).toBe("text/html+skybridge");
		});
	});

	describe("resources/read", () => {
		test("returns HTML for health widget", async () => {
			const token = createTestJwt();
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				payload: {
					jsonrpc: "2.0",
					method: "resources/read",
					params: { uri: "ui://widget/health" },
					id: 1,
				},
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
			});

			expect(response.statusCode).toBe(200);
			const body = response.json() as ResourcesReadResponse;
			expect(body.result).toBeDefined();
			expect(body.result?.contents).toBeDefined();
			expect(Array.isArray(body.result?.contents)).toBe(true);

			const content = body.result?.contents?.[0];
			expect(content?.uri).toBe("ui://widget/health");
			expect(content?.mimeType).toBe("text/html+skybridge");
			expect(content?.text).toContain("<!DOCTYPE html>");
		});

		test("widget HTML contains openai/widgetCSP metadata", async () => {
			const token = createTestJwt();
			const response = await app.inject({
				method: "POST",
				url: "/mcp",
				payload: {
					jsonrpc: "2.0",
					method: "resources/read",
					params: { uri: "ui://widget/health" },
					id: 1,
				},
				headers: {
					authorization: `Bearer ${token}`,
					"content-type": "application/json",
				},
			});

			const body = response.json() as ResourcesReadResponse;
			const content = body.result?.contents?.[0];
			expect(content?._meta).toBeDefined();
			expect(content?._meta?.["openai/widgetCSP"]).toBeDefined();
		});
	});
});
