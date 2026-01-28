/**
 * Tests for MCP tool handlers in src/lib/mcp.ts
 *
 * These tests directly invoke the tool handlers to cover the actual
 * business logic, rather than mocking the transport layer.
 */

import { describe, test, expect, beforeEach, vi } from "vitest";
import { ConvexError } from "convex/values";

// Mock Convex client before importing - use explicit unknown return types
const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn(() => Promise.resolve([] as unknown)),
	query: vi.fn(() => Promise.resolve(null as unknown)),
}));

vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

vi.mock("../../../src/lib/config", () => ({
	config: {
		convexApiKey: "test_api_key",
		convexUrl: "http://localhost:9999",
	},
}));

vi.mock("../../../src/lib/redis", () => ({
	getCachedPreferences: vi.fn().mockResolvedValue(null),
	setCachedPreferences: vi.fn().mockResolvedValue(undefined),
	invalidateCachedPreferences: vi.fn().mockResolvedValue(undefined),
}));

import { createMcpServer } from "../../../src/lib/mcp";

/**
 * Result type from MCP tool handlers
 */
interface ToolResult {
	isError?: boolean;
	content: Array<{ type: string; text: string }>;
}

/**
 * Helper to create MCP extra object with userId
 */
function createMcpExtra(userId?: string): {
	authInfo?: { extra?: { userId?: string } };
} {
	if (!userId) {
		return {};
	}
	return {
		authInfo: {
			extra: { userId },
		},
	};
}

/**
 * Type for registered tool entry from MCP SDK
 */
interface RegisteredTool {
	handler: (args: unknown, extra: unknown) => Promise<ToolResult>;
	enabled: boolean;
}

/**
 * Internal MCP server type with access to registered tools.
 * This type exposes the internal _registeredTools property used by the SDK.
 */
interface McpServerWithInternals {
	_registeredTools?: Record<string, RegisteredTool>;
}

/**
 * Helper to find a registered tool handler by name and assert it exists
 */
function getToolHandler(
	server: ReturnType<typeof createMcpServer>,
	toolName: string,
): RegisteredTool {
	// The MCP SDK stores registered tools in _registeredTools object
	const serverWithInternals = server as unknown as McpServerWithInternals;
	const tools = serverWithInternals._registeredTools;
	const tool = tools?.[toolName];
	if (!tool) {
		throw new Error(`Tool ${toolName} not found`);
	}
	return tool;
}

describe("MCP Tool Handlers - save_prompts", () => {
	beforeEach(() => {
		mockConvex.mutation.mockClear();
		mockConvex.query.mockClear();
	});

	test("returns error when not authenticated", async () => {
		const server = createMcpServer();
		const tool = getToolHandler(server, "save_prompts");

		const result = await tool.handler(
			{ prompts: [] },
			createMcpExtra(undefined),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Not authenticated");
	});

	test("calls Convex mutation with correct args on success", async () => {
		mockConvex.mutation.mockResolvedValue(["prompt_id_1"]);

		const server = createMcpServer();
		const tool = getToolHandler(server, "save_prompts");

		const prompts = [
			{
				slug: "test-slug",
				name: "Test",
				description: "A test prompt",
				content: "Content here",
				tags: ["code"],
			},
		];

		const result = await tool.handler({ prompts }, createMcpExtra("user_123"));

		expect(result.isError).toBeUndefined();
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				prompts,
			}),
		);

		const parsed = JSON.parse(result.content[0]?.text ?? "{}");
		expect(parsed.ids).toEqual(["prompt_id_1"]);
	});

	test("returns sanitized error on duplicate slug", async () => {
		mockConvex.mutation.mockRejectedValue(
			new ConvexError({ code: "DUPLICATE_SLUG", slug: "test-slug" }),
		);

		const server = createMcpServer();
		const tool = getToolHandler(server, "save_prompts");

		const result = await tool.handler(
			{
				prompts: [
					{
						slug: "test-slug",
						name: "Test",
						description: "Test",
						content: "Test",
						tags: [],
					},
				],
			},
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Slug already exists");
	});

	test("returns generic error on other failures", async () => {
		mockConvex.mutation.mockRejectedValue(
			new Error("Database connection failed"),
		);

		const server = createMcpServer();
		const tool = getToolHandler(server, "save_prompts");

		const result = await tool.handler(
			{
				prompts: [
					{
						slug: "test-slug",
						name: "Test",
						description: "Test",
						content: "Test",
						tags: [],
					},
				],
			},
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Failed to save prompts");
	});
});

describe("MCP Tool Handlers - get_prompt", () => {
	beforeEach(() => {
		mockConvex.mutation.mockClear();
		mockConvex.query.mockClear();
	});

	test("returns error when not authenticated", async () => {
		const server = createMcpServer();
		const tool = getToolHandler(server, "get_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra(undefined),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Not authenticated");
	});

	test("returns prompt on success", async () => {
		const promptData = {
			slug: "test-slug",
			name: "Test Prompt",
			description: "A test",
			content: "Content here",
			tags: ["tag1"],
		};
		mockConvex.query.mockResolvedValue(promptData);

		const server = createMcpServer();
		const tool = getToolHandler(server, "get_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBeUndefined();
		expect(mockConvex.query).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test-slug",
			}),
		);

		const parsed = JSON.parse(result.content[0]?.text ?? "{}");
		expect(parsed).toEqual(promptData);
	});

	test("returns not found error when prompt does not exist", async () => {
		mockConvex.query.mockResolvedValue(null);

		const server = createMcpServer();
		const tool = getToolHandler(server, "get_prompt");

		const result = await tool.handler(
			{ slug: "nonexistent" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Prompt not found");
	});

	test("returns generic error on query failure and logs error", async () => {
		mockConvex.query.mockRejectedValue(new Error("Database error"));
		// Spy on console.error to verify logging
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const server = createMcpServer();
		const tool = getToolHandler(server, "get_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Failed to get prompt");
		expect(consoleSpy).toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});

describe("MCP Tool Handlers - delete_prompt", () => {
	beforeEach(() => {
		mockConvex.mutation.mockClear();
		mockConvex.query.mockClear();
	});

	test("returns error when not authenticated", async () => {
		const server = createMcpServer();
		const tool = getToolHandler(server, "delete_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra(undefined),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Not authenticated");
	});

	test("returns success result on delete", async () => {
		mockConvex.mutation.mockResolvedValue(true);

		const server = createMcpServer();
		const tool = getToolHandler(server, "delete_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBeUndefined();
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test-slug",
			}),
		);

		const parsed = JSON.parse(result.content[0]?.text ?? "{}");
		expect(parsed.deleted).toBe(true);
	});

	test("returns deleted:false when prompt not found", async () => {
		mockConvex.mutation.mockResolvedValue(false);

		const server = createMcpServer();
		const tool = getToolHandler(server, "delete_prompt");

		const result = await tool.handler(
			{ slug: "nonexistent" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBeUndefined();
		const parsed = JSON.parse(result.content[0]?.text ?? "{}");
		expect(parsed.deleted).toBe(false);
	});

	test("returns generic error on mutation failure and logs error", async () => {
		mockConvex.mutation.mockRejectedValue(new Error("Database error"));
		const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

		const server = createMcpServer();
		const tool = getToolHandler(server, "delete_prompt");

		const result = await tool.handler(
			{ slug: "test-slug" },
			createMcpExtra("user_123"),
		);

		expect(result.isError).toBe(true);
		expect(result.content[0]?.text).toBe("Failed to delete prompt");
		expect(consoleSpy).toHaveBeenCalled();

		consoleSpy.mockRestore();
	});
});
