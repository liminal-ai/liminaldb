import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { ALL_TAG_NAMES, GLOBAL_TAGS, type TagName } from "./tagConstants";

/**
 * Validate tag name against the fixed list of 19 global tags.
 * @param name - Tag name to validate
 * @returns Normalized tag name (lowercase)
 * @throws Error if tag is not in the global list
 */
export function validateGlobalTag(name: string): TagName {
	const normalized = name.trim().toLowerCase();
	if (!normalized) {
		throw new Error(
			`Invalid tag: empty. Valid tags: ${ALL_TAG_NAMES.join(", ")}`,
		);
	}
	if (!ALL_TAG_NAMES.includes(normalized as TagName)) {
		throw new Error(
			`Invalid tag: "${name}". Valid tags: ${ALL_TAG_NAMES.join(", ")}`,
		);
	}
	return normalized as TagName;
}

/**
 * Get tag ID by name. Tags are pre-seeded, so this should always find one.
 * @param ctx - Convex query/mutation context
 * @param name - Tag name to look up
 * @returns Tag document ID
 * @throws Error if tag not found (indicates seeding issue)
 */
export async function getTagId(
	ctx: QueryCtx | MutationCtx,
	name: string,
): Promise<Id<"tags">> {
	const normalized = validateGlobalTag(name);

	const tag = await ctx.db
		.query("tags")
		.withIndex("by_name", (q) => q.eq("name", normalized))
		.unique();

	if (!tag) {
		throw new Error(
			`Tag "${normalized}" not found. Run seedGlobalTags migration first.`,
		);
	}

	return tag._id;
}

/**
 * Get all tags grouped by dimension for UI rendering.
 * Tags are sorted to match the canonical order in GLOBAL_TAGS.
 * @param ctx - Convex query context
 * @returns Object with purpose, domain, task arrays
 */
export async function getTagsByDimension(
	ctx: QueryCtx,
): Promise<{ purpose: string[]; domain: string[]; task: string[] }> {
	const allTags = await ctx.db.query("tags").collect();

	const grouped: { purpose: string[]; domain: string[]; task: string[] } = {
		purpose: [],
		domain: [],
		task: [],
	};

	for (const tag of allTags) {
		const arr = grouped[tag.dimension as keyof typeof grouped];
		if (arr) {
			arr.push(tag.name);
		}
	}

	// Sort each dimension to match canonical order in GLOBAL_TAGS
	for (const dim of ["purpose", "domain", "task"] as const) {
		const canonicalOrder = GLOBAL_TAGS[dim] as readonly string[];
		grouped[dim].sort(
			(a, b) => canonicalOrder.indexOf(a) - canonicalOrder.indexOf(b),
		);
	}

	return grouped;
}
