import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { findOrCreateTag } from "./tags";

// Slug validation: lowercase, numbers, dashes only. No colons (reserved for namespacing).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Tag name validation: alphanumeric, dashes, underscores, forward slashes (for hierarchy)
const TAG_NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9\-_/]*$/;

// Validation limits
const LIMITS = {
	NAME_MAX_LENGTH: 200,
	DESCRIPTION_MAX_LENGTH: 2000,
	CONTENT_MAX_LENGTH: 100000,
	TAG_NAME_MAX_LENGTH: 100,
	MAX_TAGS_PER_PROMPT: 50,
	SLUG_MAX_LENGTH: 200,
} as const;

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
	if (!slug || !slug.trim()) {
		throw new Error("Slug is required and cannot be empty");
	}
	if (slug.length > LIMITS.SLUG_MAX_LENGTH) {
		throw new Error(
			`Slug too long: ${slug.length} chars (max ${LIMITS.SLUG_MAX_LENGTH})`,
		);
	}
	if (!SLUG_REGEX.test(slug)) {
		throw new Error(
			`Invalid slug: "${slug}". Use lowercase letters, numbers, and dashes only. (Colons are reserved for namespacing.)`,
		);
	}
}

/**
 * Validate tag name format.
 * Throws if invalid.
 */
export function validateTagName(tagName: string): void {
	if (!tagName || !tagName.trim()) {
		throw new Error("Tag name is required and cannot be empty");
	}
	if (tagName.length > LIMITS.TAG_NAME_MAX_LENGTH) {
		throw new Error(
			`Tag name too long: "${tagName}" is ${tagName.length} chars (max ${LIMITS.TAG_NAME_MAX_LENGTH})`,
		);
	}
	if (!TAG_NAME_REGEX.test(tagName)) {
		throw new Error(
			`Invalid tag name: "${tagName}". Use letters, numbers, dashes, underscores, or forward slashes.`,
		);
	}
}

/**
 * Validate a single prompt input.
 * Throws with specific error message if validation fails.
 */
export function validatePromptInput(prompt: PromptInput): void {
	// Required fields - check for empty strings
	if (!prompt.name || !prompt.name.trim()) {
		throw new Error("Prompt name is required and cannot be empty");
	}
	if (!prompt.description || !prompt.description.trim()) {
		throw new Error("Prompt description is required and cannot be empty");
	}
	if (!prompt.content || !prompt.content.trim()) {
		throw new Error("Prompt content is required and cannot be empty");
	}

	// Length limits
	if (prompt.name.length > LIMITS.NAME_MAX_LENGTH) {
		throw new Error(
			`Prompt name too long: ${prompt.name.length} chars (max ${LIMITS.NAME_MAX_LENGTH})`,
		);
	}
	if (prompt.description.length > LIMITS.DESCRIPTION_MAX_LENGTH) {
		throw new Error(
			`Prompt description too long: ${prompt.description.length} chars (max ${LIMITS.DESCRIPTION_MAX_LENGTH})`,
		);
	}
	if (prompt.content.length > LIMITS.CONTENT_MAX_LENGTH) {
		throw new Error(
			`Prompt content too long: ${prompt.content.length} chars (max ${LIMITS.CONTENT_MAX_LENGTH})`,
		);
	}

	// Tags validation
	if (prompt.tags.length > LIMITS.MAX_TAGS_PER_PROMPT) {
		throw new Error(
			`Too many tags: ${prompt.tags.length} (max ${LIMITS.MAX_TAGS_PER_PROMPT})`,
		);
	}
	for (const tag of prompt.tags) {
		validateTagName(tag);
	}

	// Slug validation (includes empty check and format check)
	validateSlug(prompt.slug);
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
 * Atomic: All operations run within a single Convex mutation, which provides
 * serializable isolation. If any prompt fails validation, entire batch fails
 * and no changes are persisted. Convex automatically retries on OCC conflicts.
 *
 * Returns array of prompt IDs.
 */
export async function insertMany(
	ctx: MutationCtx,
	userId: string,
	prompts: PromptInput[],
): Promise<Id<"prompts">[]> {
	// Phase 1: Validate ALL prompts BEFORE any inserts
	// This ensures atomic behavior: fail fast, nothing written on error
	const slugsInBatch = new Set<string>();
	for (const prompt of prompts) {
		validatePromptInput(prompt);

		// Check for duplicates within the batch itself
		if (slugsInBatch.has(prompt.slug)) {
			throw new Error(`Duplicate slug in batch: "${prompt.slug}"`);
		}
		slugsInBatch.add(prompt.slug);

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
 * Cleans up junction records and orphaned tags (tags no longer referenced by any prompt).
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

	// Get all junction records for this prompt (we'll need the tagIds for orphan check)
	const junctions = await ctx.db
		.query("promptTags")
		.withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
		.collect();

	// Collect tag IDs before deleting junctions
	const tagIdsToCheck = junctions.map((j) => j.tagId);

	// Delete all junction records for this prompt
	for (const junction of junctions) {
		await ctx.db.delete(junction._id);
	}

	// Delete the prompt
	await ctx.db.delete(prompt._id);

	// Clean up orphaned tags: delete tags that have no remaining junction records
	for (const tagId of tagIdsToCheck) {
		const remainingRefs = await ctx.db
			.query("promptTags")
			.withIndex("by_tag", (q) => q.eq("tagId", tagId))
			.first();

		if (!remainingRefs) {
			// No other prompts reference this tag, delete it
			await ctx.db.delete(tagId);
		}
	}

	return true;
}
