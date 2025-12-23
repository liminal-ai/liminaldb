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
	void request;
	void reply;
	void extractToken;
	void validateJwt;
	void decodeJwtClaims;

	throw new Error("Not implemented: authMiddleware");
}
