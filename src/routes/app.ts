import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware } from "../middleware/auth";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Register application page routes.
 * Sets up user-facing routes for the prompts UI with authentication.
 * @param fastify - The Fastify instance to register routes on
 */
export function registerAppRoutes(fastify: FastifyInstance): void {
	// Root redirect to prompts
	fastify.get("/", async (_request, reply) => {
		return reply.redirect("/prompts");
	});

	// User-facing routes require authentication
	// Order matters: more specific routes first
	fastify.get("/prompts", { preHandler: authMiddleware }, promptsPageHandler);
	fastify.get(
		"/prompts/new",
		{ preHandler: authMiddleware },
		newPromptPageHandler,
	);
	// Deep-link to specific prompt (view mode)
	fastify.get(
		"/prompts/:slug",
		{ preHandler: authMiddleware },
		promptsPageHandler,
	);
	// Deep-link to specific prompt (edit mode) - future use
	fastify.get(
		"/prompts/:slug/edit",
		{ preHandler: authMiddleware },
		promptsPageHandler,
	);
}

async function promptsPageHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const user = request.user;
	if (!user) {
		reply.code(401).send({ error: "Not authenticated" });
		return;
	}
	const modulePath = "/_m/prompts";

	const template = await readFile(
		resolve(__dirname, "../ui/templates/shell.html"),
		"utf8",
	);

	const html = template
		.replace("{{userId}}", user.id)
		.replace("{{email}}", user.email ?? "")
		.replace("{{modulePath}}", modulePath);

	reply.type("text/html").send(html);
}

async function newPromptPageHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const user = request.user;
	if (!user) {
		reply.code(401).send({ error: "Not authenticated" });
		return;
	}
	const modulePath = "/_m/prompt-editor";

	const template = await readFile(
		resolve(__dirname, "../ui/templates/shell.html"),
		"utf8",
	);

	const html = template
		.replace("{{userId}}", user.id)
		.replace("{{email}}", user.email ?? "")
		.replace("{{modulePath}}", modulePath);

	reply.type("text/html").send(html);
}
