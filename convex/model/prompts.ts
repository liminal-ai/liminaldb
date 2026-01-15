import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { validateGlobalTag, getTagId } from "./tags";
import { getRankingConfig, rerank } from "./ranking";

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
 * Validate tag name against the 19 fixed global tags.
 * Throws if invalid.
 */
export function validateTagName(tagName: string): void {
	validateGlobalTag(tagName);
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
 * Creates tags as needed, creates junction records.
 * tagNames is synced automatically via database trigger on promptTags table.
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

	// Phase 2: Look up tag IDs (tags are pre-seeded, no creation needed)
	// Cache to avoid duplicate lookups within batch
	const tagIdCache = new Map<string, Id<"tags">>();

	async function getTagIdCached(tagName: string): Promise<Id<"tags">> {
		const cached = tagIdCache.get(tagName);
		if (cached) {
			return cached;
		}

		const tagId = await getTagId(ctx, tagName);
		tagIdCache.set(tagName, tagId);
		return tagId;
	}

	// Phase 3: Insert each prompt with its tags
	const promptIds: Id<"prompts">[] = [];

	for (const prompt of prompts) {
		// Look up tag IDs for this prompt
		const tagIds: Id<"tags">[] = [];
		for (const tagName of prompt.tags) {
			const tagId = await getTagIdCached(tagName);
			tagIds.push(tagId);
		}

		// Insert the prompt with empty tagNames
		// Trigger on promptTags will sync the denormalized field after junction inserts
		const promptId = await ctx.db.insert("prompts", {
			userId,
			slug: prompt.slug,
			name: prompt.name,
			description: prompt.description,
			content: prompt.content,
			tagNames: [], // Synced by trigger
			parameters: prompt.parameters,
			// Epic 02 defaults
			searchText: buildSearchText(prompt),
			pinned: false,
			favorited: false,
			usageCount: 0,
		});

		// Create junction records - trigger fires on each insert, syncing tagNames
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

	// Validate updates
	validatePromptInput(updates);

	// If slug is changing, check new slug doesn't conflict
	if (updates.slug !== slug) {
		const exists = await slugExists(ctx, userId, updates.slug);
		if (exists) {
			throw new Error(`Slug "${updates.slug}" already exists for this user`);
		}
	}

	// Handle tag changes
	// Get current junctions
	const currentJunctions = await ctx.db
		.query("promptTags")
		.withIndex("by_prompt", (q) => q.eq("promptId", prompt._id))
		.collect();

	// Build map of current tagId -> junction record
	const currentTagIds = new Set<string>();
	const junctionByTagId = new Map<string, Id<"promptTags">>();
	for (const junction of currentJunctions) {
		currentTagIds.add(junction.tagId);
		junctionByTagId.set(junction.tagId, junction._id);
	}

	// Look up tag IDs for new tags
	const newTagIds = new Set<string>();
	const tagIdsToAdd: Id<"tags">[] = [];

	for (const tagName of updates.tags) {
		const tagId = await getTagId(ctx, tagName);
		newTagIds.add(tagId);
		if (!currentTagIds.has(tagId)) {
			tagIdsToAdd.push(tagId);
		}
	}

	// Find tags to remove (in current but not in new)
	const tagIdsToRemove: Id<"tags">[] = [];
	for (const tagId of currentTagIds) {
		if (!newTagIds.has(tagId)) {
			tagIdsToRemove.push(tagId as Id<"tags">);
		}
	}

	// Remove old junctions
	for (const tagId of tagIdsToRemove) {
		const junctionId = junctionByTagId.get(tagId);
		if (junctionId) {
			await ctx.db.delete(junctionId);
		}
	}

	// Add new junctions
	for (const tagId of tagIdsToAdd) {
		await ctx.db.insert("promptTags", {
			promptId: prompt._id,
			tagId,
		});
	}

	// Clean up orphaned tags
	for (const tagId of tagIdsToRemove) {
		const remainingRefs = await ctx.db
			.query("promptTags")
			.withIndex("by_tag", (q) => q.eq("tagId", tagId))
			.first();

		if (!remainingRefs) {
			await ctx.db.delete(tagId);
		}
	}

	// Update prompt fields (tagNames synced by trigger)
	await ctx.db.patch(prompt._id, {
		slug: updates.slug,
		name: updates.name,
		description: updates.description,
		content: updates.content,
		parameters: updates.parameters,
		// Epic 02: keep search index field derived from main fields
		searchText: buildSearchText(updates),
	});

	return true;
}

/**
 * Delete prompt by slug for user.
 * Cleans up junction records and orphaned tags (tags no longer referenced by any prompt).
 * Note: tagNames trigger fires on junction deletes but is a no-op since prompt is deleted.
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

	await ctx.db.patch(prompt._id, {
		usageCount: (prompt.usageCount ?? 0) + 1,
		lastUsedAt: Date.now(),
	});

	return true;
}

export async function listTags(
	ctx: QueryCtx,
	_userId: string,
): Promise<{ purpose: string[]; domain: string[]; task: string[] }> {
	// Global tags - userId is ignored
	// Delegates to getTagsByDimension from tags model
	const { getTagsByDimension } = await import("./tags");
	const grouped = await getTagsByDimension(ctx);
	return {
		purpose: grouped.purpose || [],
		domain: grouped.domain || [],
		task: grouped.task || [],
	};
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
