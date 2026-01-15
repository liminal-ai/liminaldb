/**
 * Global Tag Constants
 *
 * Defines the 19 fixed shared tags across 3 dimensions.
 * These tags are global (not per-user) and seeded on deployment.
 */

export const TAG_DIMENSIONS = ["purpose", "domain", "task"] as const;
export type TagDimension = (typeof TAG_DIMENSIONS)[number];

export const GLOBAL_TAGS = {
	purpose: ["instruction", "reference", "persona", "workflow", "snippet"],
	domain: [
		"code",
		"writing",
		"analysis",
		"planning",
		"design",
		"data",
		"communication",
	],
	task: [
		"review",
		"summarize",
		"explain",
		"debug",
		"transform",
		"extract",
		"translate",
	],
} as const;

export const ALL_TAG_NAMES = [
	...GLOBAL_TAGS.purpose,
	...GLOBAL_TAGS.domain,
	...GLOBAL_TAGS.task,
] as const;

export type TagName = (typeof ALL_TAG_NAMES)[number];

/**
 * Map tag name to its dimension for UI grouping.
 */
export const TAG_TO_DIMENSION: Record<TagName, TagDimension> = {
	// Purpose
	instruction: "purpose",
	reference: "purpose",
	persona: "purpose",
	workflow: "purpose",
	snippet: "purpose",
	// Domain
	code: "domain",
	writing: "domain",
	analysis: "domain",
	planning: "domain",
	design: "domain",
	data: "domain",
	communication: "domain",
	// Task
	review: "task",
	summarize: "task",
	explain: "task",
	debug: "task",
	transform: "task",
	extract: "task",
	translate: "task",
};
