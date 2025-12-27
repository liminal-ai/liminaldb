import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, mock } from "bun:test";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

const mockConvex = createMockConvexClient();
mock.module("../../../src/lib/convex", () => ({ convex: mockConvex }));

mock.module("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: mock(async () => ({ valid: true })),
}));

mock.module("../../../src/lib/config", () => ({
	config: { convexApiKey: "test_api_key", convexUrl: "http://localhost:9999" },
}));

const { registerPromptRoutes } = await import("../../../src/routes/prompts");

describe("DELETE /api/prompts/:slug", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify();
		registerPromptRoutes(app);
		await app.ready();
		mockConvex.mutation.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	describe("authentication", () => {
		test("returns 401 without auth token", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: "/api/prompts/some-slug",
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe("success paths", () => {
		test("calls Convex mutation with correct args", async () => {
			mockConvex.mutation.mockResolvedValue(true);

			const response = await app.inject({
				method: "DELETE",
				url: "/api/prompts/test-slug",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockConvex.mutation).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: "user_123",
					slug: "test-slug",
				}),
			);
		});

		test("returns { deleted: true } on success", async () => {
			mockConvex.mutation.mockResolvedValue(true);

			const response = await app.inject({
				method: "DELETE",
				url: "/api/prompts/existing-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ deleted: true });
		});

		test("returns { deleted: false } when prompt not found", async () => {
			mockConvex.mutation.mockResolvedValue(false);

			const response = await app.inject({
				method: "DELETE",
				url: "/api/prompts/nonexistent",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ deleted: false });
		});
	});
});
