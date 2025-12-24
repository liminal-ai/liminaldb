import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import { config } from "./config";

export function createMcpServer(): McpServer {
	const server = new McpServer({
		name: "promptdb",
		version: "1.0.0",
	});

	// Register health_check tool
	// Uses extra.authInfo to get user context (passed via transport.handleRequest)
	server.tool(
		"health_check",
		"Verify PromptDB stack connectivity with authenticated user",
		{},
		async (_args, extra) => {
			try {
				// Get user ID from authInfo.extra (populated by buildAuthInfo in api/mcp.ts)
				const userExtra = extra.authInfo?.extra as
					| { userId?: string; email?: string; sessionId?: string }
					| undefined;
				const userId = userExtra?.userId;

				if (!userId) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									status: "error",
									error: "No user ID available",
								}),
							},
						],
					};
				}

				// Use new pattern: pass apiKey + userId to Convex
				const result = await convex.query(api.healthAuth.check, {
					apiKey: config.convexApiKey,
					userId,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								status: "ok",
								convex: "authenticated",
								user: result.user,
							}),
						},
					],
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({
								status: "error",
								error: errorMessage,
							}),
						},
					],
				};
			}
		},
	);

	// Register test_auth tool
	// Returns authenticated user context for testing OAuth integration
	// Skeleton: Returns user info from extra.authInfo
	server.tool(
		"test_auth",
		"Returns current authenticated user context for testing OAuth integration",
		{},
		async (_args, extra) => {
			// Get user info from authInfo.extra (populated by buildAuthInfo)
			const userExtra = extra.authInfo?.extra as
				| { userId?: string; email?: string; sessionId?: string }
				| undefined;

			if (!userExtra?.userId) {
				return {
					content: [
						{
							type: "text" as const,
							text: "Not authenticated",
						},
					],
					isError: true,
				};
			}

			// TODO: Implement full response with structured content
			return {
				content: [
					{
						type: "text" as const,
						text: `Authenticated as ${userExtra.email}`,
					},
				],
			};
		},
	);

	return server;
}
