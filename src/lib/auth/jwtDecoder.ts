import type { JwtClaims } from "./types";

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
