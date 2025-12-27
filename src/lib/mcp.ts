import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { convex } from "./convex";
import { api } from "../../convex/_generated/api";
import { config } from "./config";
import { PromptInputSchema, SlugSchema } from "../schemas/prompts";

/**
 * Logger interface matching Fastify's structured logger
 */
interface McpLogger {
	error: (obj: unknown, msg?: string) => void;
}

/**
 * User info extracted from MCP authInfo.extra
 */
interface McpUserInfo {
	userId?: string;
	email?: string;
	sessionId?: string;
	logger?: McpLogger;
}

/**
 * Minimal type for MCP request handler extra parameter
 * Includes the authInfo that we use for user extraction
 */
interface McpExtra {
	authInfo?: {
		extra?: unknown;
	};
}

/**
 * Extract user info from MCP extra.authInfo
 * Returns the userId or undefined if not authenticated
 */
function extractMcpUserId(extra: McpExtra): string | undefined {
	const userInfo = extra.authInfo?.extra as McpUserInfo | undefined;
	return userInfo?.userId;
}

/**
 * Extract full user info from MCP extra.authInfo
 */
function extractMcpUserInfo(extra: McpExtra): McpUserInfo | undefined {
	return extra.authInfo?.extra as McpUserInfo | undefined;
}

/**
 * Extract logger from MCP extra.authInfo
 * Falls back to console if no logger available
 */
function extractMcpLogger(extra: McpExtra): McpLogger {
	const userInfo = extra.authInfo?.extra as McpUserInfo | undefined;
	return userInfo?.logger ?? { error: (obj, msg) => console.error(msg, obj) };
}

