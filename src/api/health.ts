import type { FastifyInstance } from "fastify";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { authMiddleware } from "../middleware/auth";
import { config } from "../lib/config";

export function registerHealthRoutes(fastify: FastifyInstance): void {
	// Public health check (no auth)
	// Returns 503 if Convex is unavailable so Fly.io knows the app is unhealthy
	fastify.get("/health", async (_request, reply) => {
		try {
			const convexHealth = await convex.query(api.health.check);
			if (convexHealth.status !== "ok") {
				reply.status(503);
				return {
					status: "unhealthy",
					timestamp: new Date().toISOString(),
					convex: "error",
				};
			}
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				convex: "connected",
			};
		} catch (error) {
			reply.status(503);
			return {
				status: "unhealthy",
				timestamp: new Date().toISOString(),
				convex: "disconnected",
				error: error instanceof Error ? error.message : "unknown",
			};
		}
	});

	// Auth-required health check - calls Convex with API key + userId
	fastify.get(
		"/api/health",
		{ preHandler: authMiddleware },
		async (request, _reply) => {
			// authMiddleware guarantees request.user exists (rejects with 401 otherwise)
			const user = request.user!;
			try {
				// Use new pattern: pass apiKey + userId to Convex
				const convexHealth = await convex.query(api.healthAuth.check, {
					apiKey: config.convexApiKey,
					userId: user.id,
				});

				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user,
					convex: "authenticated",
					convexUser: convexHealth.user,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "unknown";
				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user,
					convex: "auth-failed",
					error: errorMessage,
				};
			}
		},
	);
}
