import { internalMutation } from "../_generated/server";
import { GLOBAL_TAGS, TAG_DIMENSIONS } from "../model/tagConstants";

/**
 * Seed the 19 global shared tags.
 *
 * This migration is idempotent - safe to run multiple times.
 * Run with: npx convex run migrations/seedGlobalTags:seedGlobalTags
 */
export const seedGlobalTags = internalMutation({
	args: {},
	handler: async (ctx) => {
		// Check if already seeded by looking for any tag
		const existing = await ctx.db.query("tags").first();
		if (existing) {
			return { seeded: false, message: "Tags already seeded" };
		}

		// Insert all 19 tags with their dimensions
		let count = 0;
		for (const dimension of TAG_DIMENSIONS) {
			const tags = GLOBAL_TAGS[dimension];
			for (const name of tags) {
				await ctx.db.insert("tags", { name, dimension });
				count++;
			}
		}

		return { seeded: true, count };
	},
});
