import { ConvexError } from "convex/values";
import type { RLSContext } from "./types";

/**
 * Row-Level Security (RLS) Rules for LiminalDB
 *
 * Defense-in-depth: the model layer already filters by userId on every query,
 * but RLS provides a second enforcement layer at the data access boundary.
 * If a new model function accidentally omits the userId filter, RLS catches it.
 *
 * Rules are keyed by table name. Each rule receives the authenticated user's
 * context and the document being accessed, and returns true if access is allowed.
 */

export type RLSRule = (
	ctx: RLSContext,
	doc: Record<string, unknown>,
) => boolean;

export type TableRules = {
	read?: RLSRule;
	insert?: RLSRule;
	modify?: RLSRule;
	delete?: RLSRule;
};

export type RLSRules = Record<string, TableRules>;

/**
 * User owns this prompt (userId field matches authenticated user).
 */
const isPromptOwner: RLSRule = (ctx, doc) => {
	return doc.userId === ctx.userId;
};

/**
 * RLS rules for all tables with user-scoped data.
 *
 * Tables NOT listed here (tags, rankingConfig) are either:
 * - Global/shared data (tags are shared across all users)
 * - System config (rankingConfig has no userId)
 * These don't need RLS because they're not user-scoped.
 */
export const rlsRules: RLSRules = {
	prompts: {
		read: isPromptOwner,
		insert: isPromptOwner,
		modify: isPromptOwner,
		delete: isPromptOwner,
	},
	userPreferences: {
		read: (ctx, doc) => doc.userId === ctx.userId,
		insert: (ctx, doc) => doc.userId === ctx.userId,
		modify: (ctx, doc) => doc.userId === ctx.userId,
		delete: (ctx, doc) => doc.userId === ctx.userId,
	},
	// NOTE: tags and promptTags tables removed — tags now stored directly on prompts.
};

/**
 * Validate that a user is allowed to perform an operation on a document.
 * Throws ConvexError if the operation is denied.
 *
 * @param ctx - RLS context with authenticated userId
 * @param table - Table name
 * @param operation - CRUD operation type
 * @param doc - The document being accessed
 * @throws ConvexError with code "RLS_VIOLATION" if access is denied
 */
export function assertRLS(
	ctx: RLSContext,
	table: string,
	operation: keyof TableRules,
	doc: Record<string, unknown>,
): void {
	const tableRules = rlsRules[table];
	if (!tableRules) {
		// Tables without RLS rules are either global or system config.
		// No restriction needed.
		return;
	}

	const rule = tableRules[operation];
	if (!rule) {
		// No rule for this specific operation = allowed.
		// If you want deny-by-default, change this to throw.
		return;
	}

	if (!rule(ctx, doc)) {
		throw new ConvexError({
			code: "RLS_VIOLATION",
			table,
			operation,
		});
	}
}

/**
 * Convenience: assert that the authenticated user can read this document.
 */
export function assertCanRead(
	ctx: RLSContext,
	table: string,
	doc: Record<string, unknown>,
): void {
	assertRLS(ctx, table, "read", doc);
}

/**
 * Convenience: assert that the authenticated user can insert this document.
 */
export function assertCanInsert(
	ctx: RLSContext,
	table: string,
	doc: Record<string, unknown>,
): void {
	assertRLS(ctx, table, "insert", doc);
}

/**
 * Convenience: assert that the authenticated user can modify this document.
 */
export function assertCanModify(
	ctx: RLSContext,
	table: string,
	doc: Record<string, unknown>,
): void {
	assertRLS(ctx, table, "modify", doc);
}

/**
 * Convenience: assert that the authenticated user can delete this document.
 */
export function assertCanDelete(
	ctx: RLSContext,
	table: string,
	doc: Record<string, unknown>,
): void {
	assertRLS(ctx, table, "delete", doc);
}
