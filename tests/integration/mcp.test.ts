import { describe, expect, test, beforeAll } from "vitest";
import { getTestAuth, requireTestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

const BASE_URL = getTestBaseUrl();

interface McpToolsResponse {
	tools: Array<{ name: string; description: string }>;
	convex: string;
}

describe("MCP Endpoints", () => {
	beforeAll(() => {
		requireTestAuth();
	});

	test("GET /mcp/tools without auth returns 401", async () => {
		const res = await fetch(`${BASE_URL}/mcp/tools`);
		expect(res.status).toBe(401);
	});

	test("GET /mcp/tools with auth returns tools list", async () => {
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

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
