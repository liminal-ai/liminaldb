import { describe, it, expect } from "vitest";
import { rerank, type RankingWeights } from "../../../convex/model/ranking";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 0, 8);
const weights: RankingWeights = {
	usage: 3,
	recency: 2,
	favorite: 1,
	pinned: 0.5,
	halfLifeDays: 14,
};

describe("Ranking", () => {
	it("TC-7b: rerank handles empty list", () => {
		const ranked = rerank([], weights, { mode: "list", now });
		expect(ranked).toEqual([]);
	});

	it("TC-7: prompts sorted by ranking score by default", () => {
		const ranked = rerank(
			[
				{ slug: "low", usageCount: 1, lastUsedAt: now - 10 * DAY },
				{ slug: "high", usageCount: 50, lastUsedAt: now - 10 * DAY },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked.map((p) => p.slug)).toEqual(["high", "low"]);
	});

	it("TC-8: pinned prompt appears above high-usage unpinned prompt", () => {
		const ranked = rerank(
			[
				{ slug: "high", usageCount: 50, pinned: false },
				{ slug: "pinned", usageCount: 1, pinned: true },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked[0]?.slug).toBe("pinned");
	});

	it("TC-9: multiple pinned prompts sorted by score among themselves", () => {
		const ranked = rerank(
			[
				{ slug: "p1", usageCount: 5, pinned: true },
				{ slug: "p2", usageCount: 50, pinned: true },
			],
			weights,
			{ mode: "list", now },
		);
		const pinned = ranked.filter((p) => p.pinned);
		expect(pinned.map((p) => p.slug)).toEqual(["p2", "p1"]);
	});

	it("TC-10: favorited prompt ranks higher than non-favorited with similar usage", () => {
		const ranked = rerank(
			[
				{ slug: "fav", usageCount: 10, favorited: true },
				{ slug: "plain", usageCount: 10, favorited: false },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked.map((p) => p.slug)).toEqual(["fav", "plain"]);
	});

	it("TC-11: high-usage prompt ranks higher than low-usage", () => {
		const ranked = rerank(
			[
				{ slug: "low", usageCount: 1 },
				{ slug: "high", usageCount: 100 },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked.map((p) => p.slug)).toEqual(["high", "low"]);
	});

	it("TC-12: recently-used prompt ranks higher than stale prompt", () => {
		const ranked = rerank(
			[
				{ slug: "stale", usageCount: 5, lastUsedAt: now - 30 * DAY },
				{ slug: "recent", usageCount: 5, lastUsedAt: now - DAY },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked.map((p) => p.slug)).toEqual(["recent", "stale"]);
	});

	it("TC-13: never-used prompt appears below used prompts", () => {
		const ranked = rerank(
			[
				{ slug: "used", usageCount: 1, lastUsedAt: now - DAY },
				{ slug: "never", usageCount: 0, lastUsedAt: undefined },
			],
			weights,
			{ mode: "list", now },
		);
		expect(ranked.map((p) => p.slug)).toEqual(["used", "never"]);
	});
});
