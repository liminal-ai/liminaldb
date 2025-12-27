import { describe, expect, test } from "vitest";
import { getTestAuth, hasTestAuth } from "../fixtures/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

interface AuthHealthResponse {
	status: string;
	user: { email: string };
	convex: string;
}

interface AuthMeResponse {
	user: { email: string };
}

describe("Authenticated Health Endpoints", () => {
	test("GET /api/health with auth returns user and convex status", async () => {
		if (!hasTestAuth()) {
			throw new Error("Test auth not configured");
		}
		const auth = await getTestAuth();
		if (!auth) throw new Error("Test auth not available");

		const res = await fetch(`${BASE_URL}/api/health`, {
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
			},
		});
		expect(res.ok).toBe(true);

		const data = (await res.json()) as AuthHealthResponse;
		expect(data.status).toBe("ok");
		expect(data.user).toBeDefined();
		expect(data.user.email).toBe(auth.email);
		expect(data.convex).toBe("authenticated");
	});

	test("GET /auth/me with auth returns user", async () => {
		if (!hasTestAuth()) {
			throw new Error("Test auth not configured");
		}
		const auth = await getTestAuth();
		if (!auth) throw new Error("Test auth not available");

		const res = await fetch(`${BASE_URL}/auth/me`, {
			headers: {
				Authorization: `Bearer ${auth.accessToken}`,
			},
		});
		expect(res.ok).toBe(true);

		const data = (await res.json()) as AuthMeResponse;
		expect(data.user).toBeDefined();
		expect(data.user.email).toBe(auth.email);
	});
});
