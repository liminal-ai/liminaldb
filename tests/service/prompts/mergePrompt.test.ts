import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

// Mock convex client before importing routes
const mockConvex = createMockConvexClient();
vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

// Mock JWT validator
vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

// Mock config
vi.mock("../../../src/lib/config", () => ({
	config: {
		convexApiKey: "test_api_key",
		convexUrl: "http://localhost:9999",
	},
}));

const AUTH_HEADER = {
	authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
};

describe("POST /api/prompts/:slug/merge", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		const { registerPromptRoutes } = await import(
			"../../../src/routes/prompts"
		);
		app = Fastify();
		registerPromptRoutes(app);
		await app.ready();
		mockConvex.query.mockClear();
		mockConvex.mutation.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	// TC-2.1a: Single field, single occurrence
	test("replaces single field single occurrence", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Write in {{language}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { language: "Python" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Write in Python");
		expect(body.mergeFields).toEqual(["language"]);
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.1b: Single field, multiple occurrences
	test("replaces single field multiple occurrences", async () => {
		mockConvex.query.mockResolvedValue({
			content:
				"Use {{language}} because {{language}} is great. {{language}} rocks!",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { language: "Python" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe(
			"Use Python because Python is great. Python rocks!",
		);
		expect(body.mergeFields).toEqual(["language"]);
	});

	// TC-2.1c: Multiple fields
	test("replaces multiple fields", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Write {{code}} in {{language}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { code: "hello world", language: "Python" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Write hello world in Python");
		expect(body.mergeFields).toEqual(["code", "language"]);
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.1d: Empty string value
	test("empty string counts as filled", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Write in {{language}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { language: "" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Write in ");
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.2a: All fields filled
	test("unfilledFields empty when all filled", async () => {
		mockConvex.query.mockResolvedValue({
			content: "{{a}} and {{b}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { a: "1", b: "2" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.2b: Some fields unfilled
	test("unfilledFields lists missing fields", async () => {
		mockConvex.query.mockResolvedValue({
			content: "{{a}} and {{b}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { a: "value" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.unfilledFields).toEqual(["b"]);
	});

	// TC-2.2c: No values supplied
	test("unfilledFields lists all when values empty", async () => {
		mockConvex.query.mockResolvedValue({
			content: "{{a}} and {{b}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: {} },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.unfilledFields).toEqual(["a", "b"]);
	});

	// TC-2.3a: Partial merge
	test("unfilled fields remain as {{fieldName}}", async () => {
		mockConvex.query.mockResolvedValue({
			content: "{{greeting}} in {{language}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { greeting: "Hello" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Hello in {{language}}");
	});

	// TC-2.4a: No-op merge
	test("no-op merge returns content unchanged", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Just a plain prompt",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { anything: "value" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Just a plain prompt");
		expect(body.mergeFields).toEqual([]);
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.4b: Empty content
	test("empty content returns empty unchanged", async () => {
		mockConvex.query.mockResolvedValue({
			content: "",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { anything: "value" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("");
		expect(body.mergeFields).toEqual([]);
		expect(body.unfilledFields).toEqual([]);
	});

	// TC-2.5a: Original prompt unchanged
	test("original prompt unchanged after merge", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Hello {{name}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { name: "World" } },
		});

		// Only one mutation should fire: trackPromptUse (fire-and-forget)
		// No content-modifying mutation (updatePromptBySlug) should be called
		expect(mockConvex.mutation).toHaveBeenCalledTimes(1);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test",
			}),
		);
	});

	// TC-2.6a: Extra values
	test("extra values are ignored", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Hello {{a}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { a: "1", b: "2" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Hello 1");
		expect(body.mergeFields).toEqual(["a"]);
	});

	// TC-2.7a: Value containing merge field syntax
	test("value containing merge syntax is literal", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Hello {{name}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { name: "{{other}}" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Hello {{other}}");
	});

	// TC-2.7b: Value containing newlines
	test("value containing newlines is preserved", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Code: {{code}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { code: "line1\nline2\nline3" } },
		});

		expect(response.statusCode).toBe(200);
		const body = response.json();
		expect(body.content).toBe("Code: line1\nline2\nline3");
	});

	// TC-2.8a: Successful merge increments usage count
	test("successful merge increments usage count", async () => {
		mockConvex.query.mockResolvedValue({
			content: "Hello {{name}}",
			slug: "test",
		});
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test-slug/merge",
			headers: AUTH_HEADER,
			payload: { values: { name: "World" } },
		});

		expect(response.statusCode).toBe(200);
		expect(mockConvex.mutation).toHaveBeenCalledTimes(1);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test-slug",
			}),
		);
	});

	// TC-2.8b: 404 merge does not increment usage
	test("404 merge does not increment usage", async () => {
		mockConvex.query.mockResolvedValue(null);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/nonexistent/merge",
			headers: AUTH_HEADER,
			payload: { values: { name: "World" } },
		});

		expect(response.statusCode).toBe(404);
		expect(response.json()).toEqual({ error: "Prompt not found" });
		expect(mockConvex.mutation).not.toHaveBeenCalled();
	});

	// TC-2.8c: 400 validation failure does not increment usage
	test("400 validation failure does not increment usage", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { notValues: "invalid" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toHaveProperty("error");
		expect(mockConvex.mutation).not.toHaveBeenCalled();
	});

	// Risk: non-string values in dictionary must return 400
	test("400 when values contain non-string types", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			headers: AUTH_HEADER,
			payload: { values: { a: 123 } },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json()).toHaveProperty("error");
		expect(mockConvex.mutation).not.toHaveBeenCalled();
	});

	// Auth check
	test("requires authentication", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/merge",
			payload: { values: { name: "World" } },
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toEqual({ error: "Not authenticated" });
	});
});
