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
