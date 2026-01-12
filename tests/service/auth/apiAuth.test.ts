import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

// Mock validateJwt for WorkOS JWT validation
// Accept tokens that have 3 parts (like test JWT fixtures)
const mockValidateJwt = vi.hoisted(() =>
	vi.fn(async (token: string) => {
		const parts = token?.split(".");
		if (parts?.length === 3 && parts[2] === "signature") {
			return { valid: true };
		}
		return { valid: false, error: "Invalid token" };
	}),
);

vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mockValidateJwt,
}));

// Mock config before importing anything
vi.mock("../../../src/lib/config", () => ({
	config: {
		widgetJwtSecret: "test-secret-key-for-widget-jwt-testing",
		cookieSecret: "test_cookie_secret",
	},
}));

import {
	widgetAuthMiddleware,
	apiAuthMiddleware,
} from "../../../src/middleware/apiAuth";
import { createWidgetToken } from "../../../src/lib/auth/widgetJwt";
import { SignJWT } from "jose";
import { createTestJwt } from "../../fixtures";

async function createTestApp() {
	const app = Fastify({ logger: false });
	app.get(
		"/api/widget-secure",
		{ preHandler: widgetAuthMiddleware },
		async (request) => ({
			user: request.user ?? null,
		}),
	);
	await app.ready();
	return app;
}

describe("Widget Auth Middleware (widgetAuthMiddleware)", () => {
	let app: Awaited<ReturnType<typeof createTestApp>>;

	beforeEach(async () => {
		app = await createTestApp();
	});

	afterEach(async () => {
		await app.close();
	});

	test("returns 401 when no Authorization header", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Not authenticated" });
	});

	test("returns 401 when Authorization header is not Bearer", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: "Basic abc123" },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Not authenticated" });
	});

	test("returns 401 when Bearer token is empty", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: "Bearer " },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Not authenticated" });
	});

	test("returns 401 when token is invalid", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: "Bearer invalid.token.here" },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Invalid token" });
	});

	test("returns 401 when token is expired", async () => {
		// Create an expired token
		const secret = new TextEncoder().encode(
			"test-secret-key-for-widget-jwt-testing",
		);
		const expiredToken = await new SignJWT({ userId: "user_123" })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
			.setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
			.setIssuer("promptdb:widget")
			.sign(secret);

		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: `Bearer ${expiredToken}` },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Token expired" });
	});

	test("returns 401 when token has wrong signature", async () => {
		// Create a token with wrong secret
		const wrongSecret = new TextEncoder().encode("wrong-secret");
		const tamperedToken = await new SignJWT({ userId: "user_123" })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("1h")
			.setIssuer("promptdb:widget")
			.sign(wrongSecret);

		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: `Bearer ${tamperedToken}` },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Invalid token" });
	});

	test("populates request.user with valid token", async () => {
		const userId = "user_widget_test_123";
		const token = await createWidgetToken(userId);

		const response = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: `Bearer ${token}` },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			user: { id: userId },
		});
	});

	test("handles different user IDs correctly", async () => {
		const userId1 = "user_abc";
		const userId2 = "user_xyz";

		const token1 = await createWidgetToken(userId1);
		const token2 = await createWidgetToken(userId2);

		const response1 = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: `Bearer ${token1}` },
		});

		const response2 = await app.inject({
			method: "GET",
			url: "/api/widget-secure",
			headers: { authorization: `Bearer ${token2}` },
		});

		expect(response1.json()).toEqual({ user: { id: userId1 } });
		expect(response2.json()).toEqual({ user: { id: userId2 } });
	});
});

// Test app with apiAuthMiddleware (combined auth)
async function createApiAuthApp() {
	const app = Fastify({ logger: false });
	app.register(cookie, { secret: "test_cookie_secret" });
	app.get(
		"/api/combined-secure",
		{ preHandler: apiAuthMiddleware },
		async (request) => ({
			user: request.user ?? null,
			accessToken: request.accessToken ?? null,
		}),
	);
	await app.ready();
	return app;
}

describe("API Auth Middleware (apiAuthMiddleware)", () => {
	let app: Awaited<ReturnType<typeof createApiAuthApp>>;

	beforeEach(async () => {
		mockValidateJwt.mockClear();
		app = await createApiAuthApp();
	});

	afterEach(async () => {
		await app.close();
	});

	describe("widget JWT auth", () => {
		test("accepts valid widget JWT in Bearer header", async () => {
			const userId = "widget_user_123";
			const token = await createWidgetToken(userId);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: { authorization: `Bearer ${token}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				user: { id: userId },
				accessToken: null,
			});
		});

		test("returns 401 for invalid widget JWT", async () => {
			// Create a token with wrong secret
			const wrongSecret = new TextEncoder().encode("wrong-secret");
			const badToken = await new SignJWT({ userId: "user_123" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt()
				.setExpirationTime("1h")
				.setIssuer("promptdb:widget")
				.sign(wrongSecret);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: { authorization: `Bearer ${badToken}` },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Invalid token" });
		});

		test("returns 401 for expired widget JWT", async () => {
			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const expiredToken = await new SignJWT({ userId: "user_123" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
				.setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
				.setIssuer("promptdb:widget")
				.sign(secret);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: { authorization: `Bearer ${expiredToken}` },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Token expired" });
		});
	});

	describe("cookie (WorkOS JWT) auth", () => {
		test("accepts valid WorkOS JWT from cookie", async () => {
			const token = createTestJwt();
			const signed = app.signCookie(token);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: { cookie: `accessToken=${signed}` },
			});

			expect(response.statusCode).toBe(200);
			const body = response.json() as {
				user?: { id?: string; email?: string };
				accessToken?: string;
			};
			expect(body.user?.id).toBe("user_test123");
			expect(body.user?.email).toBe("test@example.com");
			expect(body.accessToken).toBe(token);
		});

		test("returns 401 when cookie token is invalid", async () => {
			// Use a token that mockValidateJwt will reject
			const badToken = "invalid.jwt.token";
			const signed = app.signCookie(badToken);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: { cookie: `accessToken=${signed}` },
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe("no auth", () => {
		test("returns 401 when no auth provided", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Not authenticated" });
		});
	});

	describe("priority", () => {
		test("prefers widget JWT over cookie when both present", async () => {
			const widgetUserId = "widget_user";
			const widgetToken = await createWidgetToken(widgetUserId);
			const cookieToken = createTestJwt();
			const signedCookie = app.signCookie(cookieToken);

			const response = await app.inject({
				method: "GET",
				url: "/api/combined-secure",
				headers: {
					authorization: `Bearer ${widgetToken}`,
					cookie: `accessToken=${signedCookie}`,
				},
			});

			expect(response.statusCode).toBe(200);
			const body = response.json() as { user?: { id?: string } };
			// Widget auth should win
			expect(body.user?.id).toBe(widgetUserId);
		});
	});
});
