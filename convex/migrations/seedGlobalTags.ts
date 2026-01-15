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
		// Check if all 19 tags exist (handles partial seed from interrupted runs)
		const existingTags = await ctx.db.query("tags").collect();
		const existingNames = new Set(existingTags.map((t) => t.name));

		// Collect tags that need to be inserted
		const tagsToInsert: {
			name: string;
			dimension: "purpose" | "domain" | "task";
		}[] = [];
		for (const dimension of TAG_DIMENSIONS) {
			const tags = GLOBAL_TAGS[dimension];
			for (const name of tags) {
				if (!existingNames.has(name)) {
					tagsToInsert.push({ name, dimension });
				}
			}
		}

		if (tagsToInsert.length === 0) {
			return { seeded: false, message: "All 19 tags already seeded" };
		}

		// Insert missing tags
		for (const tag of tagsToInsert) {
			await ctx.db.insert("tags", tag);
		}

		return { seeded: true, count: tagsToInsert.length, total: 19 };
	},
});
