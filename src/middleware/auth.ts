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
		if (isMcpRoute(request)) {
			sendMcpAuthChallenge(request, reply, "missing_token");
		}
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const validation = await validateJwt(token);
	if (!validation.valid) {
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
