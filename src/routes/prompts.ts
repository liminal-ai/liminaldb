import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import {
	CreatePromptsRequestSchema,
	type CreatePromptsRequest,
	SLUG_REGEX,
	LIMITS,
} from "../schemas/prompts";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { config } from "../lib/config";

/**
 * Validate a slug parameter against the shared slug regex and length limits
 * Returns an error message if invalid, undefined if valid
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

export function registerPromptRoutes(fastify: FastifyInstance): void {
	// All routes require authentication (inline preHandler matches existing patterns)
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
	fastify.delete(
		"/api/prompts/:slug",
		{ preHandler: authMiddleware },
		deletePromptHandler,
	);
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
		throw error;
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

	// Call Convex mutation
	const deleted = await convex.mutation(api.prompts.deletePromptBySlug, {
		apiKey: config.convexApiKey,
		userId,
		slug,
	});

	return reply.code(200).send({ deleted });
}
