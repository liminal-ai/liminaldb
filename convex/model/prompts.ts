import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { ConvexError } from "convex/values";
import { validateTagName } from "./tagConstants";
import { getRankingConfig, rerank } from "./ranking";
import {
	assertCanRead,
	assertCanInsert,
	assertCanModify,
	assertCanDelete,
} from "../auth/rls";

// Slug validation: lowercase, numbers, dashes only. No colons (reserved for namespacing).
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export interface PromptMeta {
	pinned: boolean;
	favorited: boolean;
	usageCount: number;
	lastUsedAt?: number;
}

export interface PromptDTOv2 extends PromptDTO, PromptMeta {}

export function buildSearchText(prompt: {
	slug: string;
	name: string;
	description: string;
	content: string;
}): string {
	return `${prompt.slug} ${prompt.name} ${prompt.description} ${prompt.content}`
		.toLowerCase()
		.trim();
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
 * Tags are written directly to tagNames (no junction table).
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
			throw new ConvexError({
				code: "DUPLICATE_SLUG_IN_BATCH",
				slug: prompt.slug,
			});
		}
		slugsInBatch.add(prompt.slug);

		const exists = await slugExists(ctx, userId, prompt.slug);
		if (exists) {
			throw new ConvexError({ code: "DUPLICATE_SLUG", slug: prompt.slug });
		}
	}

	// Phase 2: Insert each prompt with tags written directly
	const promptIds: Id<"prompts">[] = [];

	for (const prompt of prompts) {
		// Deduplicate and normalize tags
		const tagNames = [
			...new Set(prompt.tags.map((t) => t.trim().toLowerCase())),
		];

		// RLS: verify the caller is inserting under their own userId
		assertCanInsert({ userId }, "prompts", { userId });

		const promptId = await ctx.db.insert("prompts", {
			userId,
			slug: prompt.slug,
			name: prompt.name,
			description: prompt.description,
			content: prompt.content,
			tagNames,
			parameters: prompt.parameters,
			// Epic 02 defaults
			searchText: buildSearchText(prompt),
			pinned: false,
			favorited: false,
			usageCount: 0,
		});

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

	assertCanRead({ userId }, "prompts", prompt);

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
 * List prompts for user with optional search.
 * Returns DTOs sorted by creation time (most recent first).
 */
export async function listByUser(
	ctx: QueryCtx,
	userId: string,
	options: { query?: string; limit?: number } = {},
): Promise<PromptDTO[]> {
	const limit = options.limit ?? 50;
	const query = options.query?.trim();

	// When filtering by search, we need to fetch all then filter then slice
	// Otherwise the limit would truncate before filtering
	// WARNING: This fetches ALL user prompts before filtering. Performance degrades
	// with large prompt collections. Temporary - replaced with search index in Feature 4.
	if (query) {
		const allPrompts = await ctx.db
			.query("prompts")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.order("desc")
			.collect();

		const searchLower = query.toLowerCase();
		const filtered = allPrompts.filter(
			(p) =>
				p.slug.toLowerCase().includes(searchLower) ||
				p.name.toLowerCase().includes(searchLower) ||
				p.tagNames.some((t) => t.toLowerCase().includes(searchLower)),
		);

		return filtered.slice(0, limit).map((prompt) => ({
			slug: prompt.slug,
			name: prompt.name,
			description: prompt.description,
			content: prompt.content,
			tags: prompt.tagNames,
			parameters: prompt.parameters,
		}));
	}

	// No search query: apply limit at DB level for efficiency
	const prompts = await ctx.db
		.query("prompts")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.order("desc")
		.take(limit);

	return prompts.map((prompt) => ({
		slug: prompt.slug,
		name: prompt.name,
		description: prompt.description,
		content: prompt.content,
		tags: prompt.tagNames,
		parameters: prompt.parameters,
	}));
}

/**
 * Update prompt by slug for user.
 * Handles tag changes (removes old, adds new).
 * Allows slug rename if new slug doesn't conflict.
 * Returns true if updated, false if not found.
 */
export async function updateBySlug(
	ctx: MutationCtx,
	userId: string,
	slug: string,
	updates: PromptInput,
): Promise<boolean> {
	// Find existing prompt
	const prompt = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	if (!prompt) {
		return false;
	}

	assertCanModify({ userId }, "prompts", prompt);

	// Validate updates
	validatePromptInput(updates);

	// If slug is changing, check new slug doesn't conflict
	if (updates.slug !== slug) {
		const exists = await slugExists(ctx, userId, updates.slug);
		if (exists) {
			throw new ConvexError({ code: "DUPLICATE_SLUG", slug: updates.slug });
		}
	}

	// Deduplicate and normalize tags
	const tagNames = [
		...new Set(updates.tags.map((t) => t.trim().toLowerCase())),
	];

	// Update prompt fields — tagNames written directly (no junction table)
	await ctx.db.patch(prompt._id, {
		slug: updates.slug,
		name: updates.name,
		description: updates.description,
		content: updates.content,
		tagNames,
		parameters: updates.parameters,
		searchText: buildSearchText(updates),
	});

	return true;
}

/**
 * Delete prompt by slug for user.
 * Cleans up junction records. Tags are global shared tags and are never deleted.
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

	assertCanDelete({ userId }, "prompts", prompt);

	// Delete the prompt (no junction cleanup needed — tags stored directly)
	await ctx.db.delete(prompt._id);

	return true;
}

// Epic 02: Search & Select (Story 1) stubs (TDD red)

/**
 * List prompts for a user with ranking applied.
 *
 * SCALABILITY NOTE: This function fetches ALL user prompts into memory before
 * filtering and sorting. This is O(n) for fetch and O(n log n) for sort.
 * For users with large prompt collections (1000+), consider adding pagination
 * or a dedicated index-based approach in a future optimization pass.
 */
export async function listPromptsRanked(
	ctx: QueryCtx,
	userId: string,
	options: { limit?: number; tags?: string[] } = {},
): Promise<PromptDTOv2[]> {
	const config = await getRankingConfig(ctx);
	const now = Date.now();

	const limit = options.limit ?? 50;
	const tags = options.tags
		?.map((t) => t.trim().toLowerCase())
		.filter((t) => t.length > 0);

	const all = await ctx.db
		.query("prompts")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();

	const filtered =
		tags && tags.length > 0
			? all.filter((p) =>
					p.tagNames.some((name) => tags.includes(name.toLowerCase())),
				)
			: all;

	const ranked = rerank(filtered, config.weights, { mode: "list", now });
	return ranked.slice(0, limit).map(toDTOv2);
}

export async function searchPrompts(
	ctx: QueryCtx,
	userId: string,
	query: string,
	tags?: string[],
	limit?: number,
): Promise<PromptDTOv2[]> {
	const config = await getRankingConfig(ctx);
	const now = Date.now();
	const normalized = query.trim().toLowerCase();

	// Short-circuit empty/whitespace queries to use ranked list behavior
	if (!normalized) {
		return listPromptsRanked(ctx, userId, { limit, tags });
	}

	const requested = limit ?? 50;
	const tagList = tags?.map((t) => t.trim().toLowerCase()).filter(Boolean);

	// Over-fetch when tags are applied to compensate for post-fetch filtering
	const baseTake =
		tagList && tagList.length > 0 ? config.searchRerankLimit : requested;
	const searchLimit = Math.min(baseTake, config.searchRerankLimit);

	let results = await ctx.db
		.query("prompts")
		.withSearchIndex("search_prompts", (q) =>
			q.search("searchText", normalized).eq("userId", userId),
		)
		.take(searchLimit);

	if (tagList && tagList.length > 0) {
		results = results.filter((p) =>
			p.tagNames.some((name) => tagList.includes(name.toLowerCase())),
		);
	}

	const ranked = rerank(results, config.weights, { mode: "search", now });
	return ranked.slice(0, requested).map(toDTOv2);
}

export async function updatePromptFlags(
	ctx: MutationCtx,
	userId: string,
	slug: string,
	updates: { pinned?: boolean; favorited?: boolean },
): Promise<boolean> {
	const prompt = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	if (!prompt) return false;

	assertCanModify({ userId }, "prompts", prompt);

	const patch: Partial<{ pinned: boolean; favorited: boolean }> = {};
	if (updates.pinned !== undefined) patch.pinned = updates.pinned;
	if (updates.favorited !== undefined) patch.favorited = updates.favorited;
	if (Object.keys(patch).length === 0) return true;

	await ctx.db.patch(prompt._id, patch);
	return true;
}

/**
 * Track prompt usage by incrementing usageCount and updating lastUsedAt.
 *
 * CONCURRENCY NOTE: This uses a read-then-write pattern for usageCount.
 * Convex mutations are serializable transactions with automatic OCC retries,
 * so concurrent updates won't lose increments. This is acceptable for analytics
 * where exact counts aren't critical. If precise counting is needed in the future,
 * consider a dedicated counter table with append-only writes.
 */
export async function trackPromptUse(
	ctx: MutationCtx,
	userId: string,
	slug: string,
): Promise<boolean> {
	const prompt = await ctx.db
		.query("prompts")
		.withIndex("by_user_slug", (q) => q.eq("userId", userId).eq("slug", slug))
		.unique();

	if (!prompt) return false;

	assertCanModify({ userId }, "prompts", prompt);

	await ctx.db.patch(prompt._id, {
		usageCount: (prompt.usageCount ?? 0) + 1,
		lastUsedAt: Date.now(),
	});

	return true;
}

/**
 * List all unique tags used by a user's prompts.
 * Returns a flat, sorted array of tag strings.
 */
export async function listTags(
	ctx: QueryCtx,
	userId: string,
): Promise<string[]> {
	const prompts = await ctx.db
		.query("prompts")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.collect();

	const tagSet = new Set<string>();
	for (const prompt of prompts) {
		for (const tag of prompt.tagNames) {
			tagSet.add(tag);
		}
	}

	return [...tagSet].sort();
}

function toDTOv2(prompt: {
	slug: string;
	name: string;
	description: string;
	content: string;
	tagNames: string[];
	parameters?: PromptDTO["parameters"];
	pinned?: boolean;
	favorited?: boolean;
	usageCount?: number;
	lastUsedAt?: number;
}): PromptDTOv2 {
	return {
		slug: prompt.slug,
		name: prompt.name,
		description: prompt.description,
		content: prompt.content,
		tags: prompt.tagNames,
		parameters: prompt.parameters,
		pinned: prompt.pinned ?? false,
		favorited: prompt.favorited ?? false,
		usageCount: prompt.usageCount ?? 0,
		lastUsedAt: prompt.lastUsedAt,
	};
}
