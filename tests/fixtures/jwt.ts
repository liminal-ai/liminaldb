/**
 * JWT test fixtures for creating mock tokens.
 * Provides helpers for generating valid, expired, and malformed JWTs.
 */

import { Buffer } from "node:buffer";

/**
 * Claim overrides for customizing JWT payload.
 */
type ClaimOverrides = Partial<{
	sub: string;
	email: string;
	sid: string;
	org_id?: string;
	exp: number;
	iat: number;
}>;

const defaultClaims = {
	sub: "user_test123",
	email: "test@example.com",
	sid: "session_test123",
};

/**
 * Base64url encode a value for JWT segments.
 * @param value - The object to encode
 * @returns Base64url encoded string
 */
function base64UrlEncode(value: Record<string, unknown>): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/**
 * Build a JWT payload with optional claim overrides.
 * @param overrides - Optional claim overrides
 * @returns A mock JWT string
 */
function buildJwtPayload(overrides?: ClaimOverrides): string {
	const nowSeconds = Math.floor(Date.now() / 1000);
	const claims = {
		...defaultClaims,
		iat: nowSeconds,
		exp: nowSeconds + 60 * 60,
		...(overrides ?? {}),
	};
	const header = base64UrlEncode({ alg: "RS256", typ: "JWT" });
	const payload = base64UrlEncode(claims);
	return `${header}.${payload}.signature`;
}

/**
 * Create a valid test JWT with optional claim overrides.
 * @param overrides - Optional claim overrides
 * @returns A mock JWT string that will pass basic validation
 */
export function createTestJwt(overrides?: ClaimOverrides): string {
	return buildJwtPayload(overrides);
}

/**
 * Create an expired test JWT.
 * @param overrides - Optional claim overrides
 * @returns A mock JWT string with exp in the past
 */
export function createExpiredJwt(overrides?: ClaimOverrides): string {
	const nowSeconds = Math.floor(Date.now() / 1000);
	return buildJwtPayload({ exp: nowSeconds - 60, ...(overrides ?? {}) });
}

/**
 * Create a malformed JWT for testing error handling.
 * @param type - The type of malformation to apply
 * @returns A malformed JWT string for testing error cases
 */
export function createMalformedJwt(
	type:
		| "not-three-parts"
		| "invalid-base64"
		| "invalid-json"
		| "missing-claims",
): string {
	const header = base64UrlEncode({ alg: "RS256", typ: "JWT" });
	// payload available for potential future malformed token types
	const _payload = base64UrlEncode(defaultClaims);
	switch (type) {
		case "not-three-parts":
			return "invalidtoken";
		case "invalid-base64":
			return `${header}.@@@.signature`;
		case "invalid-json":
			return `${header}.${Buffer.from("not-json").toString("base64url")}.signature`;
		case "missing-claims":
			return `${header}.${base64UrlEncode({})}.signature`;
		default:
			return "invalidtoken";
	}
}
