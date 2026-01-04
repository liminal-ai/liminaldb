import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerModuleRoutes(fastify: FastifyInstance): void {
	// Internal module routes - no auth (API calls require auth)
	fastify.get("/_m/prompts", promptsModuleHandler);
	fastify.get("/_m/prompt-editor", promptEditorHandler);
}

async function promptsModuleHandler(
	_request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const template = await readFile(
		resolve(__dirname, "../ui/templates/prompts.html"),
		"utf8",
	);
	reply.type("text/html").send(template);
}

async function promptEditorHandler(
	_request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const template = await readFile(
		resolve(__dirname, "../ui/templates/prompt-editor.html"),
		"utf8",
	);
	reply.type("text/html").send(template);
}
