import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		userId: v.string(),
		email: v.string(),
	}).index("by_userId", ["userId"]),

	tags: defineTable({
		name: v.string(),
		dimension: v.union(
			v.literal("purpose"),
			v.literal("domain"),
			v.literal("task"),
		),
	})
		.index("by_name", ["name"])
		.index("by_dimension", ["dimension"]),

	promptTags: defineTable({
		promptId: v.id("prompts"),
		tagId: v.id("tags"),
	})
		.index("by_prompt", ["promptId"])
		.index("by_tag", ["tagId"]),

	prompts: defineTable({
		userId: v.string(), // External auth ID
		slug: v.string(),
		name: v.string(),
		description: v.string(),
		content: v.string(),
		// Denormalized for fast queries. Sync via helper functions.
		tagNames: v.array(v.string()),
		parameters: v.optional(
			v.array(
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
			),
		),
		// NEW fields (optional during migration)
		searchText: v.optional(v.string()),
		pinned: v.optional(v.boolean()),
		favorited: v.optional(v.boolean()),
		usageCount: v.optional(v.number()),
		lastUsedAt: v.optional(v.number()),
	})
		.index("by_user_slug", ["userId", "slug"])
		.index("by_user", ["userId"])
		// Full-text search index for prompt content.
		// staged: false = synchronous indexing (immediate consistency).
		// For large migrations (10K+ prompts), consider staged: true to avoid
		// blocking deployments. Current scale doesn't require this.
		.searchIndex("search_prompts", {
			searchField: "searchText",
			filterFields: ["userId"],
		}),

	rankingConfig: defineTable({
		key: v.string(),
		weights: v.object({
			usage: v.number(),
			recency: v.number(),
			favorite: v.number(),
			pinned: v.number(),
			halfLifeDays: v.number(),
		}),
		searchRerankLimit: v.number(),
	}).index("by_key", ["key"]),

	userPreferences: defineTable({
		userId: v.string(),
		themes: v.object({
			webapp: v.optional(v.string()),
			chatgpt: v.optional(v.string()),
			vscode: v.optional(v.string()),
		}),
	}).index("by_user", ["userId"]),
});
