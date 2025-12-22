import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createAuthenticatedClient } from "./convex";
import { api } from "../../convex/_generated/api";

export function createMcpServer() {
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
				// Get access token from session data (passed via transport)
				const accessToken = extra.sessionId;

				if (!accessToken) {
					return {
						content: [
							{
								type: "text" as const,
								text: JSON.stringify({
									status: "error",
									error: "No access token available",
								}),
							},
						],
					};
				}

				// Call Convex with authenticated client
				const authClient = createAuthenticatedClient(accessToken);
				const result = await authClient.query(api.healthAuth.check);

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
