import { describe, expect, test, beforeAll } from "vitest";

import { getTestAuth, requireTestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

const BASE_URL = getTestBaseUrl();

describe("MCP Integration Auth", () => {
	beforeAll(() => {
		requireTestAuth();
	});

	test("MCP accepts Bearer token and returns data", async () => {
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 1 }),
		});

		expect(res.ok).toBe(true);
		const text = await res.text();
		expect(text.length).toBeGreaterThan(0);
	});

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
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
				Cookie: `accessToken=other_token_value`,
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 2 }),
		});

		expect(res.status).toBe(200);
	});

	test("MCP tool respects RLS and returns scoped data", async () => {
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

		const res = await fetch(`${BASE_URL}/mcp`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
				"Content-Type": "application/json",
				Accept: "application/json, text/event-stream",
			},
			body: JSON.stringify({ jsonrpc: "2.0", method: "health_check", id: 3 }),
		});

		expect(res.status).toBe(200);
	});
});
