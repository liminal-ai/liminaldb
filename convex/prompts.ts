import { mutation, query } from "./functions";
import { v } from "convex/values";
import * as Prompts from "./model/prompts";
import { validateApiKey, getApiKeyConfig } from "./auth/apiKey";

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
