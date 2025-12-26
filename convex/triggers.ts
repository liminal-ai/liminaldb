/**
 * Database Triggers for PromptDB
 *
 * This module registers triggers that automatically sync denormalized fields
 * when underlying data changes. Triggers run within the same transaction
 * as the data change, ensuring atomic consistency.
 *
 * IMPORTANT: All mutations that write to tables with triggers MUST use
 * the wrapped mutation from ./functions.ts, not the raw _generated/server.
 */
import type { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";

export const triggers = new Triggers<DataModel>();

/**
 * Trigger: Sync tagNames on prompts when promptTags changes
 *
 * When a promptTag is inserted or deleted, this trigger:
 * 1. Queries all current tags for the affected prompt
 * 2. Updates the prompt's denormalized tagNames field
 *
 * This eliminates manual tagNames sync in mutation code and ensures
 * consistency as we add more mutation paths (updateTags, renameTag, etc.)
 */
triggers.register("promptTags", async (ctx, change) => {
	// Get the promptId from either the new doc (insert) or old doc (delete)
	const promptId = change.newDoc?.promptId ?? change.oldDoc?.promptId;

	if (!promptId) {
		return;
	}

	// Get the prompt to check if it still exists (might be deleted in same transaction)
	const prompt = await ctx.db.get(promptId);
	if (!prompt) {
		return;
	}

	// Query all current junction records for this prompt
	const junctions = await ctx.db
		.query("promptTags")
		.withIndex("by_prompt", (q) => q.eq("promptId", promptId))
		.collect();

	// Get tag names for all junction records
	const tagNames: string[] = [];
	for (const junction of junctions) {
		const tag = await ctx.db.get(junction.tagId);
		if (tag) {
			tagNames.push(tag.name);
		}
	}

	// Sort for consistent comparison
	const sortedNew = [...tagNames].sort();
	const sortedCurrent = [...prompt.tagNames].sort();

	// Only patch if actually different (prevents infinite recursion)
	if (JSON.stringify(sortedNew) !== JSON.stringify(sortedCurrent)) {
		await ctx.db.patch(promptId, { tagNames: sortedNew });
	}
});
