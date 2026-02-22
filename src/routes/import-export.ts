import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";
import { ConvexError } from "convex/values";
import yaml from "js-yaml";
import { authMiddleware } from "../middleware/auth";
import {
	YamlImportRequestSchema,
	parseAndValidateYamlImport,
} from "../schemas/import-export";
import type { PromptInput } from "../schemas/prompts";
import { convex } from "../lib/convex";
import { api } from "../../convex/_generated/api";
import { config } from "../lib/config";

const BATCH_SIZE = 100;

/**
 * Register import/export routes for prompts.
 */
export function registerImportExportRoutes(fastify: FastifyInstance): void {
	fastify.get(
		"/api/prompts/export",
		{ preHandler: authMiddleware },
		exportPromptsHandler,
	);
	fastify.post(
		"/api/prompts/import",
		{ preHandler: authMiddleware, bodyLimit: 5 * 1024 * 1024 },
		importPromptsHandler,
	);
}

/**
 * GET /api/prompts/export
 * Export all user prompts as a YAML file download.
 */
async function exportPromptsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	try {
		const prompts = await convex.query(api.prompts.listPromptsRanked, {
			apiKey: config.convexApiKey,
			userId,
			limit: 1000,
		});

		// Map to export shape — strip metadata fields
		const exportPrompts = prompts.map((p) => {
			const exported: Record<string, unknown> = {
				slug: p.slug,
				name: p.name,
				description: p.description,
				content: p.content,
				tags: p.tags,
			};
			if (p.parameters && p.parameters.length > 0) {
				exported.parameters = p.parameters;
			}
			return exported;
		});

		const doc = { prompts: exportPrompts };
		const yamlContent = yaml.dump(doc, {
			lineWidth: -1,
			noRefs: true,
			quotingType: '"',
		});

		const date = new Date().toISOString().slice(0, 10);
		const filename = `liminaldb-prompts-${date}.yaml`;

		return reply
			.code(200)
			.header("Content-Type", "application/x-yaml")
			.header("Content-Disposition", `attachment; filename="${filename}"`)
			.send(yamlContent);
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to export prompts");
		return reply.code(500).send({ error: "Failed to export prompts" });
	}
}

/**
 * POST /api/prompts/import
 * Import prompts from a YAML string. Skips duplicates.
 */
async function importPromptsHandler(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const userId = request.user?.id;
	if (!userId) {
		return reply.code(401).send({ error: "Not authenticated" });
	}

	// Validate request body
	let body: { yaml: string };
	try {
		body = YamlImportRequestSchema.parse(request.body);
	} catch (error) {
		if (error instanceof ZodError) {
			const firstIssue = error.issues[0];
			return reply
				.code(400)
				.send({ error: firstIssue?.message ?? "Validation failed" });
		}
		throw error;
	}

	// Parse and validate YAML content
	const { valid, errors } = parseAndValidateYamlImport(body.yaml);

	if (valid.length === 0) {
		return reply.code(400).send({
			error: errors[0] ?? "No valid prompts found",
			created: 0,
			skipped: [],
			errors,
		});
	}

	try {
		// Fetch existing slugs to detect duplicates
		const existing = await convex.query(api.prompts.listPromptsRanked, {
			apiKey: config.convexApiKey,
			userId,
			limit: 1000,
		});
		const existingSlugs = new Set(existing.map((p) => p.slug));

		// Deduplicate within the import batch (keep first occurrence)
		const seenSlugs = new Set<string>();
		const toCreate: PromptInput[] = [];
		const skipped: string[] = [];

		for (const prompt of valid) {
			if (existingSlugs.has(prompt.slug)) {
				skipped.push(prompt.slug);
			} else if (seenSlugs.has(prompt.slug)) {
				skipped.push(prompt.slug);
			} else {
				seenSlugs.add(prompt.slug);
				toCreate.push(prompt);
			}
		}

		// Batch insert in chunks of 100
		let created = 0;
		for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
			const batch = toCreate.slice(i, i + BATCH_SIZE);
			try {
				await convex.mutation(api.prompts.insertPrompts, {
					apiKey: config.convexApiKey,
					userId,
					prompts: batch,
				});
				created += batch.length;
			} catch (error) {
				if (error instanceof ConvexError) {
					const data = error.data as { code?: string; slug?: string };
					if (
						data.code === "DUPLICATE_SLUG" ||
						data.code === "DUPLICATE_SLUG_IN_BATCH"
					) {
						// Race condition — slug was created between check and insert
						if (data.slug) skipped.push(data.slug);
						continue;
					}
				}
				throw error;
			}
		}

		return reply.code(200).send({ created, skipped, errors });
	} catch (error) {
		request.log.error({ err: error, userId }, "Failed to import prompts");
		return reply.code(500).send({ error: "Failed to import prompts" });
	}
}
