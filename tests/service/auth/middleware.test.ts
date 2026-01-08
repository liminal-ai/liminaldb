import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";

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
}));

import {
	TokenSource,
	decodeJwtClaims,
	extractToken,
	validateJwt,
} from "../../../src/lib/auth";
import { authMiddleware } from "../../../src/middleware/auth";
import {
	createExpiredJwt,
	createMalformedJwt,
	createTestJwt,
} from "../../fixtures";

async function createTokenApp() {
	const app = Fastify({ logger: false });
	app.register(cookie, { secret: "test_cookie_secret" });
	app.get("/token", async (request) => extractToken(request));
	await app.ready();
	return app;
}

async function createAuthApp() {
	const app = Fastify({ logger: false });
	app.register(cookie, { secret: "test_cookie_secret" });
	app.get("/api/secure", { preHandler: authMiddleware }, async (request) => ({
		user: request.user ?? null,
		accessToken: request.accessToken ?? null,
	}));
	await app.ready();
	return app;
}

describe("Auth Middleware", () => {
	describe("Token Extraction", () => {
		let app: Awaited<ReturnType<typeof createTokenApp>>;

		beforeEach(async () => {
			app = await createTokenApp();
		});

		afterEach(async () => {
			await app.close();
		});

		test("extracts Bearer token from Authorization header", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { authorization: "Bearer test.jwt.token" },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				token: "test.jwt.token",
				source: TokenSource.BEARER,
			});
		});

		test("extracts token from cookie when no Authorization header", async () => {
			const signed = app.signCookie("cookie.jwt.token");
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { cookie: `accessToken=${signed}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				token: "cookie.jwt.token",
				source: TokenSource.COOKIE,
			});
		});

		test("prefers bearer header over cookie", async () => {
			const signed = app.signCookie("cookie.jwt.token");
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: {
					authorization: "Bearer header.jwt.token",
					cookie: `accessToken=${signed}`,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				token: "header.jwt.token",
				source: TokenSource.BEARER,
			});
		});

		test("returns null token when none present", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ token: null, source: null });
		});

		test("rejects empty Bearer token", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { authorization: "Bearer " },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ token: null, source: null });
		});

		test("rejects malformed Bearer token", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { authorization: "Bear abc" },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ token: null, source: null });
		});

		test("rejects wrong auth scheme", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { authorization: "Basic abc123" },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ token: null, source: null });
		});

		test("rejects bearer with no space", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/token",
				headers: { authorization: "Bearerabc123" },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ token: null, source: null });
		});
	});

	describe("JWT Validation", () => {
		test("returns valid for a well-formed token", async () => {
			const token = createTestJwt();
			const result = await validateJwt(token);
			expect(result.valid).toBe(true);
		});

		test("returns invalid for expired token", async () => {
			const token = createExpiredJwt();
			mockValidateJwt.mockImplementationOnce(async () => ({
				valid: false,
				error: "Token expired",
			}));
			const result = await validateJwt(token);
			expect(result.valid).toBe(false);
		});

		test("returns invalid for malformed token", async () => {
			const token = createMalformedJwt("invalid-base64");
			mockValidateJwt.mockImplementationOnce(async () => ({
				valid: false,
				error: "Invalid token",
			}));
			const result = await validateJwt(token);
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
		});
	});

	describe("JWT Decode", () => {
		test("extracts claims from token", () => {
			const token = createTestJwt();
			const claims = decodeJwtClaims(token);
			expect(claims.sub).toBe("user_test123");
			expect(claims.email).toBe("test@example.com");
			expect(claims.sid).toBe("session_test123");
		});

		test("throws on malformed token", () => {
			const token = createMalformedJwt("invalid-base64");
			expect(() => decodeJwtClaims(token)).toThrow();
		});
	});

	describe("Middleware Integration", () => {
		let app: Awaited<ReturnType<typeof createAuthApp>>;

		beforeEach(async () => {
			app = await createAuthApp();
		});

		afterEach(async () => {
			await app.close();
		});

		test("attaches user and access token to request", async () => {
			const token = createTestJwt();
			const response = await app.inject({
				method: "GET",
				url: "/api/secure",
				headers: { authorization: `Bearer ${token}` },
			});

			expect(response.statusCode).toBe(200);
			const body = response.json() as {
				user?: { id?: string; email?: string; sessionId?: string };
				accessToken?: string;
			};
			expect(body.user?.id).toBe("user_test123");
			expect(body.user?.email).toBe("test@example.com");
			expect(body.user?.sessionId).toBe("session_test123");
			expect(body.accessToken).toBe(token);
		});

		test("returns 401 when token missing", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/secure",
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Not authenticated" });
		});

		test("returns 401 when token invalid", async () => {
			const token = createMalformedJwt("not-three-parts");
			mockValidateJwt.mockImplementationOnce(async () => ({
				valid: false,
				error: "Invalid token",
			}));

			const response = await app.inject({
				method: "GET",
				url: "/api/secure",
				headers: { authorization: `Bearer ${token}` },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toEqual({ error: "Invalid token" });
		});
	});
});
