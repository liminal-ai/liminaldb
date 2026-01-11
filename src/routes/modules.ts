import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VALID_THEMES } from "../schemas/preferences";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Register internal module routes.
 *
 * DESIGN DECISION: Module routes are intentionally unauthenticated.
 *
 * Modules are UI components loaded in iframes within the authenticated shell.
 * The module HTML contains no sensitive data - it's just component structure
 * and client-side logic. All data access happens via authenticated API calls.
 *
 * This design enables:
 * - Simpler shell/iframe communication (no auth token passing)
 * - Potential embedding in external contexts per ui-architecture.md
 *
 * Security is enforced at the API layer, not the UI component layer.
 *
 * @param fastify - The Fastify instance to register routes on
 */
export function registerModuleRoutes(fastify: FastifyInstance): void {
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
	const html = template.replace(
		"{{validThemes}}",
		JSON.stringify(VALID_THEMES),
	);
	reply.type("text/html").send(html);
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
