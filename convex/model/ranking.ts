import type { QueryCtx } from "../_generated/server";

export interface RankingWeights {
	usage: number;
	recency: number;
	favorite: number;
	pinned: number;
	halfLifeDays: number;
}

export interface RankingConfig {
	weights: RankingWeights;
	searchRerankLimit: number;
}

export const DEFAULT_RANKING_CONFIG: RankingConfig = {
	weights: {
		usage: 3,
		recency: 2,
		favorite: 1,
		pinned: 0.5,
		halfLifeDays: 14,
	},
	searchRerankLimit: 200,
};

export function computeRankScore(
	prompt: {
		usageCount?: number;
		lastUsedAt?: number;
		favorited?: boolean;
		pinned?: boolean;
	},
	now: number,
	weights: RankingWeights,
): number {
	const usageCount = prompt.usageCount ?? 0;
	const usageScore = Math.log1p(Math.max(0, usageCount)) * weights.usage;

	const lastUsedAt = prompt.lastUsedAt;
	const recencyScore =
		lastUsedAt && lastUsedAt > 0
			? Math.exp(-(now - lastUsedAt) / (weights.halfLifeDays * 86_400_000)) *
				weights.recency
			: 0;

	const favoriteScore = prompt.favorited ? weights.favorite : 0;
	const pinnedScore = prompt.pinned ? weights.pinned : 0;

	return usageScore + recencyScore + favoriteScore + pinnedScore;
}

export function rerank<
	T extends {
		slug: string;
		usageCount?: number;
		lastUsedAt?: number;
		favorited?: boolean;
		pinned?: boolean;
	},
>(
	prompts: T[],
	weights: RankingWeights,
	options: { mode: "list" | "search"; now: number },
): T[] {
	const { mode, now } = options;

	const isUsed = (p: T) => (p.usageCount ?? 0) > 0 || (p.lastUsedAt ?? 0) > 0;

	return [...prompts].sort((a, b) => {
		if (mode === "list") {
			// AC-9: pinned always at top of list
			const pinnedA = a.pinned ? 1 : 0;
			const pinnedB = b.pinned ? 1 : 0;
			if (pinnedA !== pinnedB) return pinnedB - pinnedA;

			// AC-14: never-used below used prompts
			const usedA = isUsed(a) ? 1 : 0;
			const usedB = isUsed(b) ? 1 : 0;
			if (usedA !== usedB) return usedB - usedA;
		}

		const scoreA = computeRankScore(a, now, weights);
		const scoreB = computeRankScore(b, now, weights);
		if (scoreA !== scoreB) return scoreB - scoreA;

		const lastA = a.lastUsedAt ?? 0;
		const lastB = b.lastUsedAt ?? 0;
		if (lastA !== lastB) return lastB - lastA;

		return a.slug.localeCompare(b.slug);
	});
}

export async function getRankingConfig(ctx: QueryCtx): Promise<RankingConfig> {
	const stored = await ctx.db
		.query("rankingConfig")
		.withIndex("by_key", (q) => q.eq("key", "global"))
		.unique();

	if (stored) {
		return {
			weights: stored.weights,
			searchRerankLimit: stored.searchRerankLimit,
		};
	}

	return DEFAULT_RANKING_CONFIG;
}
