import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Find existing tag or create new one.
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
	return await ctx.db.insert("tags", { userId, name });
}
