/**
 * Tag Constants
 *
 * Tags are user-defined free-form strings. The original 19 tags are
 * preserved as suggestions for the UI, but users can create any tag.
 */

/**
 * Suggested tags for the UI. These are the original 19 shared tags,
 * now offered as suggestions rather than enforced as the only options.
 */
export const SUGGESTED_TAGS: string[] = [
	// Purpose
	"instruction",
	"reference",
	"persona",
	"workflow",
	"snippet",
	// Domain
	"code",
	"writing",
	"analysis",
	"planning",
	"design",
	"data",
	"communication",
	// Task
	"review",
	"summarize",
	"explain",
	"debug",
	"transform",
	"extract",
	"translate",
];

/**
 * Tag validation: slug-like format (lowercase, numbers, dashes).
 */
export const TAG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const TAG_MAX_LENGTH = 100;

/**
 * Validate and normalize a tag name.
 * @returns normalized tag string
 * @throws Error if tag is invalid
 */
export function validateTagName(tag: string): string {
	const normalized = tag.trim().toLowerCase();
	if (normalized.length === 0) {
		throw new Error("Tag name cannot be empty");
	}
	if (normalized.length > TAG_MAX_LENGTH) {
		throw new Error(`Tag name must be ${TAG_MAX_LENGTH} chars or less`);
	}
	if (!TAG_REGEX.test(normalized)) {
		throw new Error("Tag must be lowercase letters, numbers, and dashes only");
	}
	return normalized;
}
