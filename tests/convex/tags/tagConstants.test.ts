import { describe, test, expect } from "vitest";
import {
	TAG_DIMENSIONS,
	GLOBAL_TAGS,
	ALL_TAG_NAMES,
	TAG_TO_DIMENSION,
} from "../../../convex/model/tagConstants";

describe("tagConstants", () => {
	describe("TAG_DIMENSIONS", () => {
		test("contains exactly 3 dimensions", () => {
			expect(TAG_DIMENSIONS).toHaveLength(3);
		});

		test("contains purpose, domain, task", () => {
			expect(TAG_DIMENSIONS).toContain("purpose");
			expect(TAG_DIMENSIONS).toContain("domain");
			expect(TAG_DIMENSIONS).toContain("task");
		});
	});

	describe("GLOBAL_TAGS", () => {
		test("purpose has 5 tags", () => {
			expect(GLOBAL_TAGS.purpose).toHaveLength(5);
		});

		test("domain has 7 tags", () => {
			expect(GLOBAL_TAGS.domain).toHaveLength(7);
		});

		test("task has 7 tags", () => {
			expect(GLOBAL_TAGS.task).toHaveLength(7);
		});

		test("purpose contains expected tags", () => {
			expect(GLOBAL_TAGS.purpose).toContain("instruction");
			expect(GLOBAL_TAGS.purpose).toContain("reference");
			expect(GLOBAL_TAGS.purpose).toContain("persona");
			expect(GLOBAL_TAGS.purpose).toContain("workflow");
			expect(GLOBAL_TAGS.purpose).toContain("snippet");
		});

		test("domain contains expected tags", () => {
			expect(GLOBAL_TAGS.domain).toContain("code");
			expect(GLOBAL_TAGS.domain).toContain("writing");
			expect(GLOBAL_TAGS.domain).toContain("analysis");
			expect(GLOBAL_TAGS.domain).toContain("planning");
			expect(GLOBAL_TAGS.domain).toContain("design");
			expect(GLOBAL_TAGS.domain).toContain("data");
			expect(GLOBAL_TAGS.domain).toContain("communication");
		});

		test("task contains expected tags", () => {
			expect(GLOBAL_TAGS.task).toContain("review");
			expect(GLOBAL_TAGS.task).toContain("summarize");
			expect(GLOBAL_TAGS.task).toContain("explain");
			expect(GLOBAL_TAGS.task).toContain("debug");
			expect(GLOBAL_TAGS.task).toContain("transform");
			expect(GLOBAL_TAGS.task).toContain("extract");
			expect(GLOBAL_TAGS.task).toContain("translate");
		});
	});

	describe("ALL_TAG_NAMES", () => {
		test("contains exactly 19 tags", () => {
			expect(ALL_TAG_NAMES).toHaveLength(19);
		});

		test("all tag names are lowercase alphanumeric", () => {
			for (const tag of ALL_TAG_NAMES) {
				expect(tag).toMatch(/^[a-z]+$/);
			}
		});

		test("no duplicate tags", () => {
			const unique = new Set(ALL_TAG_NAMES);
			expect(unique.size).toBe(ALL_TAG_NAMES.length);
		});

		test("combines all dimension tags", () => {
			const combined = [
				...GLOBAL_TAGS.purpose,
				...GLOBAL_TAGS.domain,
				...GLOBAL_TAGS.task,
			];
			expect(ALL_TAG_NAMES).toEqual(combined);
		});
	});

	describe("TAG_TO_DIMENSION", () => {
		test("maps all 19 tags to dimensions", () => {
			expect(Object.keys(TAG_TO_DIMENSION)).toHaveLength(19);
		});

		test("purpose tags map to purpose", () => {
			for (const tag of GLOBAL_TAGS.purpose) {
				expect(TAG_TO_DIMENSION[tag]).toBe("purpose");
			}
		});

		test("domain tags map to domain", () => {
			for (const tag of GLOBAL_TAGS.domain) {
				expect(TAG_TO_DIMENSION[tag]).toBe("domain");
			}
		});

		test("task tags map to task", () => {
			for (const tag of GLOBAL_TAGS.task) {
				expect(TAG_TO_DIMENSION[tag]).toBe("task");
			}
		});
	});
});
