import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { getRedis } from "../lib/redis";
import { authMiddleware } from "../middleware/auth";
import {
	DraftDTOSchema,
	DraftUpsertRequestSchema,
	type DraftDTO,
	type DraftUpsertRequest,
} from "../schemas/drafts";

const DRAFT_TTL_SECONDS = 24 * 60 * 60; // 24 hours
const INDEX_TTL_SECONDS = 25 * 60 * 60; // 25 hours (outlives all drafts)
const EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_DRAFT_ID_LENGTH = 100;

function getDraftKey(userId: string, draftId: string): string {
	return `liminal:draft:${userId}:${draftId}`;
}

function getDraftSetKey(userId: string): string {
	return `liminal:drafts:index:${userId}`;
}

/**
 * Register draft API routes.
 * Sets up endpoints for draft CRUD operations with authentication middleware.
 * @param fastify - The Fastify instance to register routes on
 */
export function registerDraftRoutes(fastify: FastifyInstance): void {
	fastify.get("/api/drafts", { preHandler: authMiddleware }, listDraftsHandler);
	fastify.get(
		"/api/drafts/summary",
		{ preHandler: authMiddleware },
		getDraftSummaryHandler,
	);
	fastify.put(
		"/api/drafts/:draftId",
		{ preHandler: authMiddleware },
		upsertDraftHandler,
	);
	fastify.delete(
		"/api/drafts/:draftId",
		{ preHandler: authMiddleware },
		deleteDraftHandler,
	);
}

/**
 * GET /api/drafts
 * List user's drafts sorted by updatedAt descending.
 * Returns empty array if no drafts exist.
 */
async function listDraftsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	try {
		const redis = getRedis();

		// Get all draft IDs for this user
		const draftIds = await redis.smembers(getDraftSetKey(userId));

		// Fetch all drafts in parallel
		const draftResults = await Promise.all(
			draftIds.map(async (draftId) => {
				const data = await redis.get(getDraftKey(userId, draftId));
				return { draftId, data };
			}),
		);

		// Process results and clean up expired entries
		const drafts: DraftDTO[] = [];
		const expiredIds: string[] = [];

		for (const { draftId, data } of draftResults) {
			if (data) {
				try {
					const draft = DraftDTOSchema.parse(JSON.parse(data));
					drafts.push(draft);
				} catch {
					// Invalid draft data, skip
				}
			} else {
				// Draft expired or missing, queue for removal
				expiredIds.push(draftId);
			}
		}

		// Remove expired entries in parallel
		if (expiredIds.length > 0) {
			await Promise.all(
				expiredIds.map((id) => redis.srem(getDraftSetKey(userId), id)),
			);
		}

		// Sort by updatedAt descending
		drafts.sort((a, b) => b.updatedAt - a.updatedAt);

		return reply.code(200).send(drafts);
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to list drafts");
		return reply.code(500).send({ error: "Failed to list drafts" });
	}
}

/**
 * GET /api/drafts/summary
 * Get draft summary for cross-tab indicator.
 * Returns count, latest draft ID, next expiry, and expiring soon flag.
 */
