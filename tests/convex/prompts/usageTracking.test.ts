import { describe, it, expect, vi } from "vitest";
import {
	createMockCtx,
	getQueryBuilder,
	asConvexCtx,
} from "../../fixtures/mockConvexCtx";
import { trackPromptUse } from "../../../convex/model/prompts";

describe("trackPromptUse", () => {
	it("TC-15b: tracking usage returns false when prompt does not exist", async () => {
		const ctx = createMockCtx();
		const builder = getQueryBuilder(ctx, "prompts");

		builder.unique.mockResolvedValue(null);

		const result = await trackPromptUse(
			asConvexCtx(ctx),
			"user_123",
			"missing",
		);

		expect(result).toBe(false);
		expect(ctx.db.patch).not.toHaveBeenCalled();
	});

	it("TC-15: tracking usage increments usage count", async () => {
		const ctx = createMockCtx();
		const builder = getQueryBuilder(ctx, "prompts");

		builder.unique.mockResolvedValue({
			_id: "prompt_1",
			userId: "user_123",
			slug: "test-prompt",
			usageCount: 2,
			lastUsedAt: 1000,
		});

		const now = Date.UTC(2026, 0, 8);
		vi.spyOn(Date, "now").mockReturnValue(now);

		await trackPromptUse(asConvexCtx(ctx), "user_123", "test-prompt");

		expect(ctx.db.patch).toHaveBeenCalledWith(
			"prompt_1",
			expect.objectContaining({ usageCount: 3 }),
		);
	});

	it("TC-16: tracking usage updates lastUsedAt timestamp", async () => {
		const ctx = createMockCtx();
		const builder = getQueryBuilder(ctx, "prompts");

		builder.unique.mockResolvedValue({
			_id: "prompt_2",
			userId: "user_123",
			slug: "test-prompt",
			usageCount: 0,
			lastUsedAt: undefined,
		});

		const now = Date.UTC(2026, 0, 8);
		vi.spyOn(Date, "now").mockReturnValue(now);

		await trackPromptUse(asConvexCtx(ctx), "user_123", "test-prompt");

		expect(ctx.db.patch).toHaveBeenCalledWith(
			"prompt_2",
			expect.objectContaining({ lastUsedAt: now }),
		);
	});
});
