import type { FastifyReply, FastifyRequest } from "fastify";

import type { AuthUser } from "../lib/auth";
import { decodeJwtClaims, extractToken, validateJwt } from "../lib/auth";

declare module "fastify" {
	interface FastifyRequest {
		user?: AuthUser;
		accessToken?: string;
	}
}

export async function authMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const { token } = extractToken(request);

	if (!token) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	const validation = await validateJwt(token);
	if (!validation.valid) {
		return reply.code(401).send({ error: validation.error ?? "Invalid token" });
	}

	try {
		const claims = decodeJwtClaims(token);
		const user: AuthUser = {
			id: claims.sub,
			email: claims.email,
			sessionId: claims.sid,
		};
		request.user = user;
		request.accessToken = token;
	} catch (error) {
		const message =
			error instanceof Error && error.message ? error.message : "Invalid token";
		return reply.code(401).send({ error: message });
	}
}
