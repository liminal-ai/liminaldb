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

describe("GET /api/prompts", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		const { registerPromptRoutes } = await import(
			"../../../src/routes/prompts"
		);
		app = Fastify();
		registerPromptRoutes(app);
		await app.ready();
		mockConvex.query.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	describe("TC-2.1: Returns user's prompts", () => {
		test("calls Convex query with userId", async () => {
			mockConvex.query.mockResolvedValue([
				{
					slug: "prompt-1",
					name: "Prompt 1",
					description: "...",
					content: "...",
					tags: [],
				},
			]);

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockConvex.query).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ userId: "user_123" }),
			);
		});

		test("returns array of prompts", async () => {
			mockConvex.query.mockResolvedValue([
				{
					slug: "prompt-1",
					name: "Prompt 1",
					description: "...",
					content: "...",
					tags: ["a"],
				},
				{
					slug: "prompt-2",
					name: "Prompt 2",
					description: "...",
					content: "...",
					tags: ["b"],
				},
			]);

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.statusCode).toBe(200);
			const body = response.json();
			expect(body).toHaveLength(2);
			expect(body[0].slug).toBe("prompt-1");
		});
	});

	describe("TC-2.1b: Passes query param to Convex", () => {
		test("passes q param to query", async () => {
			mockConvex.query.mockResolvedValue([]);

			await app.inject({
				method: "GET",
				url: "/api/prompts?q=search-term",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(mockConvex.query).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ query: "search-term" }),
			);
		});
	});

	describe("TC-2.1c: Returns 401 without auth", () => {
		test("returns 401 without auth header", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/prompts",
			});

			expect(response.statusCode).toBe(401);
		});
	});
});
