import type { FastifyInstance } from "fastify";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createMcpServer } from "../lib/mcp";
import { authMiddleware } from "../middleware/auth";

// Create a single MCP server instance
const mcpServer = createMcpServer();

// Create transport in stateless mode (no session tracking needed per architecture)
const transport = new WebStandardStreamableHTTPServerTransport({
	sessionIdGenerator: undefined,
});

// Connect server to transport once at startup
let connected = false;

export function registerMcpRoutes(fastify: FastifyInstance): void {
	// MCP endpoint - requires auth
	fastify.post(
		"/mcp",
		{ preHandler: authMiddleware },
		async (request, reply) => {
			try {
				// Connect on first request
				if (!connected) {
					await mcpServer.connect(transport);
					connected = true;
				}

				// Build a web standard Request from Fastify's request
				const url = `http://localhost:5001${request.url}`;
				const headers = new Headers();
				for (const [key, value] of Object.entries(request.headers)) {
					if (value) {
						headers.set(key, Array.isArray(value) ? value.join(", ") : value);
					}
				}

				// Add access token as custom header for the MCP server to use
				if (request.accessToken) {
					headers.set("x-access-token", request.accessToken);
				}

				const webRequest = new Request(url, {
					method: "POST",
					headers,
					body: JSON.stringify(request.body),
				});

				// Handle request and get web standard Response
				const webResponse = await transport.handleRequest(webRequest);

				// Convert web Response back to Fastify reply
				reply.status(webResponse.status);
				webResponse.headers.forEach((value, key) => {
					reply.header(key, value);
				});

				const responseBody = await webResponse.text();
				reply.send(responseBody);
			} catch (error) {
				fastify.log.error(error);
				reply.code(500).send({ error: "MCP request failed" });
			}
		},
	);

	// Tools list endpoint with Convex health check
	fastify.get(
		"/mcp/tools",
		{ preHandler: authMiddleware },
		async (request, reply) => {
			let convexStatus = "no-token";
			let convexUser = null;

			if (request.accessToken) {
				try {
					const { createAuthenticatedClient } = await import("../lib/convex");
					const { api } = await import("../../convex/_generated/api");
					const authClient = createAuthenticatedClient(request.accessToken);
					const result = await authClient.query(api.healthAuth.check);
					convexStatus = "authenticated";
					convexUser = result.user;
				} catch (error) {
					const msg = error instanceof Error ? error.message : "unknown";
					convexStatus = `error: ${msg}`;
				}
			}

			reply.send({
				tools: [
					{
						name: "health_check",
						description:
							"Verify PromptDB stack connectivity with authenticated user",
					},
				],
				convex: convexStatus,
				convexUser,
			});
		},
	);
}
