/**
 * NOTE: MERGE_FIELD_REGEX is duplicated from convex/model/merge.ts —
 * Convex edge runtime boundary prevents sharing imports between
 * convex/ and src/ at runtime.
 */
const MERGE_FIELD_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

export interface MergeResult {
	/** Merged content with values substituted */
	content: string;
	/** All merge fields found in the template (first-occurrence order) */
	mergeFields: string[];
	/** Fields with no matching value in the dictionary (first-occurrence order) */
	unfilledFields: string[];
}

/**
 * Replace {{fieldName}} tokens in content with values from dictionary.
 * Unfilled fields remain as {{fieldName}} in the output.
 * Values are substituted literally — no recursive processing.
 *
 * Uses replace callback (not string replacement pattern) to avoid
 * issues with special replacement patterns ($1, $&, etc.) in values.
 * Uses Object.hasOwn() instead of `in` for value lookups to avoid
 * prototype pollution (e.g., {{constructor}} would match Object.prototype with `in`).
 */
export function mergeContent(
	content: string,
	values: Record<string, string>,
): MergeResult {
	const seen = new Set<string>();
	const mergeFields: string[] = [];
	const unfilledFields: string[] = [];

	const merged = content.replace(
		MERGE_FIELD_REGEX,
		(fullMatch, fieldName: string) => {
			const hasValue = Object.hasOwn(values, fieldName);

			if (!seen.has(fieldName)) {
				seen.add(fieldName);
				mergeFields.push(fieldName);
				if (!hasValue) {
					unfilledFields.push(fieldName);
				}
			}

			if (hasValue) {
				const value = values[fieldName];
				if (value !== undefined) {
					return value;
				}
			}

			return fullMatch;
		},
	);

	return { content: merged, mergeFields, unfilledFields };
}
