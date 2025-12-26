import { describe, test, expect, beforeEach } from "bun:test";
import {
	createMockCtx,
	getQueryBuilder,
	mockSequentialReturns,
} from "../../fixtures/mockConvexCtx";
import { findOrCreateTag } from "../../../convex/model/tags";
import type { Id } from "../../../convex/_generated/dataModel";

describe("findOrCreateTag", () => {
	test("returns existing tag ID when tag exists", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		const existingTag = { _id: "tag_existing", userId, name: "debug" };
		getQueryBuilder(ctx, "tags").unique.mockResolvedValue(existingTag);

		const result = await findOrCreateTag(ctx as any, userId, "debug");

		expect(result).toBe("tag_existing" as Id<"tags">);
		expect(ctx.db.insert).not.toHaveBeenCalled();
	});

	test("creates new tag and returns ID when tag doesn't exist", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
		ctx.db.insert.mockResolvedValue("tag_new");

		const result = await findOrCreateTag(ctx as any, userId, "new-tag");

		expect(result).toBe("tag_new" as Id<"tags">);
		expect(ctx.db.insert).toHaveBeenCalledWith("tags", {
			userId: "user_123",
			name: "new-tag",
		});
	});

	test("uses correct index for lookup", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
		ctx.db.insert.mockResolvedValue("tag_new");

		await findOrCreateTag(ctx as any, userId, "test-tag");

		const builder = getQueryBuilder(ctx, "tags");
		expect(builder.withIndex).toHaveBeenCalledWith(
			"by_user_name",
			expect.any(Function),
		);
	});
});
