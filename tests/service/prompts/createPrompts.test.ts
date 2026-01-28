import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { ConvexError } from "convex/values";
import { createTestJwt } from "../../fixtures";

// Mock convex client before importing routes
const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn<(...args: unknown[]) => Promise<string[]>>(() =>
		Promise.resolve([]),
	),
	query: vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
		Promise.resolve(null),
	),
}));
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

import { registerPromptRoutes } from "../../../src/routes/prompts";

describe("POST /api/prompts", () => {
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
				method: "POST",
				url: "/api/prompts",
				payload: { prompts: [] },
			});

			expect(response.statusCode).toBe(401);
		});
	});

	describe("validation", () => {
		test("returns 400 with empty prompts array", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { prompts: [] },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toHaveProperty("error");
		});

		test("returns 400 with invalid slug format", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "Invalid:Slug",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toMatch(/slug/i);
		});

		test("returns 400 with empty name", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "valid-slug",
							name: "",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toMatch(/name/i);
		});
	});

	describe("success paths", () => {
		test("calls Convex mutation with correct payload", async () => {
			mockConvex.mutation.mockResolvedValue(["prompt_id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: {
					prompts: [
						{
							slug: "ai-meta-cognitive-check",
							name: "Meta Cognitive Experience Check",
							description:
								"Use when you want AI to introspect on its processing",
							content: "As you process this, note any shifts...",
							tags: ["instruction", "code", "review"],
							parameters: [
								{
									name: "target_section",
									type: "string",
									required: false,
									description: "Content section to focus on",
								},
							],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
			expect(mockConvex.mutation).toHaveBeenCalledWith(
				expect.anything(), // api.prompts.insertPrompts
				expect.objectContaining({
					userId: "user_123",
					prompts: expect.arrayContaining([
						expect.objectContaining({
							slug: "ai-meta-cognitive-check",
							tags: ["instruction", "code", "review"],
						}),
					]),
				}),
			);
		});

		test("returns created IDs on success", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "prompt-a",
							name: "A",
							description: "...",
							content: "...",
							tags: [],
						},
						{
							slug: "prompt-b",
							name: "B",
							description: "...",
							content: "...",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
			expect(response.json()).toEqual({ ids: ["id_1", "id_2"] });
		});

		test("batch with multiple tags passes all tags to mutation", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "multi-tag",
							name: "Multi Tag",
							description: "Has many tags",
							content: "Content here",
							tags: ["code", "review", "debug"],
						},
					],
				},
			});

			expect(mockConvex.mutation).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					prompts: expect.arrayContaining([
						expect.objectContaining({
							tags: ["code", "review", "debug"],
						}),
					]),
				}),
			);
		});

		test("batch with shared tags includes tag in both prompts", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

			await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "prompt-a",
							name: "A",
							description: "...",
							content: "...",
							tags: ["code", "review"],
						},
						{
							slug: "prompt-b",
							name: "B",
							description: "...",
							content: "...",
							tags: ["code", "debug"],
						},
					],
				},
			});

			const call = mockConvex.mutation.mock.calls[0];
			const payload = call?.[1] as
				| { prompts: Array<{ tags: string[] }> }
				| undefined;
			expect(payload?.prompts[0]?.tags).toContain("code");
			expect(payload?.prompts[1]?.tags).toContain("code");
		});
	});

	describe("error handling", () => {
		test("returns 409 on duplicate slug error from Convex", async () => {
			mockConvex.mutation.mockRejectedValue(
				new ConvexError({ code: "DUPLICATE_SLUG", slug: "existing-slug" }),
			);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "existing-slug",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(409);
		});
	});
});
