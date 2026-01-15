import { describe, test, expect, vi, beforeEach } from "vitest";
import type { QueryCtx } from "../../../convex/_generated/server";
import {
	validateGlobalTag,
	getTagId,
	getTagsByDimension,
} from "../../../convex/model/tags";
import { ALL_TAG_NAMES } from "../../../convex/model/tagConstants";

/**
 * Minimal mock type for Convex QueryCtx used in tag tests.
 * Only includes the db.query chain methods we actually mock.
 */
type MockQueryCtx = {
	db: {
		query: ReturnType<typeof vi.fn>;
	};
};

describe("validateGlobalTag", () => {
	test("accepts valid tag 'code'", () => {
		expect(validateGlobalTag("code")).toBe("code");
	});

	test("accepts valid tag 'instruction'", () => {
		expect(validateGlobalTag("instruction")).toBe("instruction");
	});

	test("accepts all 19 valid tags", () => {
		for (const tag of ALL_TAG_NAMES) {
			expect(validateGlobalTag(tag)).toBe(tag);
		}
	});

	test("rejects invalid tag 'foobar'", () => {
		expect(() => validateGlobalTag("foobar")).toThrow();
	});

	test("rejects empty string", () => {
		expect(() => validateGlobalTag("")).toThrow();
	});

	test("error message mentions valid tags", () => {
		try {
			validateGlobalTag("invalid-tag");
			expect.fail("Should have thrown");
		} catch (error) {
			expect((error as Error).message).toContain("instruction");
			expect((error as Error).message).toContain("code");
		}
	});

	test("is case-insensitive (accepts 'CODE')", () => {
		expect(validateGlobalTag("CODE")).toBe("code");
	});

	test("is case-insensitive (accepts 'Instruction')", () => {
		expect(validateGlobalTag("Instruction")).toBe("instruction");
	});

	test("trims whitespace", () => {
		expect(validateGlobalTag("  code  ")).toBe("code");
	});
});

describe("getTagId", () => {
	// These tests require a mock Convex context with seeded tags
	const mockCtx: MockQueryCtx = {
		db: {
			query: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("returns ID for seeded tag", async () => {
		const mockTag = { _id: "tag123", name: "code", dimension: "domain" };
		mockCtx.db.query.mockReturnValue({
			withIndex: vi.fn().mockReturnValue({
				unique: vi.fn().mockResolvedValue(mockTag),
			}),
		});

		const result = await getTagId(mockCtx as unknown as QueryCtx, "code");
		expect(result).toBe("tag123");
	});

	test("throws if tag not seeded", async () => {
		mockCtx.db.query.mockReturnValue({
			withIndex: vi.fn().mockReturnValue({
				unique: vi.fn().mockResolvedValue(null),
			}),
		});

		await expect(
			getTagId(mockCtx as unknown as QueryCtx, "code"),
		).rejects.toThrow();
	});

	test("error message mentions running migration", async () => {
		mockCtx.db.query.mockReturnValue({
			withIndex: vi.fn().mockReturnValue({
				unique: vi.fn().mockResolvedValue(null),
			}),
		});

		try {
			await getTagId(mockCtx as unknown as QueryCtx, "code");
			expect.fail("Should have thrown");
		} catch (error) {
			expect((error as Error).message.toLowerCase()).toMatch(/seed|migration/i);
		}
	});

	test("validates tag name before lookup", async () => {
		await expect(
			getTagId(mockCtx as unknown as QueryCtx, "invalid-tag"),
		).rejects.toThrow();
	});
});

describe("getTagsByDimension", () => {
	const mockCtx: MockQueryCtx = {
		db: {
			query: vi.fn(),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	test("returns object with purpose, domain, task keys", async () => {
		const mockTags = [
			{ _id: "1", name: "code", dimension: "domain" },
			{ _id: "2", name: "instruction", dimension: "purpose" },
			{ _id: "3", name: "review", dimension: "task" },
		];
		mockCtx.db.query.mockReturnValue({
			collect: vi.fn().mockResolvedValue(mockTags),
		});

		const result = await getTagsByDimension(mockCtx as unknown as QueryCtx);
		expect(result).toHaveProperty("purpose");
		expect(result).toHaveProperty("domain");
		expect(result).toHaveProperty("task");
	});

	test("groups tags by dimension correctly", async () => {
		const mockTags = [
			{ _id: "1", name: "code", dimension: "domain" },
			{ _id: "2", name: "writing", dimension: "domain" },
			{ _id: "3", name: "instruction", dimension: "purpose" },
			{ _id: "4", name: "review", dimension: "task" },
		];
		mockCtx.db.query.mockReturnValue({
			collect: vi.fn().mockResolvedValue(mockTags),
		});

		const result = await getTagsByDimension(mockCtx as unknown as QueryCtx);
		expect(result.domain).toContain("code");
		expect(result.domain).toContain("writing");
		expect(result.purpose).toContain("instruction");
		expect(result.task).toContain("review");
	});

	test("returns empty arrays for missing dimensions", async () => {
		mockCtx.db.query.mockReturnValue({
			collect: vi.fn().mockResolvedValue([]),
		});

		const result = await getTagsByDimension(mockCtx as unknown as QueryCtx);
		expect(result.purpose).toEqual([]);
		expect(result.domain).toEqual([]);
		expect(result.task).toEqual([]);
	});
});
