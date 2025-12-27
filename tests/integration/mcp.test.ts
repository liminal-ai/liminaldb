import { describe, expect, test } from "vitest";
import { getTestAuth, hasTestAuth } from "../fixtures/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

interface McpToolsResponse {
	tools: Array<{ name: string; description: string }>;
	convex: string;
}

describe("MCP Endpoints", () => {
	test("GET /mcp/tools without auth returns 401", async () => {
		const res = await fetch(`${BASE_URL}/mcp/tools`);
		expect(res.status).toBe(401);
	});

	test("GET /mcp/tools with auth returns tools list", async () => {
		if (!hasTestAuth()) {
			throw new Error("Test auth not configured");
		}
		const auth = await getTestAuth();
		if (!auth) throw new Error("Test auth not available");

		const res = await fetch(`${BASE_URL}/mcp/tools`, {
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
			},
		});
		expect(res.ok).toBe(true);

		const data = (await res.json()) as McpToolsResponse;
		expect(data.tools).toBeDefined();
		expect(Array.isArray(data.tools)).toBe(true);
		expect(data.tools.length).toBeGreaterThan(0);

		const healthTool = data.tools.find((t) => t.name === "health_check");
		expect(healthTool).toBeDefined();

		expect(data.convex).toBe("authenticated");
	});
});
