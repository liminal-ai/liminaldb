import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
	users: defineTable({
		userId: v.string(),
		email: v.string(),
	}).index("by_userId", ["userId"]),

	tags: defineTable({
		userId: v.string(), // External auth ID
		name: v.string(),
	}).index("by_user_name", ["userId", "name"]),

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
	})
		.index("by_user_slug", ["userId", "slug"])
		.index("by_user", ["userId"]),
});
