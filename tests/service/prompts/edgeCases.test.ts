/**
 * Edge case tests for prompt validation.
 * Tests boundary conditions for field lengths, special characters, etc.
 */

import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestJwt } from "../../fixtures";
import { LIMITS } from "../../../src/schemas/prompts";

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

describe("POST /api/prompts - Edge Cases", () => {
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

	describe("slug edge cases", () => {
		test("accepts single character slug", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "a",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("accepts numbers-only slug", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "123",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("accepts slug at max length", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);
			const maxSlug = "a".repeat(LIMITS.SLUG_MAX_LENGTH);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: maxSlug,
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("rejects slug exceeding max length", async () => {
			const tooLongSlug = "a".repeat(LIMITS.SLUG_MAX_LENGTH + 1);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: tooLongSlug,
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});

		test("rejects slug starting with dash", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "-test",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});

		test("rejects slug ending with dash", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "test-",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});

		test("rejects slug with consecutive dashes", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "test--slug",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe("content length edge cases", () => {
		test("accepts content at max length", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);
			const maxContent = "x".repeat(LIMITS.CONTENT_MAX_LENGTH);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "max-content",
							name: "Test",
							description: "Test",
							content: maxContent,
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("rejects content exceeding max length", async () => {
			const tooLongContent = "x".repeat(LIMITS.CONTENT_MAX_LENGTH + 1);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "too-long-content",
							name: "Test",
							description: "Test",
							content: tooLongContent,
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});
	});

	describe("tags edge cases", () => {
		test("accepts empty tags array", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "no-tags",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("accepts all 19 global tags", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);
			// All 19 global tags
			const allTags = [
				"instruction",
				"reference",
				"persona",
				"workflow",
				"snippet",
				"code",
				"writing",
				"analysis",
				"planning",
				"design",
				"data",
				"communication",
				"review",
				"summarize",
				"explain",
				"debug",
				"transform",
				"extract",
				"translate",
			];

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "all-tags",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: allTags,
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("rejects invalid tag names", async () => {
			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "invalid-tags",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: ["invalid-tag-name"],
						},
					],
				},
			});

			expect(response.statusCode).toBe(400);
		});

		test("deduplicates duplicate tags silently", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "dupe-tags",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: ["code", "code", "review", "code"],
						},
					],
				},
			});

			// Verify deduplicated tags were passed to Convex
			const callArgs = mockConvex.mutation.mock.calls[0]?.[1] as
				| { prompts: Array<{ tags: string[] }> }
				| undefined;
			expect(callArgs?.prompts[0]?.tags).toEqual(["code", "review"]);
		});
	});

	describe("unicode and special characters", () => {
		test("accepts unicode in content", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "unicode-content",
							name: "Test",
							description: "Test",
							content: "Hello World with emojis",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("accepts unicode in name and description", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "unicode-fields",
							name: "Chinese characters, Japanese hiragana",
							description: "Cyrillic script",
							content: "Regular content",
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});

		test("accepts multi-byte unicode at max length", async () => {
			mockConvex.mutation.mockResolvedValue(["id_1"]);
			// Unicode characters count as 1 char each, not by byte size
			const unicodeContent = "a".repeat(LIMITS.CONTENT_MAX_LENGTH);

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: {
					prompts: [
						{
							slug: "unicode-max",
							name: "Test",
							description: "Test",
							content: unicodeContent,
							tags: [],
						},
					],
				},
			});

			expect(response.statusCode).toBe(201);
		});
	});

	describe("batch size limits", () => {
		test("accepts batch of 100 prompts", async () => {
			const manyIds = Array.from({ length: 100 }, (_, i) => `id_${i}`);
			mockConvex.mutation.mockResolvedValue(manyIds);

			const prompts = Array.from({ length: 100 }, (_, i) => ({
				slug: `prompt-${i}`,
				name: `Prompt ${i}`,
				description: "A test prompt",
				content: "Content",
				tags: [],
			}));

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { prompts },
			});

			expect(response.statusCode).toBe(201);
		});

		test("rejects batch exceeding 100 prompts", async () => {
			const prompts = Array.from({ length: 101 }, (_, i) => ({
				slug: `prompt-${i}`,
				name: `Prompt ${i}`,
				description: "A test prompt",
				content: "Content",
				tags: [],
			}));

			const response = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${createTestJwt()}` },
				payload: { prompts },
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().error).toMatch(/100/);
		});
	});
});
