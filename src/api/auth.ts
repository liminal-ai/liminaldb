import type { FastifyInstance } from "fastify";
import { workos, clientId, redirectUri } from "../lib/workos";

export function registerAuthRoutes(fastify: FastifyInstance): void {
	// Login - redirect to WorkOS
	fastify.get("/auth/login", async (_request, reply) => {
		const authorizationUrl = workos.userManagement.getAuthorizationUrl({
			clientId,
			redirectUri,
			provider: "authkit",
		});

		reply.redirect(authorizationUrl);
	});

	// Callback - exchange code for session
	fastify.get("/auth/callback", async (request, reply) => {
		const { code } = request.query as { code?: string };

		if (!code) {
			reply.code(400).send({ error: "Missing authorization code" });
			return;
		}

		try {
			const { user, accessToken } =
				await workos.userManagement.authenticateWithCode({
					clientId,
					code,
				});

			// Store user ID and access token in signed cookies
			reply.setCookie("userId", user.id, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				signed: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			reply.setCookie("accessToken", accessToken, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				path: "/",
				signed: true,
				maxAge: 60 * 60 * 24 * 7, // 7 days
			});

			fastify.log.info(`User logged in: ${user.email}`);

			// Redirect to landing page
			reply.redirect("/");
		} catch (error) {
			fastify.log.error(error);
			reply.code(500).send({ error: "Authentication failed" });
		}
	});

	// Logout - clear cookies
	fastify.get("/auth/logout", async (_request, reply) => {
		reply.clearCookie("userId", { path: "/" });
		reply.clearCookie("accessToken", { path: "/" });
		reply.redirect("/");
	});

	// Get current user
	fastify.get("/auth/me", async (request, reply) => {
		const userId = request.unsignCookie(request.cookies.userId || "");

		if (!userId.valid || !userId.value) {
			reply.code(401).send({ error: "Not authenticated" });
			return;
		}

		try {
			const user = await workos.userManagement.getUser(userId.value);
			reply.send({ user });
		} catch (_error) {
			reply.code(401).send({ error: "Invalid session" });
		}
	});
}
