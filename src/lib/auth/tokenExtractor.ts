import type { FastifyRequest } from "fastify";

import { TokenSource, type TokenExtractionResult } from "./types";

// Module augmentation for Fastify cookie signing
declare module "fastify" {
	interface FastifyRequest {
		unsignCookie?(
			value: string,
		): { valid: boolean; value: string | null } | undefined;
	}
}

export function extractToken(request: FastifyRequest): TokenExtractionResult {
	const authHeader = request.headers.authorization;
	const headerValue = Array.isArray(authHeader) ? authHeader[0] : authHeader;

	if (headerValue && typeof headerValue === "string") {
		const match = headerValue.match(/^Bearer\s+(.+)$/i);
		if (match?.[1]?.trim()) {
			return { token: match[1].trim(), source: TokenSource.BEARER };
		}
	}

	const cookieToken = request.cookies?.accessToken;
	if (cookieToken) {
		// If Fastify signing is used, unsignCookie will exist.
		if (typeof request.unsignCookie === "function") {
			const unsigned = request.unsignCookie(cookieToken);
			if (unsigned?.valid && unsigned.value) {
				return { token: unsigned.value, source: TokenSource.COOKIE };
			}
			// Signature invalid or missing - do NOT fall back to raw token.
			// Invalid signatures should be treated as no token.
			return { token: null, source: null };
		}
		// No signing configured - accept raw cookie token
		return { token: cookieToken, source: TokenSource.COOKIE };
	}

	return { token: null, source: null };
}
