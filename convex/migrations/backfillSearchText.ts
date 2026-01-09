import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { buildSearchText } from "../model/prompts";
import { internal } from "../_generated/api";

export const backfillSearchText = internalMutation({
	args: {
		cursor: v.optional(v.string()),
		batchSize: v.optional(v.number()),
	},
	returns: v.object({
		patched: v.number(),
		isDone: v.boolean(),
		continueCursor: v.union(v.string(), v.null()),
	}),
	handler: async (ctx, { cursor, batchSize = 100 }) => {
		// Ensure ranking config exists.
		await ctx.runMutation(
			internal.migrations.seedRankingConfig.seedRankingConfig,
			{},
		);

		const paginationResult = await ctx.db
			.query("prompts")
			.order("asc")
			.paginate({
				numItems: batchSize,
				cursor: cursor ?? null,
			});

		let patched = 0;
		for (const prompt of paginationResult.page) {
			const patch: {
				searchText?: string;
				pinned?: boolean;
				favorited?: boolean;
				usageCount?: number;
			} = {};

			if (!prompt.searchText) {
				patch.searchText = buildSearchText({
					slug: prompt.slug,
					name: prompt.name,
					description: prompt.description,
					content: prompt.content,
				});
			}
			if (prompt.pinned === undefined) patch.pinned = false;
			if (prompt.favorited === undefined) patch.favorited = false;
			if (prompt.usageCount === undefined) patch.usageCount = 0;

			if (Object.keys(patch).length > 0) {
				await ctx.db.patch(prompt._id, patch);
				patched++;
			}
		}

		return {
			patched,
			isDone: paginationResult.isDone,
			continueCursor: paginationResult.continueCursor,
		};
	},
});
