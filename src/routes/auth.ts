import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { authMiddleware } from "../middleware/auth";
import { clientId, redirectUri, workos } from "../lib/workos";

export function registerAuthRoutes(fastify: FastifyInstance): void {
	fastify.get("/auth/login", loginHandler);
	fastify.get("/auth/callback", callbackHandler);
	// Logout requires auth middleware to get sessionId for revocation
	fastify.get("/auth/logout", { preHandler: authMiddleware }, logoutHandler);
	fastify.get("/auth/me", { preHandler: authMiddleware }, meHandler);
}

async function loginHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const { redirect } = request.query as { redirect?: string };

	// Validate redirect is a safe relative path
	let safeRedirect: string | undefined;
	if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
		safeRedirect = redirect;
	}

	const state = safeRedirect
		? JSON.stringify({ redirect: safeRedirect })
		: undefined;

	const authorizationUrl = workos.userManagement.getAuthorizationUrl({
		clientId,
		redirectUri,
		provider: "authkit",
		state,
	});

	reply.redirect(authorizationUrl);
}

async function callbackHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const { code, state } = request.query as { code?: string; state?: string };

	if (!code) {
		reply.code(400).send({ error: "Missing code" });
		return;
	}

	try {
		const { accessToken } = await workos.userManagement.authenticateWithCode({
			clientId,
			code,
		});

		reply.setCookie("accessToken", accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
			maxAge: 60 * 60 * 24 * 7,
			signed: true,
		});

		let redirectPath = "/";
		if (state) {
			try {
				const parsed = JSON.parse(state);
				if (parsed?.redirect && typeof parsed.redirect === "string") {
					if (
						parsed.redirect.startsWith("/") &&
						!parsed.redirect.startsWith("//")
					) {
						redirectPath = parsed.redirect;
					}
				}
			} catch {
				// ignore invalid state
			}
		}

		reply.redirect(redirectPath);
	} catch (error) {
		const message =
			error instanceof Error && error.message
				? error.message
				: "Authentication failed";
		reply.code(401).send({ error: message });
	}
}

async function logoutHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	// Attempt to revoke WorkOS session if we have a sessionId
	const sessionId = request.user?.sessionId;
	if (sessionId) {
		try {
			await workos.userManagement.revokeSession({ sessionId });
		} catch (error) {
			// Log error but don't block logout - cookie clearing is more important
			request.log.error(
				{ error, sessionId },
				"Failed to revoke WorkOS session",
			);
		}
	}

	// Always clear cookie and redirect, even if revocation fails
	reply.clearCookie("accessToken", { path: "/" });
	reply.redirect("/");
}

async function meHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	if (reply.sent) {
		return;
	}
	if (!request.user) {
		reply.code(401).send({ error: "Not authenticated" });
		return;
	}

	reply.send({ user: request.user });
}
