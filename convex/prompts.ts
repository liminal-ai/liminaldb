import { mutation, query } from "./functions";
import { v } from "convex/values";
import * as Prompts from "./model/prompts";
import { validateApiKey, getApiKeyConfig } from "./auth/apiKey";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Shared schema for prompt parameters */
const parameterSchema = v.array(
	v.object({
		name: v.string(),
		type: v.union(
			v.literal("string"),
			v.literal("string[]"),
			v.literal("number"),
			v.literal("boolean"),
		),
		required: v.boolean(),
		description: v.optional(v.string()),
	}),
);

export const insertPrompts = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		prompts: v.array(
			v.object({
				slug: v.string(),
				name: v.string(),
				description: v.string(),
				content: v.string(),
				tags: v.array(v.string()),
				parameters: v.optional(parameterSchema),
			}),
		),
	},
	returns: v.array(v.id("prompts")),
	handler: async (ctx, { apiKey, userId, prompts }) => {
		const config = await getApiKeyConfig(ctx);
		if (!validateApiKey(apiKey, config)) {
			console.error("API key validation failed", {
				operation: "insertPrompts",
				timestamp: Date.now(),
			});
			throw new Error("Invalid API key");
		}
		return Prompts.insertMany(ctx, userId, prompts);
	},
});

export const getPromptBySlug = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		slug: v.string(),
	},
	returns: v.union(
		v.null(),
		v.object({
			slug: v.string(),
			name: v.string(),
			description: v.string(),
			content: v.string(),
			tags: v.array(v.string()),
			parameters: v.optional(parameterSchema),
		}),
	),
	handler: async (ctx, { apiKey, userId, slug }) => {
		const config = await getApiKeyConfig(ctx);
		if (!validateApiKey(apiKey, config)) {
			console.error("API key validation failed", {
				operation: "getPromptBySlug",
				timestamp: Date.now(),
			});
			throw new Error("Invalid API key");
		}
		return Prompts.getBySlug(ctx, userId, slug);
	},
});

export const listPrompts = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		query: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	returns: v.array(
		v.object({
			slug: v.string(),
			name: v.string(),
			description: v.string(),
			content: v.string(),
			tags: v.array(v.string()),
			parameters: v.optional(parameterSchema),
		}),
	),
	handler: async (ctx, { apiKey, userId, query, limit }) => {
		const config = await getApiKeyConfig(ctx);
		if (!validateApiKey(apiKey, config)) {
			console.error("API key validation failed", {
				operation: "listPrompts",
				timestamp: Date.now(),
			});
			throw new Error("Invalid API key");
		}
		// Clamp limit to reasonable bounds (1-1000)
		const safeLimit =
			limit !== undefined ? Math.max(1, Math.min(limit, 1000)) : undefined;
		return Prompts.listByUser(ctx, userId, { query, limit: safeLimit });
	},
});

export const updatePromptBySlug = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		slug: v.string(),
		updates: v.object({
			slug: v.string(),
			name: v.string(),
			description: v.string(),
			content: v.string(),
			tags: v.array(v.string()),
			parameters: v.optional(parameterSchema),
		}),
	},
	returns: v.boolean(),
	handler: async (ctx, { apiKey, userId, slug, updates }) => {
		const config = await getApiKeyConfig(ctx);
		if (!validateApiKey(apiKey, config)) {
			console.error("API key validation failed", {
				operation: "updatePromptBySlug",
				timestamp: Date.now(),
			});
			throw new Error("Invalid API key");
		}
		return Prompts.updateBySlug(ctx, userId, slug, updates);
	},
});

export const deletePromptBySlug = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		slug: v.string(),
	},
	returns: v.boolean(),
	handler: async (ctx, { apiKey, userId, slug }) => {
		const config = await getApiKeyConfig(ctx);
		if (!validateApiKey(apiKey, config)) {
			console.error("API key validation failed", {
				operation: "deletePromptBySlug",
				timestamp: Date.now(),
			});
			throw new Error("Invalid API key");
		}
		return Prompts.deleteBySlug(ctx, userId, slug);
	},
});

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

// Epic 02: Search & Select (Story 1)

const promptDtoV2Schema = v.object({
	slug: v.string(),
	name: v.string(),
	description: v.string(),
	content: v.string(),
	tags: v.array(v.string()),
	parameters: v.optional(parameterSchema),
	pinned: v.boolean(),
	favorited: v.boolean(),
	usageCount: v.number(),
	lastUsedAt: v.optional(v.number()),
});

export const listPromptsRanked = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		tags: v.optional(v.array(v.string())),
		limit: v.optional(v.number()),
	},
	returns: v.array(promptDtoV2Schema),
	handler: async (ctx, { apiKey, userId, tags, limit }) => {
		await assertValidApiKey(ctx, apiKey, "listPromptsRanked");
		const safeLimit =
			limit !== undefined ? Math.max(1, Math.min(limit, 1000)) : undefined;
		return Prompts.listPromptsRanked(ctx, userId, {
			limit: safeLimit,
			tags: tags ?? undefined,
		});
	},
});

export const searchPrompts = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		query: v.string(),
		tags: v.optional(v.array(v.string())),
		limit: v.optional(v.number()),
	},
	returns: v.array(promptDtoV2Schema),
	handler: async (ctx, { apiKey, userId, query, tags, limit }) => {
		await assertValidApiKey(ctx, apiKey, "searchPrompts");
		const safeLimit =
			limit !== undefined ? Math.max(1, Math.min(limit, 1000)) : undefined;
		return Prompts.searchPrompts(
			ctx,
			userId,
			query,
			tags ?? undefined,
			safeLimit,
		);
	},
});

export const updatePromptFlags = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		slug: v.string(),
		pinned: v.optional(v.boolean()),
		favorited: v.optional(v.boolean()),
	},
	returns: v.boolean(),
	handler: async (ctx, { apiKey, userId, slug, pinned, favorited }) => {
		await assertValidApiKey(ctx, apiKey, "updatePromptFlags");
		return Prompts.updatePromptFlags(ctx, userId, slug, { pinned, favorited });
	},
});

export const trackPromptUse = mutation({
	args: {
		apiKey: v.string(),
		userId: v.string(),
		slug: v.string(),
	},
	returns: v.boolean(),
	handler: async (ctx, { apiKey, userId, slug }) => {
		await assertValidApiKey(ctx, apiKey, "trackPromptUse");
		return Prompts.trackPromptUse(ctx, userId, slug);
	},
});

export const listTags = query({
	args: {
		apiKey: v.string(),
		userId: v.string(), // Kept for API consistency, not used (tags are global)
	},
	returns: v.object({
		purpose: v.array(v.string()),
		domain: v.array(v.string()),
		task: v.array(v.string()),
	}),
	handler: async (ctx, { apiKey }) => {
		await assertValidApiKey(ctx, apiKey, "listTags");
		return Prompts.listTags(ctx);
	},
});
