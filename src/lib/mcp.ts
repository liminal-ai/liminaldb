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
	server.tool(
		"health_check",
		"Verify PromptDB stack connectivity with authenticated user",
		{},
		async (_args, extra) => {
			try {
				// Get user ID from session data (passed via transport)
				// Note: In the new architecture, the userId should be extracted from JWT
				// and passed through the session. For now, sessionId contains the userId.
				const userId = extra.sessionId;

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

	return server;
}
