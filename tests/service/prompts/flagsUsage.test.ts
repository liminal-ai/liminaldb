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

describe("Story 1 endpoints - flags + usage (red)", () => {
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

	test("PATCH /api/prompts/:slug/flags requires auth", async () => {
		const response = await app.inject({
			method: "PATCH",
			url: "/api/prompts/test/flags",
			payload: { pinned: true },
		});
		expect(response.statusCode).toBe(401);
	});

	test("PATCH /api/prompts/:slug/flags calls Convex mutation with slug + flags", async () => {
		// Green expectation: route returns 200 with { updated: true } on success.
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "PATCH",
			url: "/api/prompts/test-slug/flags",
			headers: {
				authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
			},
			payload: { pinned: true, favorited: false },
		});

		expect(response.statusCode).toBe(200);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test-slug",
				pinned: true,
				favorited: false,
			}),
		);
	});

	test("POST /api/prompts/:slug/usage requires auth", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test/usage",
		});
		expect(response.statusCode).toBe(401);
	});

	test("POST /api/prompts/:slug/usage triggers Convex mutation and returns 204", async () => {
		// Green expectation: fire-and-forget call, still returns a 204/No Content.
		mockConvex.mutation.mockResolvedValue(true);

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/test-slug/usage",
			headers: {
				authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
			},
		});

		expect(response.statusCode).toBe(204);
		expect(mockConvex.mutation).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				userId: "user_123",
				slug: "test-slug",
			}),
		);
	});
});
