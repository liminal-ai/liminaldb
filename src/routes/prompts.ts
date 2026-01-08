import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import {
	CreatePromptsRequestSchema,
	type CreatePromptsRequest,
	PromptInputSchema,
	type PromptInput,
	SLUG_REGEX,
	LIMITS,
} from "../schemas/prompts";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { config } from "../lib/config";

/**
 * Validate a slug parameter against the shared slug regex and length limits.
 * @param slug - The slug string to validate
 * @returns Error message if invalid, undefined if valid
 */
function validateSlugParam(slug: string): string | undefined {
	if (!slug || slug.length === 0) {
		return "Slug required";
	}
	if (slug.length > LIMITS.SLUG_MAX_LENGTH) {
		return `Slug max ${LIMITS.SLUG_MAX_LENGTH} chars`;
	}
	if (!SLUG_REGEX.test(slug)) {
		return "Invalid slug format";
	}
	return undefined;
}

/**
 * Register prompt API routes.
 * Sets up CRUD endpoints for prompts with authentication middleware.
 * @param fastify - The Fastify instance to register routes on
 */
export function registerPromptRoutes(fastify: FastifyInstance): void {
	// All routes require authentication (inline preHandler matches existing patterns)
	fastify.get(
		"/api/prompts",
		{ preHandler: authMiddleware },
		listPromptsHandler,
	);
	fastify.get(
		"/api/prompts/tags",
		{ preHandler: authMiddleware },
		listTagsHandler,
	);
	fastify.post(
		"/api/prompts",
		{ preHandler: authMiddleware },
		createPromptsHandler,
	);
	fastify.get(
		"/api/prompts/:slug",
		{ preHandler: authMiddleware },
		getPromptHandler,
	);
	fastify.put(
		"/api/prompts/:slug",
		{ preHandler: authMiddleware },
		updatePromptHandler,
	);
	fastify.delete(
		"/api/prompts/:slug",
		{ preHandler: authMiddleware },
		deletePromptHandler,
	);
}

/**
 * GET /api/prompts
 * List prompts with optional search and tag filtering
 */
async function listPromptsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { q, limit, tags } = request.query as {
		q?: string;
		limit?: string;
		tags?: string;
	};

	try {
		const prompts = await convex.query(api.prompts.listPrompts, {
			apiKey: config.convexApiKey,
			userId,
			query: q,
			limit: limit ? parseInt(limit, 10) : undefined,
		});

		// TODO: Tag filtering is done post-fetch which is inefficient for large
		// collections. Consider pushing filter logic to Convex query layer.
		let filtered = prompts;
		if (tags) {
			const tagList = tags
				.split(",")
				.map((t) => t.trim().toLowerCase())
				.filter((t) => t.length > 0 && t.length <= 50) // Validate tag length
				.slice(0, 20); // Limit to 20 tags max
			filtered = prompts.filter((prompt) =>
				tagList.some((tag) => prompt.tags.some((t) => t.toLowerCase() === tag)),
			);
		}

		return reply.code(200).send(filtered);
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to list prompts");
		return reply.code(500).send({ error: "Failed to list prompts" });
	}
}

/**
 * GET /api/prompts/tags
 * Get all unique tags for the user's prompts
 *
 * TODO: For large prompt collections, this is inefficient as it fetches
 * all prompts to extract tags. Consider adding a dedicated Convex query
 * that aggregates tags server-side.
 */
async function listTagsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	try {
		const prompts = await convex.query(api.prompts.listPrompts, {
			apiKey: config.convexApiKey,
			userId,
		});

		// Extract unique tags and sort alphabetically
		const allTags = prompts.flatMap((p) => p.tags);
		const uniqueTags = [...new Set(allTags)].sort((a, b) =>
			a.toLowerCase().localeCompare(b.toLowerCase()),
		);

		return reply.code(200).send(uniqueTags);
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to list tags");
		return reply.code(500).send({ error: "Failed to list tags" });
	}
}

