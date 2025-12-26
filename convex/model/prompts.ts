import { NotImplementedError } from "../errors";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

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
	_ctx: QueryCtx,
	_userId: string,
	_slug: string,
): Promise<boolean> {
	throw new NotImplementedError("slugExists");
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
	_ctx: MutationCtx,
	_userId: string,
	_prompts: PromptInput[],
): Promise<Id<"prompts">[]> {
	throw new NotImplementedError("insertMany");
}

/**
 * Get prompt by slug for user.
 * Returns DTO or null if not found.
 */
export async function getBySlug(
	_ctx: QueryCtx,
	_userId: string,
	_slug: string,
): Promise<PromptDTO | null> {
	throw new NotImplementedError("getBySlug");
}

/**
 * Delete prompt by slug for user.
 * Also cleans up orphaned promptTags.
 * Returns true if deleted, false if not found.
 */
export async function deleteBySlug(
	_ctx: MutationCtx,
	_userId: string,
	_slug: string,
): Promise<boolean> {
	throw new NotImplementedError("deleteBySlug");
}
