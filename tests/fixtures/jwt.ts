import { Buffer } from "node:buffer";

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

function base64UrlEncode(value: Record<string, unknown>): string {
	return Buffer.from(JSON.stringify(value)).toString("base64url");
}

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

export function createTestJwt(overrides?: ClaimOverrides): string {
	return buildJwtPayload(overrides);
}

export function createExpiredJwt(overrides?: ClaimOverrides): string {
	const nowSeconds = Math.floor(Date.now() / 1000);
	return buildJwtPayload({ exp: nowSeconds - 60, ...(overrides ?? {}) });
}

export function createMalformedJwt(
	type:
		| "not-three-parts"
		| "invalid-base64"
		| "invalid-json"
		| "missing-claims",
): string {
	const header = base64UrlEncode({ alg: "RS256", typ: "JWT" });
	const payload = base64UrlEncode(defaultClaims);
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
