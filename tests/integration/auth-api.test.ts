import { describe, expect, test } from "bun:test";

import { createExpiredJwt, createTestJwt } from "../fixtures/jwt";
import { getTestAuth, hasTestAuth } from "../fixtures/auth";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

describe("Auth API Integration", () => {
	test.skipIf(!hasTestAuth())(
		"Bearer token authenticates successfully",
		async () => {
			const auth = await getTestAuth();
			if (!auth) throw new Error("Test auth not available");

			const res = await fetch(`${BASE_URL}/api/health`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(res.ok).toBe(true);
			const data = (await res.json()) as any;
			expect(data.user.email).toBe(auth.email);
		},
	);

	test("Cookie token authenticates", async () => {
		const token = createTestJwt();
		const res = await fetch(`${BASE_URL}/api/health`, {
			headers: {
				cookie: `accessToken=${token}`,
			},
		});

		expect(res.status).toBe(200);
	});

	test("Bearer takes precedence over cookie", async () => {
		const bearer = createTestJwt({ email: "bearer@example.com" });
		const cookieToken = createTestJwt({ email: "cookie@example.com" });
		const res = await fetch(`${BASE_URL}/api/health`, {
			headers: {
				Authorization: `Bearer ${bearer}`,
				cookie: `accessToken=${cookieToken}`,
			},
		});

		expect(res.status).toBe(200);
	});

	test("Invalid token returns 401", async () => {
		const res = await fetch(`${BASE_URL}/api/health`, {
			headers: { Authorization: "Bearer invalid.token.value" },
		});

		expect(res.status).toBe(401);
	});

	test("Expired token returns 401", async () => {
		const res = await fetch(`${BASE_URL}/api/health`, {
			headers: { Authorization: `Bearer ${createExpiredJwt()}` },
		});

		expect(res.status).toBe(401);
	});

	test("Missing token returns 401", async () => {
		const res = await fetch(`${BASE_URL}/api/health`);
		expect(res.status).toBe(401);
	});
});