/**
 * POST /api/prompts
 * Create one or more prompts
 */
async function createPromptsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Validate request body with Zod
	let validated: CreatePromptsRequest;
	try {
		validated = CreatePromptsRequestSchema.parse(request.body);
	} catch (error) {
		if (error instanceof ZodError) {
			// Extract first error message for response (Zod v4 uses `issues`)
			const issues = error.issues ?? [];
			const firstIssue = issues[0];
			const errorMessage = firstIssue?.message ?? "Validation failed";
			return reply.code(400).send({ error: errorMessage });
		}
		throw error;
	}

	// Get user ID from authenticated session
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	try {
		// Call Convex mutation
		const ids = await convex.mutation(api.prompts.insertPrompts, {
			apiKey: config.convexApiKey,
			userId,
			prompts: validated.prompts,
		});

		return reply.code(201).send({ ids });
	} catch (error) {
		// Check for duplicate slug error - sanitize to avoid leaking internal details
		if (error instanceof Error && error.message.includes("already exists")) {
			return reply.code(409).send({ error: "Slug already exists" });
		}
		request.log.error({ err: error, userId }, "Failed to create prompts");
		return reply.code(500).send({ error: "Failed to create prompts" });
	}
}

/**
 * GET /api/prompts/:slug
 * Get a single prompt by slug
 */
async function getPromptHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Get user ID from authenticated session
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { slug } = request.params as { slug: string };

	// Validate slug parameter
	const slugError = validateSlugParam(slug);
	if (slugError) {
		return reply.code(400).send({ error: slugError });
	}

	try {
		// Call Convex query
		const prompt = await convex.query(api.prompts.getPromptBySlug, {
			apiKey: config.convexApiKey,
			userId,
			slug,
		});

		if (!prompt) {
			return reply.code(404).send({ error: "Prompt not found" });
		}

		// Return DTO (Convex already returns the correct shape)
		return reply.code(200).send(prompt);
	} catch (error) {
		request.log.error({ err: error, slug, userId }, "Failed to get prompt");
		return reply.code(500).send({ error: "Failed to get prompt" });
	}
}

/**
 * PUT /api/prompts/:slug
 * Update a prompt by slug
 */
async function updatePromptHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Get user ID from authenticated session
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { slug } = request.params as { slug: string };

	// Validate slug parameter
	const slugError = validateSlugParam(slug);
	if (slugError) {
		return reply.code(400).send({ error: slugError });
	}

	// Validate request body with Zod
	let validated: PromptInput;
	try {
		validated = PromptInputSchema.parse(request.body);
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
		// Call Convex mutation
		const updated = await convex.mutation(api.prompts.updatePromptBySlug, {
			apiKey: config.convexApiKey,
			userId,
			slug,
			updates: validated,
		});

		if (!updated) {
			return reply.code(404).send({ error: "Prompt not found" });
		}

		return reply.code(200).send({ updated });
	} catch (error) {
		// Check for duplicate slug error on rename
		if (error instanceof Error && error.message.includes("already exists")) {
			return reply.code(409).send({ error: "Slug already exists" });
		}
		request.log.error({ err: error, slug, userId }, "Failed to update prompt");
		return reply.code(500).send({ error: "Failed to update prompt" });
	}
}

/**
 * DELETE /api/prompts/:slug
 * Delete a prompt by slug
 */
async function deletePromptHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Get user ID from authenticated session
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const { slug } = request.params as { slug: string };

	// Validate slug parameter
	const slugError = validateSlugParam(slug);
	if (slugError) {
		return reply.code(400).send({ error: slugError });
	}

	try {
		// Call Convex mutation
		const deleted = await convex.mutation(api.prompts.deletePromptBySlug, {
			apiKey: config.convexApiKey,
			userId,
			slug,
		});

		return reply.code(200).send({ deleted });
	} catch (error) {
		request.log.error({ err: error, slug, userId }, "Failed to delete prompt");
		return reply.code(500).send({ error: "Failed to delete prompt" });
	}
}