async function getDraftSummaryHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	try {
		const redis = getRedis();

		const draftIds = await redis.smembers(getDraftSetKey(userId));

		// Fetch all drafts in parallel
		const draftResults = await Promise.all(
			draftIds.map(async (draftId) => {
				const data = await redis.get(getDraftKey(userId, draftId));
				return { draftId, data };
			}),
		);

		let count = 0;
		let latestDraftId: string | undefined;
		let latestUpdatedAt = 0;
		let nextExpiryAt: number | undefined;
		let hasExpiringSoon = false;
		const now = Date.now();
		const expiredIds: string[] = [];

		for (const { draftId, data } of draftResults) {
			if (data) {
				try {
					const draft = DraftDTOSchema.parse(JSON.parse(data));
					count++;

					if (draft.updatedAt > latestUpdatedAt) {
						latestUpdatedAt = draft.updatedAt;
						latestDraftId = draft.draftId;
					}

					if (!nextExpiryAt || draft.expiresAt < nextExpiryAt) {
						nextExpiryAt = draft.expiresAt;
					}

					if (draft.expiresAt - now < EXPIRY_WARNING_MS) {
						hasExpiringSoon = true;
					}
				} catch {
					// Invalid draft, skip
				}
			} else {
				// Draft expired, queue for removal
				expiredIds.push(draftId);
			}
		}

		// Remove expired entries in parallel
		if (expiredIds.length > 0) {
			await Promise.all(
				expiredIds.map((id) => redis.srem(getDraftSetKey(userId), id)),
			);
		}

		return reply.code(200).send({
			count,
			latestDraftId,
			nextExpiryAt,
			hasExpiringSoon,
		});
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to get draft summary");
		return reply.code(500).send({ error: "Failed to get draft summary" });
	}
}

/**
 * PUT /api/drafts/:draftId
 * Create/update draft with 24-hour TTL.
 * Preserves createdAt timestamp when updating existing draft.
 */
async function upsertDraftHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { draftId } = request.params as { draftId: string };

	if (draftId.length > MAX_DRAFT_ID_LENGTH) {
		return reply.code(400).send({ error: "Draft ID too long" });
	}

	let body: DraftUpsertRequest;
	try {
		body = DraftUpsertRequestSchema.parse(request.body);
	} catch (error) {
		if (error instanceof ZodError) {
			const issues = error.issues ?? [];
			const firstIssue = issues[0];
			const errorMessage = firstIssue?.message ?? "Validation failed";
			return reply.code(400).send({ error: errorMessage });
		}
		throw error;
	}

	try {
		const redis = getRedis();

		const now = Date.now();
		const key = getDraftKey(userId, draftId);

		// Check for existing draft
		const existingData = await redis.get(key);
		let createdAt = now;

		if (existingData) {
			try {
				const existing = DraftDTOSchema.parse(JSON.parse(existingData));
				createdAt = existing.createdAt;
			} catch {
				// Invalid existing data, use new timestamp
			}
		}

		const draft: DraftDTO = {
			draftId,
			type: body.type,
			promptSlug: body.promptSlug,
			data: body.data,
			createdAt,
			updatedAt: now,
			expiresAt: now + DRAFT_TTL_SECONDS * 1000,
		};

		// Store draft with TTL
		await redis.set(key, JSON.stringify(draft), DRAFT_TTL_SECONDS);

		// Add to user's draft set and refresh index TTL
		// Note: Not using MULTI/EXEC - if crash occurs between operations,
		// orphaned drafts are cleaned up by listDrafts/getSummary on next access
		const indexKey = getDraftSetKey(userId);
		await redis.sadd(indexKey, draftId);
		await redis.expire(indexKey, INDEX_TTL_SECONDS);

		return reply.code(200).send(draft);
	} catch (error) {
		request.log.error(
			{ err: error, userId, draftId },
			"Failed to upsert draft",
		);
		return reply.code(500).send({ error: "Failed to save draft" });
	}
}

/**
 * DELETE /api/drafts/:draftId
 * Remove draft from Redis.
 * Removes both the draft data and the index entry.
 */
async function deleteDraftHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { draftId } = request.params as { draftId: string };

	if (draftId.length > MAX_DRAFT_ID_LENGTH) {
		return reply.code(400).send({ error: "Draft ID too long" });
	}

	try {
		const redis = getRedis();

		const key = getDraftKey(userId, draftId);

		// Remove draft data
		const deleted = await redis.del(key);

		// Remove from user's draft set
		await redis.srem(getDraftSetKey(userId), draftId);

		return reply.code(200).send({ deleted: deleted > 0 });
	} catch (error) {
		request.log.error(
			{ err: error, userId, draftId },
			"Failed to delete draft",
		);
		return reply.code(500).send({ error: "Failed to delete draft" });
	}
}
