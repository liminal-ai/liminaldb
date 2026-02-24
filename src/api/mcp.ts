import type { FastifyInstance } from "fastify";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { createMcpServer } from "../lib/mcp";
import { authMiddleware } from "../middleware/auth";
import { config } from "../lib/config";
import { decodeJwtClaims } from "../lib/auth";

/**
 * Builds SDK AuthInfo from Fastify request token and user.
 * Extracts real values from JWT claims for proper MCP SDK integration.
 */
export function buildAuthInfo(
	token: string,
	user: { id: string; email?: string; sessionId?: string },
): AuthInfo {
	// Decode JWT to extract audience, scopes, and expiration
	// Token is already validated by authMiddleware, so this should succeed
	let clientId = config.workosClientId;
	let scopes: string[] = [];
	let expiresAt: number | undefined;

	try {
		const claims = decodeJwtClaims(token);
		// Use audience from token if available, fallback to config
		if (claims.aud) {
			clientId = claims.aud;
		}
		// Parse space-separated scope string into array
		if (claims.scope) {
			scopes = claims.scope.split(" ").filter((s) => s.length > 0);
		}
		// Convert Unix timestamp (seconds) to milliseconds for JS Date
		if (claims.exp) {
			expiresAt = claims.exp * 1000;
		}
	} catch {
		// If decode fails, use defaults - token was already validated
	}

	return {
		token,
		clientId,
		scopes,
		expiresAt,
		extra: {
			userId: user.id,
			email: user.email,
			sessionId: user.sessionId,
		},
	};
}

/**
 * Interface for MCP transport - allows injection for testing.
 * Extends Transport for mcpServer.connect() compatibility.
 * Tests can provide minimal implementations that satisfy handleRequest.
 */
export interface McpTransport extends Partial<Transport> {
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

	// Shared handler for all MCP methods (POST, GET, DELETE)
	const handleMcpRequest = async (
		request: {
			url: string;
			method: string;
			headers: Record<string, string | string[] | undefined>;
			body?: unknown;
			user?: { id: string; email?: string; sessionId?: string };
			accessToken?: string;
		},
		reply: {
			status: (code: number) => typeof reply;
			header: (key: string, value: string) => typeof reply;
			send: (body: unknown) => void;
			code: (code: number) => typeof reply;
		},
		logger: { error: (obj: unknown, msg?: string) => void },
	) => {
		try {
			// Connect on first request for this transport
			// Cast to Transport - real transport has all methods, test mocks only need handleRequest
			if (!connectedTransports.has(transport)) {
				await mcpServer.connect(transport as Transport);
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

			const requestInit: RequestInit = {
				method: request.method,
				headers,
			};

			// Only add body for POST requests
			if (request.method === "POST" && request.body) {
				requestInit.body = JSON.stringify(request.body);
			}

			const webRequest = new Request(url, requestInit);

			// Build authInfo to pass to MCP SDK
			// This flows to tool handlers via the extra parameter
			const authInfo =
				request.user && request.accessToken
					? buildAuthInfo(request.accessToken, request.user)
					: undefined;

			// Add logger to extra so MCP tools can use structured logging
			if (authInfo) {
				authInfo.extra = { ...authInfo.extra, logger };
			}

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
			logger.error(error);
			reply.code(500).send({ error: "MCP request failed" });
		}
	};

	// MCP endpoint - POST for client-to-server requests
	fastify.post("/mcp", { preHandler: authMiddleware }, async (request, reply) =>
		handleMcpRequest(request, reply, fastify.log),
	);

	// MCP endpoint - GET for SSE streaming (server-initiated messages)
	fastify.get("/mcp", { preHandler: authMiddleware }, async (request, reply) =>
		handleMcpRequest(request, reply, fastify.log),
	);

	// MCP endpoint - DELETE for closing sessions
	fastify.delete(
		"/mcp",
		{ preHandler: authMiddleware },
		async (request, reply) => handleMcpRequest(request, reply, fastify.log),
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
							"Verify LiminalDB stack connectivity with authenticated user",
					},
				],
				convex: convexStatus,
				convexUser,
			});
		},
	);
}
