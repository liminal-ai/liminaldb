/**
 * OAuth Protected Resource Metadata endpoint (RFC 9728).
 *
 * Tells MCP clients where to authenticate. Returns metadata including:
 * - resource: The protected resource URL (our MCP endpoint)
 * - authorization_servers: Where to get tokens (WorkOS AuthKit)
 * - scopes_supported: What scopes we support
 */

import type { FastifyInstance } from "fastify";

export function registerWellKnownRoutes(fastify: FastifyInstance): void {
	fastify.get(
		"/.well-known/oauth-protected-resource",
		async (_request, reply) => {
			// Read config at request time to support testing missing config scenarios
			const resource = process.env.MCP_RESOURCE_URL;
			const authServer = process.env.WORKOS_AUTH_SERVER_URL;

			if (!resource || !authServer) {
				return reply
					.code(500)
					.send({ error: "MCP OAuth configuration missing" });
			}

			reply.header("cache-control", "public, max-age=3600").send({
				resource,
				authorization_servers: [authServer],
				scopes_supported: ["openid", "profile", "email"],
			});
		},
	);
}
