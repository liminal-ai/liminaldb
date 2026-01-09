import { internalQuery } from "../_generated/server";
import { v } from "convex/values";

export const migrationStatus = internalQuery({
	args: {},
	returns: v.object({
		totalPrompts: v.number(),
		missingSearchText: v.number(),
		missingPinned: v.number(),
		missingFavorited: v.number(),
		missingUsageCount: v.number(),
	}),
	handler: async (ctx) => {
		let totalPrompts = 0;
		let missingSearchText = 0;
		let missingPinned = 0;
		let missingFavorited = 0;
		let missingUsageCount = 0;

		for await (const prompt of ctx.db.query("prompts")) {
			totalPrompts++;
			if (!prompt.searchText) missingSearchText++;
			if (prompt.pinned === undefined) missingPinned++;
			if (prompt.favorited === undefined) missingFavorited++;
			if (prompt.usageCount === undefined) missingUsageCount++;
		}

		return {
			totalPrompts,
			missingSearchText,
			missingPinned,
			missingFavorited,
			missingUsageCount,
		};
	},
});
