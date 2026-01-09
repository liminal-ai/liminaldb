import type { FastifyPluginAsync } from "fastify";
import { NotImplementedError } from "../lib/redis";

export const draftsRoutes: FastifyPluginAsync = async (fastify) => {
	// GET /api/drafts - List user's drafts
	fastify.get("/", async () => {
		throw new NotImplementedError("listDrafts not implemented");
	});

	// GET /api/drafts/summary - Draft summary for indicator
	fastify.get("/summary", async () => {
		throw new NotImplementedError("getDraftSummary not implemented");
	});

	// PUT /api/drafts/:draftId - Create/update draft
	fastify.put("/:draftId", async () => {
		throw new NotImplementedError("upsertDraft not implemented");
	});

	// DELETE /api/drafts/:draftId - Remove draft
	fastify.delete("/:draftId", async () => {
		throw new NotImplementedError("deleteDraft not implemented");
	});
};
