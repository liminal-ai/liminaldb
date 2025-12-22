import type { FastifyInstance } from "fastify";
import { convex, createAuthenticatedClient } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { authMiddleware } from "../middleware/auth";

export function registerHealthRoutes(fastify: FastifyInstance): void {
	// Public health check (no auth)
	fastify.get("/health", async (_request, _reply) => {
		try {
			const convexHealth = await convex.query(api.health.check);
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				convex: convexHealth.status === "ok" ? "connected" : "error",
			};
		} catch (_error) {
			return {
				status: "ok",
				timestamp: new Date().toISOString(),
				convex: "disconnected",
			};
		}
	});

	// Auth-required health check - calls Convex with JWT passthrough
	fastify.get(
		"/api/health",
		{ preHandler: authMiddleware },
		async (request, _reply) => {
			try {
				if (!request.accessToken) {
					return {
						status: "ok",
						timestamp: new Date().toISOString(),
						user: request.user,
						convex: "no-token",
					};
				}

				// Create authenticated client and call healthAuth
				const authClient = createAuthenticatedClient(request.accessToken);
				const convexHealth = await authClient.query(api.healthAuth.check);

				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user: request.user,
					convex: "authenticated",
					convexUser: convexHealth.user,
				};
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : "unknown";
				return {
					status: "ok",
					timestamp: new Date().toISOString(),
					user: request.user,
					convex: "auth-failed",
					error: errorMessage,
				};
			}
		},
	);
}
