import { describe, test, expect } from "vitest";
import {
	asConvexCtx,
	createMockCtx,
	getQueryBuilder,
} from "../../fixtures/mockConvexCtx";
import { findOrCreateTag } from "../../../convex/model/tags";
import type { Id } from "../../../convex/_generated/dataModel";

describe("findOrCreateTag", () => {
	test("returns existing tag ID when tag exists", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		const existingTag = { _id: "tag_existing", userId, name: "debug" };
		getQueryBuilder(ctx, "tags").unique.mockResolvedValue(existingTag);

		const result = await findOrCreateTag(asConvexCtx(ctx), userId, "debug");

		expect(result).toBe("tag_existing" as Id<"tags">);
		expect(ctx.db.insert).not.toHaveBeenCalled();
	});

	test("creates new tag and returns ID when tag doesn't exist", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
		ctx.db.insert.mockResolvedValue("tag_new");

		const result = await findOrCreateTag(asConvexCtx(ctx), userId, "new-tag");

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

		await findOrCreateTag(asConvexCtx(ctx), userId, "test-tag");

		const builder = getQueryBuilder(ctx, "tags");
		expect(builder.withIndex).toHaveBeenCalledWith(
			"by_user_name",
			expect.any(Function),
		);
	});

	test("handles race condition by keeping oldest tag and deleting duplicate", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		// First lookup returns null (tag doesn't exist)
		getQueryBuilder(ctx, "tags").unique.mockResolvedValueOnce(null);

		// Mock insert returns new ID
		ctx.db.insert.mockResolvedValue("tag_new");

		// Second query (race check via collect) returns multiple tags - simulate race condition
		getQueryBuilder(ctx, "tags").collect.mockResolvedValue([
			{ _id: "tag_oldest", userId, name: "test", _creationTime: 1000 },
			{ _id: "tag_new", userId, name: "test", _creationTime: 2000 },
		]);

		const result = await findOrCreateTag(asConvexCtx(ctx), userId, "test");

		// Should return the oldest tag
		expect(result).toBe("tag_oldest" as Id<"tags">);
		// Should delete the newly created duplicate
		expect(ctx.db.delete).toHaveBeenCalledWith("tag_new");
	});

	test("handles race condition with multiple duplicates - deletes all except oldest", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		// First lookup returns null (tag doesn't exist)
		getQueryBuilder(ctx, "tags").unique.mockResolvedValueOnce(null);

		// Mock insert returns new ID
		ctx.db.insert.mockResolvedValue("tag_new");

		// Race check returns 3 tags - simulate severe race condition
		getQueryBuilder(ctx, "tags").collect.mockResolvedValue([
			{ _id: "tag_oldest", userId, name: "test", _creationTime: 1000 },
			{ _id: "tag_middle", userId, name: "test", _creationTime: 1500 },
			{ _id: "tag_new", userId, name: "test", _creationTime: 2000 },
		]);

		const result = await findOrCreateTag(asConvexCtx(ctx), userId, "test");

		// Should return the oldest tag
		expect(result).toBe("tag_oldest" as Id<"tags">);
		// Should delete BOTH duplicates
		expect(ctx.db.delete).toHaveBeenCalledTimes(2);
		expect(ctx.db.delete).toHaveBeenCalledWith("tag_middle");
		expect(ctx.db.delete).toHaveBeenCalledWith("tag_new");
	});

	test("keeps newly created tag when no race condition detected", async () => {
		const ctx = createMockCtx();
		const userId = "user_123";

		// First lookup returns null (tag doesn't exist)
		getQueryBuilder(ctx, "tags").unique.mockResolvedValueOnce(null);

		// Mock insert returns new ID
		ctx.db.insert.mockResolvedValue("tag_new");

		// Race check returns only the new tag (no duplicates)
		getQueryBuilder(ctx, "tags").collect.mockResolvedValue([
			{ _id: "tag_new", userId, name: "test", _creationTime: 1000 },
		]);

		const result = await findOrCreateTag(asConvexCtx(ctx), userId, "test");

		// Should return the newly created tag
		expect(result).toBe("tag_new" as Id<"tags">);
		// Should NOT delete anything
		expect(ctx.db.delete).not.toHaveBeenCalled();
	});
});
