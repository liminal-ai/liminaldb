import { mutation, query } from "./functions";
import { v } from "convex/values";
import { validateApiKey, getApiKeyConfig } from "./auth/apiKey";
import type { MutationCtx, QueryCtx } from "./_generated/server";

const surfaceSchema = v.union(
	v.literal("webapp"),
	v.literal("chatgpt"),
	v.literal("vscode"),
);

const themeSchema = v.union(
	v.literal("light-1"),
	v.literal("light-2"),
	v.literal("light-3"),
	v.literal("dark-1"),
	v.literal("dark-2"),
	v.literal("dark-3"),
);

type ThemeId =
	| "light-1"
	| "light-2"
	| "light-3"
	| "dark-1"
	| "dark-2"
	| "dark-3";

async function assertValidApiKey(
	ctx: QueryCtx | MutationCtx,
	apiKey: string,
	operation: string,
): Promise<void> {
	const config = await getApiKeyConfig(ctx);
	if (!validateApiKey(apiKey, config)) {
		console.error("API key validation failed", {
			operation,
			timestamp: Date.now(),
		});
		throw new Error("Invalid API key");
	}
}

/**
 * Get theme preference for a specific surface
 */
export const getThemePreference = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		surface: surfaceSchema,
	},
	returns: v.union(v.null(), themeSchema),
	handler: async (ctx, { apiKey, userId, surface }) => {
		await assertValidApiKey(ctx, apiKey, "getThemePreference");

		const prefs = await ctx.db
			.query("userPreferences")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!prefs) {
			return null;
		}

		const theme = prefs.themes[surface];
		return theme as ThemeId | null;
	},
});

/**
 * Update theme preference for a specific surface.
 *
 * Note on concurrency: Convex mutations are transactional. If two mutations
 * conflict (e.g., updating different surfaces for the same user simultaneously),
 * Convex serializes them using Optimistic Concurrency Control - one commits,
 * the other retries with fresh data. This ensures the spread operator sees
 * the latest committed themes, preventing lost updates.
 */
export const updateThemePreference = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		surface: surfaceSchema,
		theme: themeSchema,
	},
	returns: v.boolean(),
	handler: async (ctx, { apiKey, userId, surface, theme }) => {
		await assertValidApiKey(ctx, apiKey, "updateThemePreference");

		const existing = await ctx.db
			.query("userPreferences")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, {
				themes: {
					...existing.themes,
					[surface]: theme,
				},
			});
		} else {
			await ctx.db.insert("userPreferences", {
				userId,
				themes: {
					[surface]: theme,
				},
			});
		}

		return true;
	},
});

/**
 * Get all preferences for a user (used for caching on auth)
 */
export const getAllPreferences = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
	},
	returns: v.union(
		v.null(),
		v.object({
			themes: v.object({
				webapp: v.optional(themeSchema),
				chatgpt: v.optional(themeSchema),
				vscode: v.optional(themeSchema),
			}),
		}),
	),
	handler: async (ctx, { apiKey, userId }) => {
		await assertValidApiKey(ctx, apiKey, "getAllPreferences");

		const prefs = await ctx.db
			.query("userPreferences")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();

		if (!prefs) {
			return null;
		}

		return {
			themes: prefs.themes as {
				webapp?: ThemeId;
				chatgpt?: ThemeId;
				vscode?: ThemeId;
			},
		};
	},
});
