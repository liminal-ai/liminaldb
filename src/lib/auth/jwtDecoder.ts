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
	if (!claims.sub || !claims.email || !claims.sid) {
		throw new Error("Missing required claims");
	}

	return {
		sub: claims.sub,
		email: claims.email,
		sid: claims.sid,
		org_id: claims.org_id,
	};
}
