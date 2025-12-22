import type { FastifyReply, FastifyRequest } from "fastify";
import { workos } from "../lib/workos";

// Extend FastifyRequest to include user
declare module "fastify" {
	interface FastifyRequest {
		user?: {
			id: string;
			email: string;
			firstName: string | null;
			lastName: string | null;
		};
		accessToken?: string;
	}
}

export async function authMiddleware(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userIdCookie = request.unsignCookie(request.cookies.userId || "");
	const accessTokenCookie = request.unsignCookie(
		request.cookies.accessToken || "",
	);

	if (!userIdCookie.valid || !userIdCookie.value) {
		reply.code(401).send({ error: "Not authenticated" });
		return;
	}

	try {
		const user = await workos.userManagement.getUser(userIdCookie.value);

		request.user = {
			id: user.id,
			email: user.email,
			firstName: user.firstName,
			lastName: user.lastName,
		};
		request.accessToken = accessTokenCookie.value || undefined;
	} catch (_error) {
		reply.code(401).send({ error: "Invalid or expired session" });
		return;
	}
}
