import { describe, expect, test } from "vitest";
import { extractMergeFields } from "../../../convex/model/merge";
import { MERGE_FIXTURES } from "../../fixtures/merge";

describe("extractMergeFields", () => {
	test("extracts two distinct fields from fixture", () => {
		const fields = extractMergeFields(MERGE_FIXTURES.twoFields.content);

		expect(fields).toEqual(MERGE_FIXTURES.twoFields.mergeFields);
	});

	test("deduplicates repeated fields from fixture", () => {
		const fields = extractMergeFields(MERGE_FIXTURES.duplicateField.content);

		expect(fields).toEqual(MERGE_FIXTURES.duplicateField.mergeFields);
	});

	test("returns empty array for content with no fields", () => {
		const fields = extractMergeFields(MERGE_FIXTURES.noFields.content);

		expect(fields).toEqual([]);
	});

	test("returns empty array for empty content", () => {
		const fields = extractMergeFields(MERGE_FIXTURES.emptyContent.content);

		expect(fields).toEqual([]);
	});

	test("extracts only valid identifiers from edgeCases fixture", () => {
		const fields = extractMergeFields(MERGE_FIXTURES.edgeCases.content);

		expect(fields).toEqual(MERGE_FIXTURES.edgeCases.mergeFields);
	});

	test("ignores empty braces", () => {
		const fields = extractMergeFields("Ignore {{}} and keep {{name}}");

		expect(fields).toEqual(["name"]);
	});

	test("ignores whitespace inside braces", () => {
		const fields = extractMergeFields("Ignore {{ name }} and {{  code  }}");

		expect(fields).toEqual([]);
	});

	test("ignores invalid characters in field names", () => {
		const fields = extractMergeFields("Invalid {{foo.bar}} and {{my field}}");

		expect(fields).toEqual([]);
	});

	test("preserves first-occurrence order", () => {
		const fields = extractMergeFields(
			"Write {{code}} in {{language}} using {{framework}}",
		);

		expect(fields).toEqual(["code", "language", "framework"]);
	});
});
