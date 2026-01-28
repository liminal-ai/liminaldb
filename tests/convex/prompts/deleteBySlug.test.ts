import { describe, test, expect } from "vitest";
import {
	asConvexCtx,
	createMockCtx,
	getQueryBuilder,
} from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";

describe("deleteBySlug", () => {
	describe("existing prompt", () => {
		test("returns true when prompt exists and is deleted", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "prompt_1",
				userId,
				slug: "ai-meta-check",
				name: "Meta Cognitive Check",
				description: "Use when you want AI to introspect",
				content: "As you process this...",
				tagNames: ["introspection", "claude"],
			});

			const result = await Prompts.deleteBySlug(
				asConvexCtx(ctx),
				userId,
				"ai-meta-check",
			);

			expect(result).toBe(true);
			// Only the prompt is deleted — no junction cleanup needed
			expect(ctx.db.delete).toHaveBeenCalledWith("prompt_1");
			expect(ctx.db.delete).toHaveBeenCalledTimes(1);
		});
	});

	describe("non-existent prompt", () => {
		test("returns false when prompt does not exist", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			const result = await Prompts.deleteBySlug(
				asConvexCtx(ctx),
				userId,
				"does-not-exist",
			);

			expect(result).toBe(false);
			expect(ctx.db.delete).not.toHaveBeenCalled();
		});
	});

	describe("index usage", () => {
		test("uses by_user_slug index for lookup", async () => {
			const ctx = createMockCtx();
			const userId = "user_456";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			await Prompts.deleteBySlug(asConvexCtx(ctx), userId, "some-slug");

			const builder = getQueryBuilder(ctx, "prompts");
			expect(builder.withIndex).toHaveBeenCalledWith(
				"by_user_slug",
				expect.any(Function),
			);
		});
	});
});
