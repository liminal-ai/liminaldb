/**
 * Wrapped Convex Functions with Trigger Support
 *
 * This module exports wrapped versions of mutation and internalMutation
 * that automatically run registered database triggers.
 *
 * USAGE: In mutation files, import from "./functions" instead of "./_generated/server"
 *
 * The wrapped functions have the same interface as the originals but
 * intercept ctx.db operations to fire triggers.
 *
 * IMPORTANT: Consider using ESLint no-restricted-imports rule to enforce this pattern.
 */

/* eslint-disable no-restricted-imports */
import {
	mutation as rawMutation,
	internalMutation as rawInternalMutation,
	query,
	internalQuery,
	action,
	internalAction,
} from "./_generated/server";
/* eslint-enable no-restricted-imports */

import {
	customCtx,
	customMutation,
} from "convex-helpers/server/customFunctions";
import { triggers } from "./triggers";

/**
 * Mutation wrapper that enables database triggers.
 * Use this instead of importing mutation from _generated/server.
 */
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

/**
 * Internal mutation wrapper that enables database triggers.
 * Use this instead of importing internalMutation from _generated/server.
 */
export const internalMutation = customMutation(
	rawInternalMutation,
	customCtx(triggers.wrapDB),
);

// Re-export unchanged functions for convenience
export { query, internalQuery, action, internalAction };
