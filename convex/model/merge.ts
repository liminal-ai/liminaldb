/**
 * Regex for valid merge field syntax.
 * Matches {{fieldName}} where fieldName starts with [a-zA-Z_]
 * and contains only [a-zA-Z0-9_].
 * Does NOT match: {{}}, {{ name }}, {{foo.bar}}, {{my field}}
 *
 * NOTE: Duplicated in src/lib/merge.ts — Convex edge runtime boundary
 * prevents sharing imports between convex/ and src/ at runtime.
 */
// @see tests/service/lib/merge.test.ts "merge field regex consistency"
const MERGE_FIELD_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

/**
 * Extract merge field names from prompt content.
 * Returns deduplicated array in first-occurrence order.
 */
export function extractMergeFields(content: string): string[] {
	const seen = new Set<string>();
	const fields: string[] = [];
	let match: RegExpExecArray | null;

	// Reset lastIndex for safety (global regex)
	MERGE_FIELD_REGEX.lastIndex = 0;

	while (true) {
		match = MERGE_FIELD_REGEX.exec(content);
		if (match === null) {
			break;
		}

		const name = match[1];
		// Defensive: capture group always matches with current regex, but guards against future changes
		if (name === undefined) {
			continue;
		}
		if (!seen.has(name)) {
			seen.add(name);
			fields.push(name);
		}
	}

	return fields;
}
