import { describe, expect, test } from "bun:test";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

interface HealthResponse {
	status: string;
	timestamp: string;
	convex: string;
}

describe("Health Endpoints", () => {
	test("GET /health returns ok with convex status", async () => {
		const res = await fetch(`${BASE_URL}/health`);
		expect(res.ok).toBe(true);

		const data = (await res.json()) as HealthResponse;
		expect(data.status).toBe("ok");
		expect(data.timestamp).toBeDefined();
		expect(data.convex).toBeDefined();
	});

	test("GET /api/health without auth returns 401", async () => {
		const res = await fetch(`${BASE_URL}/api/health`);
		expect(res.status).toBe(401);
	});
});
