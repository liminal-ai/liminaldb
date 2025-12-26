import { describe, test, expect } from "bun:test";
import { createMockCtx, getQueryBuilder } from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";

describe("deleteBySlug", () => {
	describe("existing prompt", () => {
		test("returns true when prompt exists and is deleted", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Prompt exists
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "ai-meta-check",
				name: "Meta Cognitive Check",
				description: "Use when you want AI to introspect",
				content: "As you process this...",
				tagNames: ["introspection", "claude"],
			});

			// No promptTags (tested separately)
			getQueryBuilder(ctx, "promptTags").collect.mockResolvedValue([]);

			const result = await Prompts.deleteBySlug(
				ctx as any,
				userId,
				"ai-meta-check",
			);

			expect(result).toBe(true);
			expect(ctx.db.delete).toHaveBeenCalledWith("prompt_1");
		});
	});

	describe("non-existent prompt", () => {
		test("returns false when prompt does not exist", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Prompt does not exist
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			const result = await Prompts.deleteBySlug(
				ctx as any,
				userId,
				"does-not-exist",
			);

			expect(result).toBe(false);
			expect(ctx.db.delete).not.toHaveBeenCalled();
		});
	});

	describe("junction record cleanup", () => {
		test("cleans up promptTags junction records", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Prompt exists
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "ai-meta-check",
				name: "Meta Cognitive Check",
				description: "...",
				content: "...",
				tagNames: ["introspection", "claude"],
			});

			// Has junction records
			getQueryBuilder(ctx, "promptTags").collect.mockResolvedValue([
				{ _id: "pt_1", promptId: "prompt_1", tagId: "tag_1" },
				{ _id: "pt_2", promptId: "prompt_1", tagId: "tag_2" },
			]);

			// Tags are still referenced by other prompts (orphan check returns a match)
			getQueryBuilder(ctx, "promptTags").first.mockResolvedValue({
				_id: "pt_other",
				promptId: "prompt_other",
				tagId: "tag_1",
			});

			await Prompts.deleteBySlug(ctx as any, userId, "ai-meta-check");

			// Should delete junction records first
			expect(ctx.db.delete).toHaveBeenCalledWith("pt_1");
			expect(ctx.db.delete).toHaveBeenCalledWith("pt_2");
			// Then delete the prompt
			expect(ctx.db.delete).toHaveBeenCalledWith("prompt_1");
			// Total of 3 deletes (no orphaned tags since they're still referenced)
			expect(ctx.db.delete).toHaveBeenCalledTimes(3);
		});

		test("deletes orphaned tags when no other prompts reference them", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Prompt exists
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "orphan-test",
				name: "Orphan Test",
				description: "...",
				content: "...",
				tagNames: ["orphan-tag"],
			});

			// Has junction records
			getQueryBuilder(ctx, "promptTags").collect.mockResolvedValue([
				{ _id: "pt_1", promptId: "prompt_1", tagId: "tag_orphan" },
			]);

			// Tag is NOT referenced by other prompts (orphan check returns null)
			getQueryBuilder(ctx, "promptTags").first.mockResolvedValue(null);

			await Prompts.deleteBySlug(ctx as any, userId, "orphan-test");

			// Should delete: junction record, prompt, and orphaned tag
			expect(ctx.db.delete).toHaveBeenCalledWith("pt_1");
			expect(ctx.db.delete).toHaveBeenCalledWith("prompt_1");
			expect(ctx.db.delete).toHaveBeenCalledWith("tag_orphan");
			expect(ctx.db.delete).toHaveBeenCalledTimes(3);
		});
	});

	describe("index usage", () => {
		test("uses by_user_slug index for lookup", async () => {
			const ctx = createMockCtx();
			const userId = "user_456";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			await Prompts.deleteBySlug(ctx as any, userId, "some-slug");

			const builder = getQueryBuilder(ctx, "prompts");
			expect(builder.withIndex).toHaveBeenCalledWith(
				"by_user_slug",
				expect.any(Function),
			);
		});

		test("uses by_prompt index for promptTags cleanup", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "ai-meta-check",
				name: "...",
				description: "...",
				content: "...",
				tagNames: [],
			});

			getQueryBuilder(ctx, "promptTags").collect.mockResolvedValue([]);

			await Prompts.deleteBySlug(ctx as any, userId, "ai-meta-check");

			const builder = getQueryBuilder(ctx, "promptTags");
			expect(builder.withIndex).toHaveBeenCalledWith(
				"by_prompt",
				expect.any(Function),
			);
		});
	});
});
