import { describe, it, expect, vi } from "vitest";
import {
	createMockCtx,
	getQueryBuilder,
	asConvexCtx,
} from "../../fixtures/mockConvexCtx";
import { searchPrompts } from "../../../convex/model/prompts";

describe("searchPrompts", () => {
	it("TC-2: search is case-insensitive", async () => {
		const ctx = createMockCtx();
		const builder = getQueryBuilder(ctx, "prompts");

		const q = {
			search: vi.fn(() => q),
			eq: vi.fn(() => q),
		};

		builder.withSearchIndex.mockImplementation((_index, cb) => {
			cb(q as unknown as { search: () => void; eq: () => void });
			return builder;
		});

		builder.take.mockResolvedValue([]);

		await searchPrompts(asConvexCtx(ctx), "user_123", "SQL", undefined, 20);

		expect(builder.withSearchIndex).toHaveBeenCalledWith(
			"search_prompts",
			expect.any(Function),
		);
		expect(q.search).toHaveBeenCalledWith("searchText", "sql");
		expect(q.eq).toHaveBeenCalledWith("userId", "user_123");
	});

	it("TC-2b: search query is trimmed before searching", async () => {
		const ctx = createMockCtx();
		const builder = getQueryBuilder(ctx, "prompts");

		const q = {
			search: vi.fn(() => q),
			eq: vi.fn(() => q),
		};

		builder.withSearchIndex.mockImplementation((_index, cb) => {
			cb(q as unknown as { search: () => void; eq: () => void });
			return builder;
		});

		builder.take.mockResolvedValue([]);

		await searchPrompts(asConvexCtx(ctx), "user_123", "  SQL  ", undefined, 20);

		expect(q.search).toHaveBeenCalledWith("searchText", "sql");
	});
});
