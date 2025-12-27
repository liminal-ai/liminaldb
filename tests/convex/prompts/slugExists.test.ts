import { describe, test, expect } from "vitest";
import {
	asConvexCtx,
	createMockCtx,
	getQueryBuilder,
} from "../../fixtures/mockConvexCtx";
import { slugExists } from "../../../convex/model/prompts";

describe("slugExists", () => {
	test("returns true when slug exists for user", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
			_id: "prompt_1",
			userId,
			slug: "existing-slug",
		});

		const result = await slugExists(asConvexCtx(ctx), userId, "existing-slug");

		expect(result).toBe(true);
	});

	test("returns false when slug does not exist", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

		const result = await slugExists(asConvexCtx(ctx), userId, "non-existent");

		expect(result).toBe(false);
	});

	test("uses by_user_slug index", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

		await slugExists(asConvexCtx(ctx), userId, "test-slug");

		const builder = getQueryBuilder(ctx, "prompts");
		expect(builder.withIndex).toHaveBeenCalledWith(
			"by_user_slug",
			expect.any(Function),
		);
	});
});
