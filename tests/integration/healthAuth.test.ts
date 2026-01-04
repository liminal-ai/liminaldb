import { describe, expect, test, beforeAll } from "vitest";
import { getTestAuth, requireTestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

const BASE_URL = getTestBaseUrl();

interface AuthHealthResponse {
	status: string;
	user: { email: string };
	convex: string;
}

interface AuthMeResponse {
	user: { email: string };
}

describe("Authenticated Health Endpoints", () => {
	beforeAll(() => {
		requireTestAuth();
	});

	test("GET /api/health with auth returns user and convex status", async () => {
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

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
		const auth = await getTestAuth();
		if (!auth) throw new Error("Failed to get test auth");

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
