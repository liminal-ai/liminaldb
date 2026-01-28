import { describe, test, expect } from "vitest";
import {
	SUGGESTED_TAGS,
	TAG_REGEX,
	TAG_MAX_LENGTH,
	validateTagName,
} from "../../../convex/model/tagConstants";

describe("tagConstants", () => {
	describe("SUGGESTED_TAGS", () => {
		test("is a flat string array", () => {
			expect(Array.isArray(SUGGESTED_TAGS)).toBe(true);
			for (const tag of SUGGESTED_TAGS) {
				expect(typeof tag).toBe("string");
			}
		});

		test("contains the original 19 tags", () => {
			expect(SUGGESTED_TAGS).toHaveLength(19);
		});

		test("all suggested tags are valid tag format", () => {
			for (const tag of SUGGESTED_TAGS) {
				expect(tag).toMatch(TAG_REGEX);
			}
		});

		test("no duplicates", () => {
			const unique = new Set(SUGGESTED_TAGS);
			expect(unique.size).toBe(SUGGESTED_TAGS.length);
		});

		test("includes key tags from each former dimension", () => {
			// Purpose
			expect(SUGGESTED_TAGS).toContain("instruction");
			expect(SUGGESTED_TAGS).toContain("persona");
			// Domain
			expect(SUGGESTED_TAGS).toContain("code");
			expect(SUGGESTED_TAGS).toContain("writing");
			// Task
			expect(SUGGESTED_TAGS).toContain("review");
			expect(SUGGESTED_TAGS).toContain("debug");
		});
	});

	describe("validateTagName", () => {
		test("accepts valid lowercase slug tags", () => {
			expect(validateTagName("code")).toBe("code");
			expect(validateTagName("my-project")).toBe("my-project");
			expect(validateTagName("q4-review")).toBe("q4-review");
			expect(validateTagName("test-123")).toBe("test-123");
		});

		test("normalizes to lowercase", () => {
			expect(validateTagName("Code")).toBe("code");
			expect(validateTagName("MY-PROJECT")).toBe("my-project");
		});

		test("trims whitespace", () => {
			expect(validateTagName("  code  ")).toBe("code");
		});

		test("rejects empty tags", () => {
			expect(() => validateTagName("")).toThrow("empty");
			expect(() => validateTagName("   ")).toThrow("empty");
		});

		test("rejects tags exceeding max length", () => {
			const longTag = "a".repeat(TAG_MAX_LENGTH + 1);
			expect(() => validateTagName(longTag)).toThrow("chars or less");
		});

		test("accepts tags at exactly max length", () => {
			const maxTag = "a".repeat(TAG_MAX_LENGTH);
			expect(validateTagName(maxTag)).toBe(maxTag);
		});

		test("rejects tags with invalid characters", () => {
			expect(() => validateTagName("hello world")).toThrow();
			expect(() => validateTagName("hello_world")).toThrow();
			expect(() => validateTagName("hello@world")).toThrow();
			expect(() => validateTagName("hello.world")).toThrow();
		});

		test("rejects tags with leading or trailing dashes", () => {
			expect(() => validateTagName("-code")).toThrow();
			expect(() => validateTagName("code-")).toThrow();
		});

		test("accepts all 19 suggested tags", () => {
			for (const tag of SUGGESTED_TAGS) {
				expect(validateTagName(tag)).toBe(tag);
			}
		});
	});
});
