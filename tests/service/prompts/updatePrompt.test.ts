import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestJwt } from "../../fixtures";

const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn<(...args: unknown[]) => Promise<boolean>>(() =>
		Promise.resolve(true),
	),
	query: vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
		Promise.resolve(null),
	),
}));
vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

vi.mock("../../../src/lib/config", () => ({
	config: { convexApiKey: "test_api_key", convexUrl: "http://localhost:9999" },
}));

import { registerPromptRoutes } from "../../../src/routes/prompts";

const validPromptBody = {
	slug: "test-slug",
	name: "Test Prompt",
	description: "A test prompt",
	content: "Hello, {{name}}!",
	tags: ["code"],
};

describe("PUT /api/prompts/:slug", () => {
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
				method: "PUT",
				url: "/api/prompts/some-slug",
				payload: validPromptBody,
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe("validation", () => {
		test("returns 400 for invalid slug format in URL", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/INVALID_SLUG",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: validPromptBody,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toContain("Invalid slug");
		});

		test("returns 400 for missing name", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/test-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { ...validPromptBody, name: "" },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toContain("Name required");
		});

		test("returns 400 for missing description", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/test-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { ...validPromptBody, description: "" },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toContain("Description required");
		});

		test("returns 400 for missing content", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/test-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { ...validPromptBody, content: "" },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toContain("Content required");
		});
	});

	describe("success paths", () => {
		test("calls Convex mutation with correct args", async () => {
			mockConvex.mutation.mockResolvedValue(true);

			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/existing-slug",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: validPromptBody,
			});

			expect(response.statusCode).toBe(200);
			expect(mockConvex.mutation).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: "user_123",
					slug: "existing-slug",
					updates: expect.objectContaining({
						slug: "test-slug",
						name: "Test Prompt",
						content: "Hello, {{name}}!",
					}),
				}),
			);
		});

		test("returns { updated: true } on success", async () => {
			mockConvex.mutation.mockResolvedValue(true);

			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/existing-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: validPromptBody,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ updated: true });
		});

		test("allows slug rename in body", async () => {
			mockConvex.mutation.mockResolvedValue(true);

			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/old-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { ...validPromptBody, slug: "new-slug" },
			});

			expect(response.statusCode).toBe(200);
			expect(mockConvex.mutation).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					slug: "old-slug",
					updates: expect.objectContaining({
						slug: "new-slug",
					}),
				}),
			);
		});
	});

	describe("error handling", () => {
		test("returns 404 when prompt not found", async () => {
			mockConvex.mutation.mockResolvedValue(false);

			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/nonexistent",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: validPromptBody,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json().error).toBe("Prompt not found");
		});

		test("returns 409 when new slug conflicts", async () => {
			mockConvex.mutation.mockRejectedValue(
				new Error('Slug "new-slug" already exists'),
			);

			const response = await app.inject({
				method: "PUT",
				url: "/api/prompts/old-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { ...validPromptBody, slug: "new-slug" },
			});

			expect(response.statusCode).toBe(409);
			expect(response.json().error).toBe("Slug already exists");
		});
	});
});
