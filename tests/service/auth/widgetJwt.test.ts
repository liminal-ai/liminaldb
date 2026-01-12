import { describe, expect, test, vi } from "vitest";
import { SignJWT, jwtVerify } from "jose";

// Mock config before importing widgetJwt
vi.mock("../../../src/lib/config", () => ({
	config: {
		widgetJwtSecret: "test-secret-key-for-widget-jwt-testing",
	},
}));

import {
	createWidgetToken,
	verifyWidgetToken,
} from "../../../src/lib/auth/widgetJwt";

describe("Widget JWT", () => {
	describe("createWidgetToken", () => {
		test("creates a valid JWT with userId", async () => {
			const userId = "user_abc123";
			const token = await createWidgetToken(userId);

			// Token should be a non-empty string
			expect(token).toBeTruthy();
			expect(typeof token).toBe("string");

			// Token should have 3 parts (header.payload.signature)
			const parts = token.split(".");
			expect(parts).toHaveLength(3);
		});

		test("includes userId in payload", async () => {
			const userId = "user_xyz789";
			const token = await createWidgetToken(userId);

			// Decode and verify the payload contains userId
			const result = await verifyWidgetToken(token);
			expect(result.valid).toBe(true);
			expect(result.payload?.userId).toBe(userId);
		});

		test("sets issuer to promptdb:widget", async () => {
			const token = await createWidgetToken("user_123");

			// Manually decode to check issuer
			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const { payload } = await jwtVerify(token, secret);
			expect(payload.iss).toBe("promptdb:widget");
		});

		test("sets expiration to 4 hours", async () => {
			const before = Math.floor(Date.now() / 1000);
			const token = await createWidgetToken("user_123");
			const after = Math.floor(Date.now() / 1000);

			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const { payload } = await jwtVerify(token, secret);

			// exp should be ~4 hours (14400 seconds) from now
			const expectedMin = before + 14400;
			const expectedMax = after + 14400 + 1; // +1 for timing tolerance

			expect(payload.exp).toBeGreaterThanOrEqual(expectedMin);
			expect(payload.exp).toBeLessThanOrEqual(expectedMax);
		});
	});

	describe("verifyWidgetToken", () => {
		test("returns valid with payload for correct token", async () => {
			const userId = "user_verify_test";
			const token = await createWidgetToken(userId);

			const result = await verifyWidgetToken(token);

			expect(result.valid).toBe(true);
			expect(result.payload).toBeDefined();
			expect(result.payload?.userId).toBe(userId);
			expect(result.error).toBeUndefined();
		});

		test("returns invalid for empty token", async () => {
			const result = await verifyWidgetToken("");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("No token provided");
			expect(result.payload).toBeUndefined();
		});

		test("returns invalid for malformed token", async () => {
			const result = await verifyWidgetToken("not.a.valid.jwt");

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid token");
			expect(result.payload).toBeUndefined();
		});

		test("returns invalid for token with wrong signature", async () => {
			// Create a token with a different secret
			const wrongSecret = new TextEncoder().encode("wrong-secret-key");
			const tamperedToken = await new SignJWT({ userId: "user_123" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt()
				.setExpirationTime("1h")
				.setIssuer("promptdb:widget")
				.sign(wrongSecret);

			const result = await verifyWidgetToken(tamperedToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid token");
		});

		test("returns invalid for expired token", async () => {
			// Create an already-expired token
			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const expiredToken = await new SignJWT({ userId: "user_123" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
				.setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
				.setIssuer("promptdb:widget")
				.sign(secret);

			const result = await verifyWidgetToken(expiredToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Token expired");
		});

		test("returns invalid for token with wrong issuer", async () => {
			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const wrongIssuerToken = await new SignJWT({ userId: "user_123" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt()
				.setExpirationTime("1h")
				.setIssuer("wrong:issuer")
				.sign(secret);

			const result = await verifyWidgetToken(wrongIssuerToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid token");
		});

		test("returns invalid for token without userId", async () => {
			const secret = new TextEncoder().encode(
				"test-secret-key-for-widget-jwt-testing",
			);
			const noUserIdToken = await new SignJWT({ foo: "bar" })
				.setProtectedHeader({ alg: "HS256" })
				.setIssuedAt()
				.setExpirationTime("1h")
				.setIssuer("promptdb:widget")
				.sign(secret);

			const result = await verifyWidgetToken(noUserIdToken);

			expect(result.valid).toBe(false);
			expect(result.error).toBe("Invalid token payload");
		});
	});
});
