import { z } from "zod";
import yaml from "js-yaml";
import { PromptInputSchema, type PromptInput } from "./prompts";

export const YamlImportRequestSchema = z.object({
	yaml: z
		.string()
		.min(1, "YAML content required")
		.max(5_000_000, "YAML too large (max 5MB)"),
	slugs: z.array(z.string()).optional(),
});

export type YamlImportRequest = z.infer<typeof YamlImportRequestSchema>;

export interface ImportResult {
	created: number;
	skipped: string[];
	errors: string[];
}

export interface ParsedImport {
	valid: PromptInput[];
	errors: string[];
}

/**
 * Parse a YAML string and validate each prompt against PromptInputSchema.
 * Returns validated prompts and per-prompt error messages.
 */
export function parseAndValidateYamlImport(yamlString: string): ParsedImport {
	let parsed: unknown;
	try {
		parsed = yaml.load(yamlString);
	} catch (e) {
		return { valid: [], errors: [`Invalid YAML: ${(e as Error).message}`] };
	}

	if (
		!parsed ||
		typeof parsed !== "object" ||
		!Array.isArray((parsed as Record<string, unknown>).prompts)
	) {
		return {
			valid: [],
			errors: ["YAML must contain a top-level 'prompts' array"],
		};
	}

	const rawPrompts = (parsed as { prompts: unknown[] }).prompts;
	const valid: PromptInput[] = [];
	const errors: string[] = [];

	for (let i = 0; i < rawPrompts.length; i++) {
		const result = PromptInputSchema.safeParse(rawPrompts[i]);
		if (result.success) {
			valid.push(result.data);
		} else {
			const firstIssue = result.error.issues[0];
			errors.push(
				`Prompt at index ${i}: ${firstIssue?.message ?? "Validation failed"}`,
			);
		}
	}

	return { valid, errors };
}
