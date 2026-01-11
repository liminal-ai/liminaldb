import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { authMiddleware } from "../middleware/auth";
import {
	DEFAULT_THEME,
	GetPreferencesQuerySchema,
	UpdatePreferencesRequestSchema,
	type SurfaceId,
	type ThemeId,
} from "../schemas/preferences";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import {
	getCachedPreferences,
	setCachedPreferences,
	invalidateCachedPreferences,
} from "../lib/redis";
import { config } from "../lib/config";

/**
 * Register preferences API routes.
 * @param fastify - The Fastify instance to register routes on
 */
export function registerPreferencesRoutes(fastify: FastifyInstance): void {
	fastify.get(
		"/api/preferences",
		{ preHandler: authMiddleware },
		getPreferencesHandler,
	);
	fastify.put(
		"/api/preferences",
		{ preHandler: authMiddleware },
		updatePreferencesHandler,
	);
}

/**
 * GET /api/preferences?surface=webapp
 * Get theme preference for a specific surface.
 * Returns default theme if no preference set.
 */
async function getPreferencesHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	let query: { surface: SurfaceId };
	try {
		query = GetPreferencesQuerySchema.parse(request.query);
	} catch (error) {
		if (error instanceof ZodError) {
			// Surface is the only query param, so any validation error is invalid surface
			return reply.code(400).send({ error: "Invalid surface" });
		}
		return reply.code(400).send({ error: "Invalid surface" });
	}

	const { surface } = query;

	try {
		// Try Redis cache first
		const cached = await getCachedPreferences(userId);
		if (cached?.themes?.[surface]) {
			return reply.send({ theme: cached.themes[surface] });
		}

		// Cache miss - fetch all preferences from Convex and warm cache
		const allPrefs = await convex.query(api.userPreferences.getAllPreferences, {
			apiKey: config.convexApiKey,
			userId,
		});

		// Warm cache with all preferences for future requests
		if (allPrefs) {
			await setCachedPreferences(userId, {
				themes: allPrefs.themes as {
					webapp?: string;
					chatgpt?: string;
					vscode?: string;
				},
			});
		}

		// Return theme for requested surface or default
		const theme = allPrefs?.themes?.[surface];
		return reply.send({ theme: theme ?? DEFAULT_THEME });
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to get preferences");
		return reply.code(500).send({ error: "Failed to get preferences" });
	}
}

/**
 * PUT /api/preferences
 * Update theme preference for a specific surface.
 */
async function updatePreferencesHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	let body: { surface: SurfaceId; theme: ThemeId };
	try {
		body = UpdatePreferencesRequestSchema.parse(request.body);
	} catch (error) {
		if (error instanceof ZodError) {
			const firstIssue = error.issues[0];
			// Map field to appropriate error message
			const field = firstIssue?.path[0];
			if (field === "surface") {
				return reply.code(400).send({ error: "Invalid surface" });
			}
			if (field === "theme") {
				return reply.code(400).send({ error: "Invalid theme" });
			}
			return reply.code(400).send({ error: "Invalid request" });
		}
		return reply.code(400).send({ error: "Validation failed" });
	}

	const { surface, theme } = body;

	try {
		// Update in Convex
		await convex.mutation(api.userPreferences.updateThemePreference, {
			apiKey: config.convexApiKey,
			userId,
			surface,
			theme,
		});

		// Invalidate Redis cache
		await invalidateCachedPreferences(userId);

		return reply.send({ updated: true });
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to update preferences");
		return reply.code(500).send({ error: "Failed to update preferences" });
	}
}
