import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { mergeContent } from "../../../src/lib/merge";
import { MERGE_FIXTURES } from "../../fixtures/merge";

const ROOT = resolve(import.meta.dirname, "../../..");

/**
 * Extract the merge-field regex literal from a source file.
 * Matches lines like: `const MERGE_FIELD_REGEX = /…/g;`
 * or `const STRICT_MERGE_FIELD_REGEX = /…/g;`
 * Also supports inline usage in `.match(/…/g)` calls.
 */
function extractRegexSource(filePath: string): string {
	const src = readFileSync(resolve(ROOT, filePath), "utf-8");
	const assignmentMatch = src.match(
		/(?:MERGE_FIELD_REGEX|STRICT_MERGE_FIELD_REGEX)\s*=\s*(\/.*\/[gimsuy]*)\s*;/,
	);
	if (assignmentMatch?.[1]) {
		return assignmentMatch[1];
	}

	const inlineMatch = src.match(
		/\.match\(\s*(\/(?:\\.|[^/\\\n])+\/[gimsuy]*)\s*\)/,
	);
	if (!inlineMatch?.[1]) {
		throw new Error(`Could not find merge field regex in ${filePath}`);
	}
	return inlineMatch[1];
}

describe("merge field regex consistency", () => {
	const locations = [
		{ file: "convex/model/merge.ts", label: "convex parser" },
		{ file: "src/lib/merge.ts", label: "server merge util" },
		{
			file: "public/js/components/merge-mode.js",
			label: "UI component",
		},
		{
			file: "src/ui/templates/prompts.html",
			label: "line edit inline extraction",
		},
	] as const;

	const regexes = locations.map(({ file, label }) => ({
		label,
		file,
		source: extractRegexSource(file),
	}));

	test("all 4 locations define the same regex", () => {
		const [first, ...rest] = regexes;
		if (!first) {
			throw new Error("Expected at least one regex source");
		}

		for (const entry of rest) {
			expect(entry.source, `${entry.label} (${entry.file})`).toBe(first.source);
		}
	});
});

describe("mergeContent", () => {
	test("replaces a single field with one occurrence", () => {
		const result = mergeContent("Write in {{language}}", {
			language: "Python",
		});

		expect(result.content).toBe("Write in Python");
		expect(result.mergeFields).toEqual(["language"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("replaces a single field with multiple occurrences", () => {
		const result = mergeContent(MERGE_FIXTURES.duplicateField.content, {
			language: "Python",
		});

		expect(result.content).toBe("Python is great. I love Python.");
		expect(result.mergeFields).toEqual(["language"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("replaces multiple fields when all values provided", () => {
		const result = mergeContent(MERGE_FIXTURES.twoFields.content, {
			code: "FizzBuzz",
			language: "TypeScript",
		});

		expect(result.content).toBe("Write FizzBuzz in TypeScript");
		expect(result.mergeFields).toEqual(["code", "language"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("treats empty string value as filled", () => {
		const result = mergeContent("Write in {{language}}", { language: "" });

		expect(result.content).toBe("Write in ");
		expect(result.unfilledFields).toEqual([]);
	});

	test("returns empty unfilledFields when all fields are filled", () => {
		const result = mergeContent("Use {{tool}} with {{language}}", {
			tool: "Vitest",
			language: "TypeScript",
		});

		expect(result.unfilledFields).toEqual([]);
	});

	test("tracks unfilled fields when only some values are supplied", () => {
		const result = mergeContent("Write {{code}} in {{language}}", {
			code: "FizzBuzz",
		});

		expect(result.content).toBe("Write FizzBuzz in {{language}}");
		expect(result.mergeFields).toEqual(["code", "language"]);
		expect(result.unfilledFields).toEqual(["language"]);
	});

	test("tracks all fields as unfilled when no values are supplied", () => {
		const result = mergeContent(MERGE_FIXTURES.twoFields.content, {});

		expect(result.content).toBe(MERGE_FIXTURES.twoFields.content);
		expect(result.mergeFields).toEqual(["code", "language"]);
		expect(result.unfilledFields).toEqual(["code", "language"]);
	});

	test("leaves content unchanged when there are no merge fields", () => {
		const result = mergeContent(MERGE_FIXTURES.noFields.content, {});

		expect(result.content).toBe(MERGE_FIXTURES.noFields.content);
		expect(result.mergeFields).toEqual([]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("returns empty arrays for empty content", () => {
		const result = mergeContent(MERGE_FIXTURES.emptyContent.content, {
			language: "Python",
		});

		expect(result.content).toBe("");
		expect(result.mergeFields).toEqual([]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("substitutes values literally without recursive merge processing", () => {
		const result = mergeContent("Template: {{a}}", { a: "{{b}}" });

		expect(result.content).toBe("Template: {{b}}");
		expect(result.mergeFields).toEqual(["a"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("preserves newline characters in replacement values", () => {
		const result = mergeContent("Body:\n{{text}}", {
			text: "line 1\nline 2",
		});

		expect(result.content).toBe("Body:\nline 1\nline 2");
		expect(result.mergeFields).toEqual(["text"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("ignores extra keys in values that are not used by the template", () => {
		const result = mergeContent("Hello {{name}}", {
			name: "Lee",
			unused: "ignored",
		});

		expect(result.content).toBe("Hello Lee");
		expect(result.mergeFields).toEqual(["name"]);
		expect(result.unfilledFields).toEqual([]);
	});

	test("supports {{constructor}} safely via own-property checks", () => {
		const result = mergeContent("Value: {{constructor}}", {
			constructor: "safe",
		});

		expect(result.content).toBe("Value: safe");
		expect(result.mergeFields).toEqual(["constructor"]);
		expect(result.unfilledFields).toEqual([]);
	});
});