// Health check widget HTML - renders in ChatGPT iframe via window.openai
const healthWidgetHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 16px;
      background: var(--bg, #fff);
      color: var(--text, #1a1a1a);
    }
    .card {
      border: 1px solid var(--border, #e5e5e5);
      border-radius: 12px;
      padding: 20px;
      background: var(--card-bg, #fafafa);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .status-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }
    .status-ok { background: #dcfce7; }
    .status-error { background: #fee2e2; }
    .title { font-size: 18px; font-weight: 600; }
    .subtitle { font-size: 14px; color: var(--muted, #666); }
    .section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--border, #e5e5e5);
    }
    .section-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--muted, #666);
      margin-bottom: 8px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .detail-label { color: var(--muted, #666); }
    .detail-value { font-weight: 500; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-ok { background: #dcfce7; color: #166534; }
    .badge-error { background: #fee2e2; color: #991b1b; }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #1a1a1a;
        --text: #f5f5f5;
        --card-bg: #262626;
        --border: #404040;
        --muted: #a3a3a3;
      }
      .status-ok { background: #166534; }
      .status-error { background: #991b1b; }
      .badge-ok { background: #166534; color: #dcfce7; }
      .badge-error { background: #991b1b; color: #fee2e2; }
    }
  </style>
</head>
<body>
  <div id="root"><div class="card"><div class="title">Loading...</div></div></div>
  <script type="module">
    // Render function - called when data is available
    function render(data) {
      if (!data) return;

      const isOk = data.status === 'ok';
      const root = document.getElementById('root');

      root.innerHTML = \`
        <div class="card">
          <div class="header">
            <div class="status-icon \${isOk ? 'status-ok' : 'status-error'}">
              \${isOk ? '✓' : '✗'}
            </div>
            <div>
              <div class="title">PromptDB Health Check</div>
              <div class="subtitle">\${new Date().toLocaleString()}</div>
            </div>
          </div>

          <div class="detail-row">
            <span class="detail-label">Status</span>
            <span class="badge \${isOk ? 'badge-ok' : 'badge-error'}">\${data.status || 'unknown'}</span>
          </div>

          \${data.convex ? \`
            <div class="section">
              <div class="section-title">Convex Database</div>
              <div class="detail-row">
                <span class="detail-label">Connection</span>
                <span class="badge badge-ok">\${data.convex.status}</span>
              </div>
              \${data.convex.response?.user ? \`
                <div class="detail-row">
                  <span class="detail-label">User ID</span>
                  <span class="detail-value">\${typeof data.convex.response.user === 'object' ? JSON.stringify(data.convex.response.user) : data.convex.response.user}</span>
                </div>
              \` : ''}
              \${data.convex.response?.timestamp ? \`
                <div class="detail-row">
                  <span class="detail-label">Server Time</span>
                  <span class="detail-value">\${new Date(data.convex.response.timestamp).toLocaleString()}</span>
                </div>
              \` : ''}
            </div>
          \` : ''}

          \${data.error ? \`
            <div class="section">
              <div class="section-title">Error</div>
              <div class="detail-value" style="color: #dc2626;">\${data.error}</div>
            </div>
          \` : ''}

          \${data.user?.subject ? \`
            <div class="section">
              <div class="section-title">Authenticated User</div>
              <div class="detail-row">
                <span class="detail-label">Subject</span>
                <span class="detail-value" style="font-size: 12px;">\${data.user.subject}</span>
              </div>
            </div>
          \` : ''}
        </div>
      \`;
    }

    // 1. Try to render immediately if data already exists
    if (window.openai && window.openai.toolOutput) {
      render(window.openai.toolOutput);
    }

    // 2. Listen for async data arrival (CRITICAL for Skybridge)
    window.addEventListener('openai:set_globals', () => {
      if (window.openai && window.openai.toolOutput) {
        render(window.openai.toolOutput);
      }
    });
  </script>
</body>
</html>`;

export function createMcpServer(): McpServer {
	const server = new McpServer({
		name: "promptdb",
		version: "1.0.0",
	});

	// Register health widget as MCP resource for ChatGPT
	// Uses registerResource (not deprecated resource()) with proper _meta for CSP
	server.registerResource(
		"health-widget",
		"ui://widget/health",
		{ description: "Health check status widget for ChatGPT" },
		async () => ({
			contents: [
				{
					uri: "ui://widget/health",
					mimeType: "text/html+skybridge",
					text: healthWidgetHtml,
					_meta: {
						"openai/widgetPrefersBorder": true,
						"openai/widgetDomain": "https://chatgpt.com",
						"openai/widgetCSP": {
							// Empty since we inline all JS/CSS - no external resources needed
							connect_domains: [],
							resource_domains: [],
						},
					},
				},
			],
		}),
	);

	// Register health_check tool with _meta in the DESCRIPTOR (not just response)
	// This tells ChatGPT which widget to load BEFORE the tool runs
	server.registerTool(
		"health_check",
		{
			title: "Health Check",
			description: "Verify PromptDB stack connectivity with authenticated user",
			_meta: {
				"openai/outputTemplate": "ui://widget/health",
				"openai/toolInvocation/invoking": "Checking PromptDB health...",
				"openai/toolInvocation/invoked": "Health check complete.",
			},
		},
		// NOTE: When no inputSchema is defined, callback signature is (extra) not (args, extra)
		async (extra) => {
			try {
				// Get user ID from authInfo.extra (populated by buildAuthInfo in api/mcp.ts)
				const userId = extractMcpUserId(extra);

				if (!userId) {
					const errorData = {
						status: "error",
						error: "No user ID available",
					};
					return {
						structuredContent: errorData,
						content: [
							{
								type: "text" as const,
								text: "Health check failed: No user ID available",
							},
						],
					};
				}

				// Use new pattern: pass apiKey + userId to Convex
				const result = await convex.query(api.healthAuth.check, {
					apiKey: config.convexApiKey,
					userId,
				});

				const successData = {
					status: "ok",
					convex: {
						status: "authenticated",
						response: result,
					},
					user: {
						subject: userId,
					},
				};

				return {
					structuredContent: successData,
					content: [
						{
							type: "text" as const,
							text: `Health check passed. Convex connected and authenticated as user ${userId}.`,
						},
					],
				};
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Unknown error";
				const errorData = {
					status: "error",
					error: errorMessage,
				};
				return {
					structuredContent: errorData,
					content: [
						{
							type: "text" as const,
							text: `Health check failed: ${errorMessage}`,
						},
					],
				};
			}
		},
	);

	// Register test_auth tool
	// Returns authenticated user context for testing OAuth integration
	server.registerTool(
		"test_auth",
		{
			title: "Test Authentication",
			description:
				"Returns current authenticated user context for testing OAuth integration",
		},
		// NOTE: When no inputSchema is defined, callback signature is (extra) not (args, extra)
		async (extra) => {
			// Get user info from authInfo.extra (populated by buildAuthInfo)
			const userInfo = extractMcpUserInfo(extra);

			if (!userInfo?.userId) {
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

			return {
				content: [
					{
						type: "text" as const,
						text: `Authenticated as ${userInfo.email ?? userInfo.userId ?? "unknown"}`,
					},
				],
			};
		},
	);

	// Register save_prompts tool
	server.registerTool(
		"save_prompts",
		{
			title: "Save Prompts",
			description: "Save one or more prompts to your library",
			inputSchema: {
				prompts: z
					.array(PromptInputSchema)
					.max(100, "Maximum 100 prompts per batch"),
			},
		},
		async (args, extra) => {
			// Get user ID from authInfo.extra
			const userId = extractMcpUserId(extra);

			if (!userId) {
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

			try {
				const ids = await convex.mutation(api.prompts.insertPrompts, {
					apiKey: config.convexApiKey,
					userId,
					prompts: args.prompts,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ ids }),
						},
					],
				};
			} catch (error) {
				const logger = extractMcpLogger(extra);
				logger.error({ err: error, userId }, "[MCP] save_prompts error");
				// Sanitize error message to avoid leaking internal details
				let errorMessage = "Failed to save prompts";
				if (
					error instanceof Error &&
					error.message.includes("already exists")
				) {
					errorMessage = "Slug already exists";
				}
				return {
					content: [
						{
							type: "text" as const,
							text: errorMessage,
						},
					],
					isError: true,
				};
			}
		},
	);

	// Register get_prompt tool
	server.registerTool(
		"get_prompt",
		{
			title: "Get Prompt",
			description: "Retrieve a prompt by its slug",
			inputSchema: {
				slug: SlugSchema.describe("The prompt slug"),
			},
		},
		async (args, extra) => {
			// Get user ID from authInfo.extra
			const userId = extractMcpUserId(extra);

			if (!userId) {
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

			try {
				const prompt = await convex.query(api.prompts.getPromptBySlug, {
					apiKey: config.convexApiKey,
					userId,
					slug: args.slug,
				});

				if (!prompt) {
					return {
						content: [
							{
								type: "text" as const,
								text: "Prompt not found",
							},
						],
						isError: true,
					};
				}

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify(prompt),
						},
					],
				};
			} catch (error) {
				const logger = extractMcpLogger(extra);
				logger.error(
					{ err: error, slug: args.slug, userId },
					"[MCP] get_prompt error",
				);
				return {
					content: [
						{
							type: "text" as const,
							text: "Failed to get prompt",
						},
					],
					isError: true,
				};
			}
		},
	);

	// Register delete_prompt tool
	server.registerTool(
		"delete_prompt",
		{
			title: "Delete Prompt",
			description: "Delete a prompt by its slug",
			inputSchema: {
				slug: SlugSchema.describe("The prompt slug"),
			},
		},
		async (args, extra) => {
			// Get user ID from authInfo.extra
			const userId = extractMcpUserId(extra);

			if (!userId) {
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

			try {
				const deleted = await convex.mutation(api.prompts.deletePromptBySlug, {
					apiKey: config.convexApiKey,
					userId,
					slug: args.slug,
				});

				return {
					content: [
						{
							type: "text" as const,
							text: JSON.stringify({ deleted }),
						},
					],
				};
			} catch (error) {
				const logger = extractMcpLogger(extra);
				logger.error(
					{ err: error, slug: args.slug, userId },
					"[MCP] delete_prompt error",
				);
				return {
					content: [
						{
							type: "text" as const,
							text: "Failed to delete prompt",
						},
					],
					isError: true,
				};
			}
		},
	);

	return server;
}
