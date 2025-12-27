import { describe, test, expect } from "vitest";
import {
	asConvexCtx,
	createMockCtx,
	getQueryBuilder,
} from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";

describe("getPromptBySlug", () => {
	describe("existing prompt", () => {
		test("returns prompt DTO with tags mapped from tagNames", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "ai-meta-check",
				name: "Meta Cognitive Check",
				description: "Use when you want AI to introspect",
				content: "As you process this...",
				tagNames: ["introspection", "claude"], // Storage field
				parameters: undefined,
			});

			const result = await Prompts.getBySlug(
				asConvexCtx(ctx),
				userId,
				"ai-meta-check",
			);

			expect(result).toEqual({
				slug: "ai-meta-check",
				name: "Meta Cognitive Check",
				description: "Use when you want AI to introspect",
				content: "As you process this...",
				tags: ["introspection", "claude"], // DTO field (mapped)
				parameters: undefined,
			});
		});
	});

	describe("prompt with parameters", () => {
		test("returns prompt DTO with parameters", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "template-prompt",
				name: "Template",
				description: "...",
				content: "Hello {{name}}",
				tagNames: [],
				parameters: [
					{
						name: "name",
						type: "string",
						required: true,
					},
				],
			});

			const result = await Prompts.getBySlug(
				asConvexCtx(ctx),
				userId,
				"template-prompt",
			);

			expect(result?.parameters).toEqual([
				{
					name: "name",
					type: "string",
					required: true,
				},
			]);
		});
	});

	describe("not found", () => {
		test("returns null for non-existent slug", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			const result = await Prompts.getBySlug(
				asConvexCtx(ctx),
				userId,
				"does-not-exist",
			);

			expect(result).toBeNull();
		});
	});

	describe("user isolation", () => {
		test("query uses userId in index filter", async () => {
			const ctx = createMockCtx();
			const userId = "user_456";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			await Prompts.getBySlug(asConvexCtx(ctx), userId, "some-slug");

			const builder = getQueryBuilder(ctx, "prompts");
			expect(builder.withIndex).toHaveBeenCalledWith(
				"by_user_slug",
				expect.any(Function),
			);
		});
	});
});
