/**
 * Error codes for LiminalDB.
 *
 * Convex functions throw ConvexError({ code, ... }) for structured errors.
 * Client-side code checks error.data.code instead of fragile string matching.
 *
 * Usage in Convex:
 *   import { ConvexError } from "convex/values";
 *   throw new ConvexError({ code: ERROR_CODES.DUPLICATE_SLUG, slug });
 *
 * Usage in service layer:
 *   import { ConvexError } from "convex/values";
 *   if (error instanceof ConvexError && error.data.code === ERROR_CODES.DUPLICATE_SLUG) { ... }
 */
export const ERROR_CODES = {
	DUPLICATE_SLUG: "DUPLICATE_SLUG",
	DUPLICATE_SLUG_IN_BATCH: "DUPLICATE_SLUG_IN_BATCH",
	MAX_PROMPTS_EXCEEDED: "MAX_PROMPTS_EXCEEDED",
	PROMPT_NOT_FOUND: "PROMPT_NOT_FOUND",
	RLS_VIOLATION: "RLS_VIOLATION",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
