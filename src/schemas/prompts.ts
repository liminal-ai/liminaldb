import { z } from "zod";

// Slug: lowercase, numbers, dashes. No colons (reserved for namespacing).
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Global shared tags - must match convex/model/tagConstants.ts
export const GLOBAL_TAG_NAMES = [
	// Purpose
	"instruction",
	"reference",
	"persona",
	"workflow",
	"snippet",
	// Domain
	"code",
	"writing",
	"analysis",
	"planning",
	"design",
	"data",
	"communication",
	// Task
	"review",
	"summarize",
	"explain",
	"debug",
	"transform",
	"extract",
	"translate",
] as const;

export type GlobalTagName = (typeof GLOBAL_TAG_NAMES)[number];

// Validation limits
export const LIMITS = {
	SLUG_MAX_LENGTH: 200,
	NAME_MAX_LENGTH: 200,
	DESCRIPTION_MAX_LENGTH: 2000,
	CONTENT_MAX_LENGTH: 100000,
	TAG_NAME_MAX_LENGTH: 100,
	MAX_TAGS_PER_PROMPT: 50,
} as const;

/**
 * Parameter schema for prompt templates
 */
export const ParameterSchema = z.object({
	name: z.string().min(1, "Parameter name required"),
	type: z.enum(["string", "string[]", "number", "boolean"]),
	required: z.boolean(),
	description: z.string().optional(),
});

/**
 * Standalone slug schema for parameter validation (GET/DELETE endpoints)
 */
export const SlugSchema = z
	.string()
	.min(1, "Slug required")
	.max(LIMITS.SLUG_MAX_LENGTH, `Slug max ${LIMITS.SLUG_MAX_LENGTH} chars`)
	.regex(
		SLUG_REGEX,
		"Slug must be lowercase letters, numbers, dashes only. Colons reserved for namespacing.",
	);

/**
 * Single prompt input schema
 */
export const PromptInputSchema = z.object({
	slug: SlugSchema,
	name: z
		.string()
		.min(1, "Name required")
		.max(LIMITS.NAME_MAX_LENGTH, `Name max ${LIMITS.NAME_MAX_LENGTH} chars`),
	description: z
		.string()
		.min(1, "Description required")
		.max(
			LIMITS.DESCRIPTION_MAX_LENGTH,
			`Description max ${LIMITS.DESCRIPTION_MAX_LENGTH} chars`,
		),
	content: z
		.string()
		.min(1, "Content required")
		.max(
			LIMITS.CONTENT_MAX_LENGTH,
			`Content max ${LIMITS.CONTENT_MAX_LENGTH} chars`,
		),
	tags: z
		.array(z.enum(GLOBAL_TAG_NAMES))
		.max(LIMITS.MAX_TAGS_PER_PROMPT, `Max ${LIMITS.MAX_TAGS_PER_PROMPT} tags`)
		// Silently deduplicate tags - ["foo", "foo"] becomes ["foo"]
		.transform((tags) => [...new Set(tags)]),
	parameters: z.array(ParameterSchema).optional(),
});

/**
 * Request body for creating prompts (batch)
 */
export const CreatePromptsRequestSchema = z.object({
	prompts: z
		.array(PromptInputSchema)
		.min(1, "At least one prompt required")
		.max(100, "Maximum 100 prompts per batch"),
});

/**
 * Prompt DTO returned from queries
 * Note: Maps storage `tagNames` to API `tags`
 */
export const PromptDTOSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string(),
	content: z.string(),
	tags: z.array(z.string()),
	parameters: z.array(ParameterSchema).optional(),
});

// TypeScript types derived from Zod
export type Parameter = z.infer<typeof ParameterSchema>;
export type PromptInput = z.infer<typeof PromptInputSchema>;
export type CreatePromptsRequest = z.infer<typeof CreatePromptsRequestSchema>;
export type PromptDTO = z.infer<typeof PromptDTOSchema>;

// Epic 02: Search & Select additions

export const PromptMetaSchema = z.object({
	pinned: z.boolean(),
	favorited: z.boolean(),
	usageCount: z.number(),
	lastUsedAt: z.number().optional(),
});

export type PromptMeta = z.infer<typeof PromptMetaSchema>;

export const PromptDTOv2Schema = PromptInputSchema.extend({
	pinned: z.boolean(),
	favorited: z.boolean(),
	usageCount: z.number(),
	lastUsedAt: z.number().optional(),
});

export type PromptDTOv2 = z.infer<typeof PromptDTOv2Schema>;

export const RankingWeightsSchema = z.object({
	usage: z.number(),
	recency: z.number(),
	favorite: z.number(),
	pinned: z.number(),
	halfLifeDays: z.number(),
});

export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const RankingConfigSchema = z.object({
	weights: RankingWeightsSchema,
	searchRerankLimit: z.number(),
});

export type RankingConfig = z.infer<typeof RankingConfigSchema>;

export const FlagsPatchSchema = z.object({
	pinned: z.boolean().optional(),
	favorited: z.boolean().optional(),
});

export type FlagsPatch = z.infer<typeof FlagsPatchSchema>;
