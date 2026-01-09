import { z } from "zod";

export const DraftTypeSchema = z.enum(["edit", "new", "line"]);
export type DraftType = z.infer<typeof DraftTypeSchema>;

export const DraftDataSchema = z.object({
	slug: z.string(),
	name: z.string(),
	description: z.string(),
	content: z.string(),
	tags: z.array(z.string()),
});

export const DraftDTOSchema = z.object({
	draftId: z.string(),
	type: DraftTypeSchema,
	promptSlug: z.string().optional(),
	data: DraftDataSchema,
	createdAt: z.number(),
	updatedAt: z.number(),
	expiresAt: z.number(),
});

export type DraftDTO = z.infer<typeof DraftDTOSchema>;

export const DraftUpsertRequestSchema = z.object({
	type: DraftTypeSchema,
	promptSlug: z.string().optional(),
	data: DraftDataSchema,
});

export type DraftUpsertRequest = z.infer<typeof DraftUpsertRequestSchema>;

export const DraftSummarySchema = z.object({
	count: z.number(),
	latestDraftId: z.string().optional(),
	nextExpiryAt: z.number().optional(),
	hasExpiringSoon: z.boolean(),
});

export type DraftSummary = z.infer<typeof DraftSummarySchema>;
