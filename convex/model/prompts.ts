import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { findOrCreateTag } from "./tags";

// Slug validation: lowercase, numbers, dashes only. No colons (reserved for namespacing).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface PromptInput {
	slug: string;
	name: string;
	description: string;
	content: string;
	tags: string[];
	parameters?: {
		name: string;
		type: "string" | "string[]" | "number" | "boolean";
		required: boolean;
		description?: string;
	}[];
}

export interface PromptDTO {
	slug: string;
	name: string;
	description: string;
	content: string;
	tags: string[]; // Maps from storage `tagNames`
	parameters?: {
		name: string;
		type: "string" | "string[]" | "number" | "boolean";
		required: boolean;
		description?: string;
	}[];
}

/**
 * Validate slug format.
 * Throws if invalid.
 */
export function validateSlug(slug: string): void {
	// Check colons first to give a more specific error message
	if (slug.includes(":")) {
		throw new Error(`Slug cannot contain colons (reserved for namespacing)`);
	}
	if (!SLUG_REGEX.test(slug)) {
		throw new Error(
			`Invalid slug: "${slug}". Use lowercase letters, numbers, and dashes only.`,
		);
	}
}

/**
 * Check if slug exists for user.
 */
export async function slugExists(
	ctx: QueryCtx,
	userId: string,
	slug: string,
): Promise<boolean> {
	const existing = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	return existing !== null;
}

/**
 * Insert multiple prompts for a user.
 * Creates tags as needed, creates junction records, sets denormalized tagNames.
 *
 * Atomic: If any prompt fails validation, entire batch fails.
 *
 * Returns array of prompt IDs.
 */
export async function insertMany(
	ctx: MutationCtx,
	userId: string,
	prompts: PromptInput[],
): Promise<Id<"prompts">[]> {
	// Phase 1: Validate all slugs and check for duplicates BEFORE any inserts
	for (const prompt of prompts) {
		validateSlug(prompt.slug);

		const exists = await slugExists(ctx, userId, prompt.slug);
		if (exists) {
			throw new Error(`Slug "${prompt.slug}" already exists for this user`);
		}
	}

	// Phase 2: Collect all unique tag names across all prompts and create/find tags
	// Track tags we've created during this batch to avoid duplicate lookups
	const tagIdCache = new Map<string, Id<"tags">>();

	async function getOrCreateTagId(tagName: string): Promise<Id<"tags">> {
		const cached = tagIdCache.get(tagName);
		if (cached) {
			return cached;
		}

		const tagId = await findOrCreateTag(ctx, userId, tagName);
		tagIdCache.set(tagName, tagId);
		return tagId;
	}

	// Phase 3: Insert each prompt with its tags
	const promptIds: Id<"prompts">[] = [];

	for (const prompt of prompts) {
		// Get or create all tags for this prompt
		const tagIds: Id<"tags">[] = [];
		for (const tagName of prompt.tags) {
			const tagId = await getOrCreateTagId(tagName);
			tagIds.push(tagId);
		}

		// Insert the prompt with denormalized tagNames
		const promptId = await ctx.db.insert("prompts", {
			userId,
			slug: prompt.slug,
			name: prompt.name,
			description: prompt.description,
			content: prompt.content,
			tagNames: prompt.tags,
			parameters: prompt.parameters,
		});

		// Create junction records
		for (const tagId of tagIds) {
			await ctx.db.insert("promptTags", {
				promptId,
				tagId,
			});
		}

		promptIds.push(promptId);
	}

	return promptIds;
}

/**
 * Get prompt by slug for user.
 * Returns DTO or null if not found.
 */
export async function getBySlug(
	ctx: QueryCtx,
	userId: string,
	slug: string,
): Promise<PromptDTO | null> {
	const prompt = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	if (!prompt) {
		return null;
	}

	// Map storage format to DTO format (tagNames -> tags)
	return {
		slug: prompt.slug,
		name: prompt.name,
		description: prompt.description,
		content: prompt.content,
		tags: prompt.tagNames,
		parameters: prompt.parameters,
	};
}

/**
 * Delete prompt by slug for user.
 * Also cleans up orphaned promptTags.
 * Returns true if deleted, false if not found.
 */
export async function deleteBySlug(
	ctx: MutationCtx,
	userId: string,
	slug: string,
): Promise<boolean> {
	// Find the prompt
	const prompt = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	if (!prompt) {
		return false;
	}

	// Delete all junction records for this prompt
	const junctions = await ctx.db
		.query("promptTags")
		.withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
		.collect();

	for (const junction of junctions) {
		await ctx.db.delete(junction._id);
	}

	// Delete the prompt
	await ctx.db.delete(prompt._id);

	return true;
}
