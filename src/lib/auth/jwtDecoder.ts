import type { JwtClaims } from "./types";

/**
 * Maximum allowed length for user ID from JWT sub claim.
 * WorkOS user IDs are typically ~30 chars (e.g., user_01ABCDEF...).
 * 255 provides generous headroom for future format changes.
 */
const MAX_USER_ID_LENGTH = 255;

export function decodeJwtClaims(token: string): JwtClaims {
	const parts = token.split(".");
	if (parts.length !== 3) {
		throw new Error("Invalid token format");
	}

	const [, payloadPart] = parts as [string, string, string];
	let decoded: unknown;
	try {
		const json = Buffer.from(payloadPart, "base64url").toString("utf8");
		decoded = JSON.parse(json);
	} catch (error) {
		const message =
			error instanceof Error && error.message
				? error.message
				: "Invalid token payload";
		throw new Error(message);
	}

	const claims = decoded as Partial<JwtClaims>;

	// Only sub is required - email and sid may not be present in MCP OAuth tokens
	if (!claims.sub) {
		throw new Error("Missing required claim (sub)");
	}

	// Validate user ID length to catch unexpected format changes from auth provider
	if (claims.sub.length > MAX_USER_ID_LENGTH) {
		throw new Error(
			`User ID exceeds maximum length (${MAX_USER_ID_LENGTH} chars)`,
		);
	}

	return {
		sub: claims.sub,
		email: claims.email, // May be undefined for MCP tokens
		sid: claims.sid, // May be undefined for MCP tokens
		org_id: claims.org_id,
		aud: claims.aud, // Audience (client ID) for AuthInfo
		scope: claims.scope, // Scopes for AuthInfo
		exp: claims.exp, // Expiration for AuthInfo
	};
}
