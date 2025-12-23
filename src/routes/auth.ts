import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

export function registerAuthRoutes(fastify: FastifyInstance): void {
	fastify.get("/auth/login", loginHandler);
	fastify.get("/auth/callback", callbackHandler);
	fastify.get("/auth/logout", logoutHandler);
	fastify.get("/auth/me", meHandler);
}

async function loginHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	void request;
	void reply;
	throw new Error("Not implemented: login");
}

async function callbackHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	void request;
	void reply;
	throw new Error("Not implemented: callback");
}

async function logoutHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	void request;
	void reply;
	throw new Error("Not implemented: logout");
}

async function meHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	void request;
	void reply;
	throw new Error("Not implemented: me");
}
