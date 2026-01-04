import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthUser } from "../lib/auth";
import { decodeJwtClaims, extractToken, validateJwt } from "../lib/auth";

/**
 * Checks if the request is for an MCP endpoint.
 */
function isMcpRoute(request: FastifyRequest): boolean {
	return request.url.startsWith("/mcp");
}

/**
 * Checks if the request is for an API endpoint.
 */
function isApiRoute(request: FastifyRequest): boolean {
	return request.url.startsWith("/api/") || request.url.startsWith("/auth/");
}

/**
 * Checks if the request is for a browser page (should redirect on auth failure).
 * Browser routes are anything that's not an API or MCP route.
 */
function isBrowserRoute(request: FastifyRequest): boolean {
	return !isApiRoute(request) && !isMcpRoute(request);
}

/**
 * Sends a 401 response with WWW-Authenticate header for MCP routes.
 * The header tells clients where to find auth metadata (RFC 9728).
 */
export function sendMcpAuthChallenge(
	request: FastifyRequest,
	reply: FastifyReply,
	error: string,
): void {
	// Build the base URL for the metadata endpoint
	const baseUrl =
		process.env.BASE_URL || `${request.protocol}://${request.hostname}`;
	const metadataUrl = `${baseUrl}/.well-known/oauth-protected-resource`;

	reply.header(
		"www-authenticate",
		`Bearer resource_metadata="${metadataUrl}", error="${error}"`,
	);
}

declare module "fastify" {
	interface FastifyRequest {
		user?: AuthUser;
		accessToken?: string;
	}
}

export async function authMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const { token } = extractToken(request);

	if (!token) {
		// Browser routes redirect to login
		if (isBrowserRoute(request)) {
			const returnTo = encodeURIComponent(request.url);
			return reply.redirect(`/auth/login?returnTo=${returnTo}`);
		}
		if (isMcpRoute(request)) {
			sendMcpAuthChallenge(request, reply, "missing_token");
		}
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const validation = await validateJwt(token);
	if (!validation.valid) {
		// Browser routes redirect to login on invalid token
		if (isBrowserRoute(request)) {
			const returnTo = encodeURIComponent(request.url);
			return reply.redirect(`/auth/login?returnTo=${returnTo}`);
		}
		if (isMcpRoute(request)) {
			sendMcpAuthChallenge(request, reply, "invalid_token");
		}
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
