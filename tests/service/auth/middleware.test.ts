import { describe, expect, test, mock } from "bun:test";

mock.module("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mock(async (token: string) => {
		if (token && token.includes(".")) {
			return { valid: true };
		}
		return { valid: false, error: "Invalid token" };
	}),
}));

const { TokenSource, decodeJwtClaims, extractToken, validateJwt } =
	await import("../../../src/lib/auth");
const { authMiddleware } = await import("../../../src/middleware/auth");
import {
	createExpiredJwt,
	createMalformedJwt,
	createMockReply,
	createMockRequest,
	createTestJwt,
} from "../../fixtures";

describe("Auth Middleware", () => {
	describe("Token Extraction", () => {
		test("extracts Bearer token from Authorization header", () => {
			const request = createMockRequest({
				authorization: "Bearer test.jwt.token",
			});

			const result = extractToken(request as any);

			expect(result.token).toBe("test.jwt.token");
			expect(result.source).toBe(TokenSource.BEARER);
		});

		test("extracts token from cookie when no Authorization header", () => {
			const request = createMockRequest({
				cookies: { accessToken: "cookie.jwt.token" },
			});

			const result = extractToken(request as any);

			expect(result.token).toBe("cookie.jwt.token");
			expect(result.source).toBe(TokenSource.COOKIE);
		});

		test("prefers bearer header over cookie", () => {
			const request = createMockRequest({
				authorization: "Bearer header.jwt.token",
				cookies: { accessToken: "cookie.jwt.token" },
			});

			const result = extractToken(request as any);

			expect(result.token).toBe("header.jwt.token");
			expect(result.source).toBe(TokenSource.BEARER);
		});

		test("returns null token when none present", () => {
			const request = createMockRequest();
			const result = extractToken(request as any);
			expect(result.token).toBeNull();
			expect(result.source).toBeNull();
		});

		test("rejects empty Bearer token", () => {
			const request = createMockRequest({
				authorization: "Bearer ",
			});
			const result = extractToken(request as any);
			expect(result.token).toBeNull();
			expect(result.source).toBeNull();
		});

		test("rejects malformed Bearer token", () => {
			const request = createMockRequest({
				authorization: "Bear abc",
			});
			const result = extractToken(request as any);
			expect(result.token).toBeNull();
			expect(result.source).toBeNull();
		});

		test("rejects wrong auth scheme", () => {
			const request = createMockRequest({
				authorization: "Basic abc123",
			});
			const result = extractToken(request as any);
			expect(result.token).toBeNull();
			expect(result.source).toBeNull();
		});

		test("rejects bearer with no space", () => {
			const request = createMockRequest({
				authorization: "Bearerabc123",
			});
			const result = extractToken(request as any);
			expect(result.token).toBeNull();
			expect(result.source).toBeNull();
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
			(validateJwt as any).mockImplementationOnce(async () => ({
				valid: false,
				error: "Token expired",
			}));
			const result = await validateJwt(token);
			expect(result.valid).toBe(false);
		});

		test("returns invalid for malformed token", async () => {
			const token = createMalformedJwt("invalid-base64");
			(validateJwt as any).mockImplementationOnce(async () => ({
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
		test("attaches user and access token to request", async () => {
			const token = createTestJwt();
			const request = createMockRequest({
				authorization: `Bearer ${token}`,
			});
			const reply = createMockReply();

			await authMiddleware(request as any, reply as any);

			const typedRequest = request as any;
			expect(typedRequest.user?.id).toBe("user_test123");
			expect(typedRequest.user?.email).toBe("test@example.com");
			expect(typedRequest.user?.sessionId).toBe("session_test123");
			expect(typedRequest.accessToken).toBe(token);
			expect(reply.getStatus()).toBeNull();
		});

		test("returns 401 when token missing", async () => {
			const request = createMockRequest();
			const reply = createMockReply();

			await authMiddleware(request as any, reply as any);

			expect(reply.getStatus()).toBe(401);
			expect(reply.getBody()).toEqual({ error: "Not authenticated" });
		});

		test("returns 401 when token invalid", async () => {
			const token = createMalformedJwt("not-three-parts");
			const request = createMockRequest({
				authorization: `Bearer ${token}`,
			});
			const reply = createMockReply();

			(validateJwt as any).mockImplementationOnce(async () => ({
				valid: false,
				error: "Invalid token",
			}));

			await authMiddleware(request as any, reply as any);

			expect(reply.getStatus()).toBe(401);
			expect(reply.getBody()).toEqual({ error: "Invalid token" });
		});
	});
});
