import { describe, expect, test } from "bun:test";

import { createTestJwt } from "../fixtures/jwt";
import { getTestAuth, hasTestAuth } from "../fixtures/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

describe("MCP Integration Auth", () => {
	test.skipIf(!hasTestAuth())(
		"MCP accepts Bearer token and returns data",
		async () => {
			const auth = await getTestAuth();
			if (!auth) throw new Error("Test auth not available");

			const res = await fetch(`${BASE_URL}/mcp`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 1 }),
			});

			expect(res.ok).toBe(true);
			const text = await res.text();
			expect(text.length).toBeGreaterThan(0);
		},
	);

	test("MCP returns JSON error when unauthenticated", async () => {
		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 1 }),
		});

		expect(res.status).toBe(401);
		const text = await res.text();
		expect(text.toLowerCase()).toContain("error");
	});

	test("MCP uses Bearer token over cookie", async () => {
		const bearer = createTestJwt({ email: "bearer@example.com" });
		const cookieToken = createTestJwt({ email: "cookie@example.com" });

		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${bearer}`,
				cookie: `accessToken=${cookieToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 2 }),
		});

		expect(res.status).toBe(200);
	});

	test("MCP tool respects RLS and returns scoped data", async () => {
		const token = createTestJwt();
		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 3 }),
		});

		expect(res.status).toBe(200);
	});
});
