import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Find existing tag or create new one.
 * Handles race conditions by checking for duplicates after insert.
 * Returns tag ID.
 */
export async function findOrCreateTag(
	ctx: MutationCtx,
	userId: string,
	name: string,
): Promise<Id<"tags">> {
	// Look up existing tag using the composite index
	const existing = await ctx.db
		.query("tags")
		.withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", name))
		.unique();

	if (existing) {
		return existing._id;
	}

	// Create new tag
	const newId = await ctx.db.insert("tags", { userId, name });

	// Check for race condition - another request may have created the same tag
	const allMatching = await ctx.db
		.query("tags")
		.withIndex("by_user_name", (q) => q.eq("userId", userId).eq("name", name))
		.collect();

	if (allMatching.length > 1) {
		// Race condition occurred - keep oldest, delete the one we just created
		const sorted = allMatching.sort(
			(a, b) => a._creationTime - b._creationTime,
		);
		const oldest = sorted[0]!; // Safe: we checked length > 1
		if (oldest._id !== newId) {
			await ctx.db.delete(newId);
			return oldest._id;
		}
	}

	return newId;
}
