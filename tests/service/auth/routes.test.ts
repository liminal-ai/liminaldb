import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, vi } from "vitest";

import { createTestJwt } from "../../fixtures";

// Hoisted mocks - must define inline, not use imported functions
const workosMock = vi.hoisted(() => ({
	userManagement: {
		getAuthorizationUrl: vi.fn((params?: Record<string, string>) => {
			const baseUrl =
				"https://workos.com/oauth?client_id=client_test&redirect_uri=http://localhost:5001/auth/callback";
			const state = params?.state ? `&state=${params.state}` : "";
			return `${baseUrl}${state}`;
		}),
		authenticateWithCode: vi.fn(async () => ({
			accessToken: "test_access_token",
			refreshToken: "test_refresh_token",
			user: { id: "user_123", email: "test@example.com" },
		})),
		revokeSession: vi.fn(async () => {}),
	},
}));

vi.mock("../../../src/lib/workos", () => ({
	workos: workosMock,
	clientId: "client_test",
	redirectUri: "http://localhost:5001/auth/callback",
}));

// Hoisted mock for JWT validation
const mockValidateJwt = vi.hoisted(() =>
	vi.fn(async (token: string) => {
		if (token?.includes(".")) {
			return { valid: true };
		}
		return { valid: false, error: "Invalid token" };
	}),
);

vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mockValidateJwt,
	clearJwksCache: vi.fn(() => {}),
}));

import { registerAuthRoutes } from "../../../src/routes/auth";

process.env.COOKIE_SECRET ??= "test_cookie_secret";
process.env.WORKOS_API_KEY ??= "test_workos_api_key";
process.env.WORKOS_CLIENT_ID ??= "client_test";
process.env.WORKOS_REDIRECT_URI ??= "http://localhost:5001/auth/callback";

describe("Auth Routes", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		vi.clearAllMocks();
		app = Fastify({ logger: false });
		app.register(cookie, { secret: process.env.COOKIE_SECRET });
		registerAuthRoutes(app);
		await app.ready();
	});

	test("GET /auth/login redirects to provider", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/login",
		});

		expect(response.statusCode).toBe(302);
		expect(response.headers.location).toContain("workos");
	});

	test("GET /auth/login URL contains client_id", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/login",
		});

		expect(response.headers.location).toContain("client_id=");
	});

	test("GET /auth/login URL contains redirect_uri", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/login",
		});

		expect(response.headers.location).toContain("redirect_uri=");
	});

	test("GET /auth/login preserves redirect param", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/login?redirect=/dashboard",
		});

		expect(response.statusCode).toBe(302);
		expect(response.headers.location).toContain("/dashboard");
	});

	test("GET /auth/callback sets cookies and redirects", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/callback?code=testcode",
		});

		expect(response.statusCode).toBe(302);
		expect(
			response.cookies.find((c: { name: string }) => c.name === "accessToken"),
		).toBeDefined();
		expect(response.headers.location).toBe("/");
	});

	test("GET /auth/callback cookie is httpOnly", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/callback?code=testcode",
		});

		const cookie = response.cookies.find(
			(c: { name: string }) => c.name === "accessToken",
		);
		expect(cookie?.httpOnly).toBe(true);
	});

	test("GET /auth/callback cookie is secure in production", async () => {
		const originalEnv = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";

		const response = await app.inject({
			method: "GET",
			url: "/auth/callback?code=testcode",
		});

		const cookie = response.cookies.find(
			(c: { name: string }) => c.name === "accessToken",
		);
		expect(cookie?.secure).toBe(true);

		process.env.NODE_ENV = originalEnv;
	});

	test("GET /auth/callback redirects to saved location", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/callback?code=testcode&state=%7B%22redirect%22%3A%22%2Fdashboard%22%7D",
		});

		expect(response.headers.location).toContain("/dashboard");
	});

	test("GET /auth/callback with invalid code returns error", async () => {
		workosMock.userManagement.authenticateWithCode.mockImplementationOnce(
			async () => {
				throw new Error("invalid code");
			},
		);

		const response = await app.inject({
			method: "GET",
			url: "/auth/callback?code=badcode",
		});

		expect([400, 401, 500]).toContain(response.statusCode);
	});

	test("GET /auth/callback returns 400 when code missing", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/callback",
		});

		expect(response.statusCode).toBe(400);
	});

	test("GET /auth/logout clears cookies and redirects", async () => {
		// Now that logout requires auth middleware, we need to send a valid token
		const token = createTestJwt();
		const signedToken = app.signCookie(token);

		const response = await app.inject({
			method: "GET",
			url: "/auth/logout",
			cookies: {
				accessToken: signedToken,
			},
		});

		expect(response.statusCode).toBe(302);
		expect(
			response.cookies.find((c: { name: string }) => c.name === "accessToken")
				?.value,
		).toBe("");
		expect(response.headers.location).toBe("/");
	});

	test("GET /auth/me returns user info when authenticated", async () => {
		const token = createTestJwt();
		// Sign the cookie as Fastify would when setting signed cookies
		const signedToken = app.signCookie(token);
		const response = await app.inject({
			method: "GET",
			url: "/auth/me",
			cookies: {
				accessToken: signedToken,
			},
		});

		expect(response.statusCode).toBe(200);
		const payload = response.json();
		expect(payload.user.email).toBe("test@example.com");
	});

	test("GET /auth/me returns 401 when unauthenticated", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/auth/me",
		});

		expect(response.statusCode).toBe(401);
	});

	test("GET /auth/logout revokes WorkOS session", async () => {
		const token = createTestJwt();
		const signedToken = app.signCookie(token);

		const response = await app.inject({
			method: "GET",
			url: "/auth/logout",
			cookies: {
				accessToken: signedToken,
			},
		});

		expect(response.statusCode).toBe(302);
		// sessionId comes from the JWT's sid claim (session_test123 from createTestJwt)
		expect(workosMock.userManagement.revokeSession).toHaveBeenCalledWith({
			sessionId: "session_test123",
		});
	});

	test("GET /auth/logout clears cookie even if session revocation fails", async () => {
		workosMock.userManagement.revokeSession.mockImplementationOnce(async () => {
			throw new Error("WorkOS API error");
		});

		const token = createTestJwt();
		const signedToken = app.signCookie(token);

		const response = await app.inject({
			method: "GET",
			url: "/auth/logout",
			cookies: {
				accessToken: signedToken,
			},
		});

		expect(response.statusCode).toBe(302);
		expect(
			response.cookies.find((c: { name: string }) => c.name === "accessToken")
				?.value,
		).toBe("");
		expect(response.headers.location).toBe("/");
	});

	// Note: Testing JWT with missing claims is covered in middleware.test.ts
	// The auth middleware correctly rejects tokens missing required claims (sub, email, sid)
});
