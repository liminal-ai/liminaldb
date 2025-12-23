import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach } from "bun:test";

import { registerMcpRoutes } from "../../../src/api/mcp";
import { createTestJwt } from "../../fixtures";

process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.CONVEX_URL ??= "http://localhost:9999";

describe("MCP Auth", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerMcpRoutes(app);
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

	test("accepts bearer token and returns tool output", async () => {
		const token = createTestJwt();
		const response = await app.inject({
			method: "POST",
			url: "/mcp",
			payload: { jsonrpc: "2.0", method: "health_check", id: 1 },
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBeGreaterThan(0);
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
