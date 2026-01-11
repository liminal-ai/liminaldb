import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyWidgetToken } from "../lib/auth/widgetJwt";
import {
	decodeJwtClaims,
	extractToken,
	validateJwt,
	type AuthUser,
} from "../lib/auth";

/**
 * Fastify preHandler middleware for widget authentication.
 * Validates widget JWT tokens and populates request.user on success.
 * Always returns 401 JSON on failure (no redirects).
 *
 * @param request - The Fastify request
 * @param reply - The Fastify reply
 */
export async function widgetAuthMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Extract Bearer token from Authorization header
	const authHeader = request.headers.authorization;
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const token = authHeader.slice(7); // Remove "Bearer " prefix
	if (!token) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	// Verify the widget token
	const result = await verifyWidgetToken(token);

	if (!result.valid || !result.payload) {
		return reply.code(401).send({ error: result.error ?? "Invalid token" });
	}

	// Populate request.user with the userId from the token
	request.user = {
		id: result.payload.userId,
	};
}

/**
 * Check if a Bearer token is a widget JWT (has promptdb:widget issuer).
 * Quick check without full verification - just decode and check issuer.
 */
function isWidgetToken(token: string): boolean {
	try {
		const parts = token.split(".");
		if (parts.length !== 3 || !parts[1]) return false;
		const payload = JSON.parse(
			Buffer.from(parts[1], "base64url").toString("utf-8"),
		);
		return payload.iss === "promptdb:widget";
	} catch {
		return false;
	}
}

/**
 * Combined auth middleware for API routes.
 * Accepts either:
 * 1. Cookie-based WorkOS JWT (web app)
 * 2. Bearer token with widget JWT (ChatGPT widget)
 *
 * Always returns 401 JSON on failure (no redirects).
 *
 * @param request - The Fastify request
 * @param reply - The Fastify reply
 */
export async function apiAuthMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// First check for Bearer token in Authorization header
	const authHeader = request.headers.authorization;
	if (authHeader?.startsWith("Bearer ")) {
		const bearerToken = authHeader.slice(7);

		// Check if it's a widget token
		if (bearerToken && isWidgetToken(bearerToken)) {
			const result = await verifyWidgetToken(bearerToken);
			if (result.valid && result.payload) {
				request.user = {
					id: result.payload.userId,
				};
				return; // Success - widget auth
			}
			return reply
				.code(401)
				.send({ error: result.error ?? "Invalid widget token" });
		}
	}

	// Fall back to cookie-based WorkOS JWT
	const { token } = extractToken(request);

	if (!token) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const validation = await validateJwt(token);
	if (!validation.valid) {
		return reply.code(401).send({ error: validation.error ?? "Invalid token" });
	}

	try {
		const claims = decodeJwtClaims(token);
		const user: AuthUser = {
			id: claims.sub,
			email: claims.email,
			sessionId: claims.sid,
		};
		request.user = user;
		request.accessToken = token;
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : "Invalid token";
		return reply.code(401).send({ error: message });
	}
}
