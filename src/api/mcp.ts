import type { FastifyInstance } from "fastify";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createMcpServer } from "../lib/mcp";
import { authMiddleware } from "../middleware/auth";
import { config } from "../lib/config";

/**
 * Builds SDK AuthInfo from Fastify request user.
 * Skeleton: Returns minimal AuthInfo, user details go in extra field.
 */
export function buildAuthInfo(
	token: string,
	user: { id: string; email: string; sessionId: string },
): AuthInfo {
	// TODO: Populate with real values from WorkOS token
	return {
		token,
		clientId: "unknown", // TODO: Get from token or config
		scopes: [], // TODO: Get from token
		expiresAt: undefined, // TODO: Get from token
		extra: {
			userId: user.id,
			email: user.email,
			sessionId: user.sessionId,
		},
	};
}

/**
 * Interface for MCP transport - allows injection for testing
 */
export interface McpTransport {
	handleRequest(
		request: Request,
		options?: { authInfo?: AuthInfo },
	): Promise<Response>;
}

/**
 * Dependencies for MCP routes - allows injection for testing
 */
export interface McpDependencies {
	transport: McpTransport;
	mcpServer: McpServer;
}

/**
 * Creates default production dependencies
 */
function createDefaultDependencies(): McpDependencies {
	return {
		transport: new WebStandardStreamableHTTPServerTransport({
			sessionIdGenerator: undefined,
		}),
		mcpServer: createMcpServer(),
	};
}

// Track connections per transport instance
const connectedTransports = new WeakSet<McpTransport>();

export function registerMcpRoutes(
	fastify: FastifyInstance,
	deps: McpDependencies = createDefaultDependencies(),
): void {
	const { transport, mcpServer } = deps;
	// MCP endpoint - requires auth
	fastify.post(
		"/mcp",
		{ preHandler: authMiddleware },
		async (request, reply) => {
			try {
				// Connect on first request for this transport
				if (!connectedTransports.has(transport)) {
					await mcpServer.connect(transport);
					connectedTransports.add(transport);
				}

				// Build a web standard Request from Fastify's request
				const url = `http://localhost:5001${request.url}`;
				const headers = new Headers();
				for (const [key, value] of Object.entries(request.headers)) {
					if (value) {
						headers.set(key, Array.isArray(value) ? value.join(", ") : value);
					}
				}

				const webRequest = new Request(url, {
					method: "POST",
					headers,
					body: JSON.stringify(request.body),
				});

				// Build authInfo to pass to MCP SDK
				// This flows to tool handlers via the extra parameter
				const authInfo =
					request.user && request.accessToken
						? buildAuthInfo(request.accessToken, request.user)
						: undefined;

				// Handle request and get web standard Response
				// Pass authInfo so tools can access it via extra.authInfo
				const webResponse = await transport.handleRequest(webRequest, {
					authInfo,
				});

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
			let convexStatus = "no-user";
			let convexUser = null;

			if (request.user) {
				try {
					const { convex } = await import("../lib/convex");
					const { api } = await import("../../convex/_generated/api");
					// Use new pattern: pass apiKey + userId to Convex
					const result = await convex.query(api.healthAuth.check, {
						apiKey: config.convexApiKey,
						userId: request.user.id,
					});
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
