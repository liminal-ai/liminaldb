/**
 * Test to ensure LIMITS constants stay in sync between API layer and Convex.
 *
 * Convex runs in an isolated environment and cannot import from src/,
 * so LIMITS must be duplicated. This test catches drift at CI time.
 */

import { describe, test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Extract LIMITS object from a TypeScript file by parsing its text.
 * This is more reliable than importing since Convex files may have
 * dependencies that don't work outside the Convex runtime.
 */
function extractLimitsFromFile(
	filePath: string,
): Record<string, number> | null {
	const content = readFileSync(filePath, "utf-8");

	// Find the LIMITS object definition
	const limitsMatch = content.match(
		/(?:export\s+)?const\s+LIMITS\s*=\s*\{([^}]+)\}/s,
	);
	if (!limitsMatch) {
		return null;
	}

	const limitsBody = limitsMatch[1];
	if (!limitsBody) {
		return null;
	}

	// Parse each key-value pair
	const result: Record<string, number> = {};
	const pairRegex = /(\w+)\s*:\s*(\d+)/g;

	// Use matchAll for cleaner regex iteration (avoids assignment in expression)
	for (const match of limitsBody.matchAll(pairRegex)) {
		const [, key, value] = match;
		if (key && value) {
			result[key] = parseInt(value, 10);
		}
	}

	return result;
}

describe("LIMITS sync validation", () => {
	const projectRoot = join(import.meta.dirname, "../..");

	test("src/schemas/prompts.ts and convex/model/prompts.ts have matching LIMITS", () => {
		const srcPath = join(projectRoot, "src/schemas/prompts.ts");
		const convexPath = join(projectRoot, "convex/model/prompts.ts");

		const srcLimits = extractLimitsFromFile(srcPath);
		const convexLimits = extractLimitsFromFile(convexPath);

		// Both files must have LIMITS defined
		expect(srcLimits).not.toBeNull();
		expect(convexLimits).not.toBeNull();

		// After null checks, we can safely use the values
		if (!srcLimits || !convexLimits) {
			throw new Error("LIMITS not found in one or both files");
		}

		// Get all unique keys from both
		const allKeys = new Set([
			...Object.keys(srcLimits),
			...Object.keys(convexLimits),
		]);

		// Check each key matches
		const mismatches: string[] = [];
		const missingSrc: string[] = [];
		const missingConvex: string[] = [];

		for (const key of allKeys) {
			const srcValue = srcLimits[key];
			const convexValue = convexLimits[key];

			if (srcValue === undefined) {
				missingSrc.push(key);
			} else if (convexValue === undefined) {
				missingConvex.push(key);
			} else if (srcValue !== convexValue) {
				mismatches.push(`${key}: src=${srcValue}, convex=${convexValue}`);
			}
		}

		// Build detailed error message if there are issues
		const issues: string[] = [];
		if (missingSrc.length > 0) {
			issues.push(
				`Missing in src/schemas/prompts.ts: ${missingSrc.join(", ")}`,
			);
		}
		if (missingConvex.length > 0) {
			issues.push(
				`Missing in convex/model/prompts.ts: ${missingConvex.join(", ")}`,
			);
		}
		if (mismatches.length > 0) {
			issues.push(`Value mismatches: ${mismatches.join("; ")}`);
		}

		if (issues.length > 0) {
			throw new Error(
				`LIMITS constants are out of sync:\n${issues.join("\n")}\n\n` +
					`Both files must have identical LIMITS values.`,
			);
		}

		// Verify we found a reasonable number of limits (sanity check)
		expect(Object.keys(srcLimits).length).toBeGreaterThanOrEqual(5);
	});
});
