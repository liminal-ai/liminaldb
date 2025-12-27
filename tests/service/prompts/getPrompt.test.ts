import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestJwt } from "../../fixtures";

const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn<(...args: unknown[]) => Promise<string[]>>(() =>
		Promise.resolve([]),
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

describe("GET /api/prompts/:slug", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify();
		registerPromptRoutes(app);
		await app.ready();
		mockConvex.query.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	describe("authentication", () => {
		test("returns 401 without auth token", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/prompts/some-slug",
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe("success paths", () => {
		test("calls Convex query with correct args", async () => {
			mockConvex.query.mockResolvedValue({
				slug: "test-slug",
				name: "Test",
				description: "Desc",
				content: "Content",
				tags: ["tag1"],
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts/test-slug",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(200);
			expect(mockConvex.query).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					userId: "user_123",
					slug: "test-slug",
				}),
			);
		});

		test("returns prompt DTO with tags array", async () => {
			mockConvex.query.mockResolvedValue({
				slug: "test-slug",
				name: "Test Prompt",
				description: "A test prompt",
				content: "The content",
				tags: ["introspection", "claude"],
				parameters: undefined,
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts/test-slug",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({
				slug: "test-slug",
				name: "Test Prompt",
				description: "A test prompt",
				content: "The content",
				tags: ["introspection", "claude"],
			});
		});

		test("returns prompt with parameters when present", async () => {
			mockConvex.query.mockResolvedValue({
				slug: "template-prompt",
				name: "Template",
				description: "Has params",
				content: "Hello {{name}}",
				tags: [],
				parameters: [
					{
						name: "name",
						type: "string",
						required: true,
						description: "The name",
					},
				],
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts/template-prompt",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.json().parameters).toEqual([
				{
					name: "name",
					type: "string",
					required: true,
					description: "The name",
				},
			]);
		});
	});

	describe("not found", () => {
		test("returns 404 when prompt not found", async () => {
			mockConvex.query.mockResolvedValue(null);

			const response = await app.inject({
				method: "GET",
				url: "/api/prompts/nonexistent",
				headers: { authorization: `Bearer ${createTestJwt()}` },
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toHaveProperty("error");
		});
	});
});
