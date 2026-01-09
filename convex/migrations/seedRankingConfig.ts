import { internalMutation } from "../_generated/server";
import { DEFAULT_RANKING_CONFIG } from "../model/ranking";

export const seedRankingConfig = internalMutation({
	args: {},
	handler: async (ctx) => {
		const existing = await ctx.db
			.query("rankingConfig")
			.withIndex("by_key", (q) => q.eq("key", "global"))
			.unique();

		if (existing) return { seeded: false };

		await ctx.db.insert("rankingConfig", {
			key: "global",
			weights: DEFAULT_RANKING_CONFIG.weights,
			searchRerankLimit: DEFAULT_RANKING_CONFIG.searchRerankLimit,
		});

		return { seeded: true };
	},
});
