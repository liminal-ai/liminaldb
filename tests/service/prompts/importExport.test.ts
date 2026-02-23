import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import yaml from "js-yaml";
import { ConvexError } from "convex/values";
import { createTestJwt } from "../../fixtures";

// Mock convex client before importing routes
const mockConvex = vi.hoisted(() => ({
	mutation: vi.fn<(...args: unknown[]) => Promise<string[]>>(() =>
		Promise.resolve([]),
	),
	query: vi.fn<(...args: unknown[]) => Promise<unknown>>(() =>
		Promise.resolve([]),
	),
}));
vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

// Mock JWT validator
vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

// Mock config
vi.mock("../../../src/lib/config", () => ({
	config: {
		convexApiKey: "test_api_key",
		convexUrl: "http://localhost:9999",
	},
}));

import { registerImportExportRoutes } from "../../../src/routes/import-export";

function validPrompt(slug: string) {
	return {
		slug,
		name: `Prompt ${slug}`,
		description: `Description for ${slug}`,
		content: `Content for ${slug}`,
		tags: ["code"],
	};
}

function mockPromptDTO(slug: string) {
	return {
		slug,
		name: `Prompt ${slug}`,
		description: `Description for ${slug}`,
		content: `Content for ${slug}`,
		tags: ["code"],
		pinned: false,
		favorited: true,
		usageCount: 5,
		lastUsedAt: Date.now(),
	};
}

describe("GET /api/prompts/export", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify();
		registerImportExportRoutes(app);
		await app.ready();
		mockConvex.query.mockClear();
		mockConvex.mutation.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	test("returns 401 without auth token", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
		});
		expect(response.statusCode).toBe(401);
	});

	test("returns YAML with correct content-type", async () => {
		mockConvex.query.mockResolvedValue([mockPromptDTO("test-prompt")]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		expect(response.statusCode).toBe(200);
		expect(response.headers["content-type"]).toBe("application/x-yaml");
	});

	test("returns content-disposition header with date-stamped filename", async () => {
		mockConvex.query.mockResolvedValue([]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		const disposition = response.headers["content-disposition"] as string;
		expect(disposition).toMatch(
			/^attachment; filename="liminaldb-prompts-\d{4}-\d{2}-\d{2}\.yaml"$/,
		);
	});

	test("strips metadata fields from exported prompts", async () => {
		mockConvex.query.mockResolvedValue([mockPromptDTO("my-prompt")]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		const doc = yaml.load(response.body) as {
			prompts: Record<string, unknown>[];
		};
		const prompt = doc.prompts[0];

		expect(prompt).toHaveProperty("slug", "my-prompt");
		expect(prompt).toHaveProperty("name");
		expect(prompt).toHaveProperty("content");
		expect(prompt).toHaveProperty("tags");
		expect(prompt).not.toHaveProperty("pinned");
		expect(prompt).not.toHaveProperty("favorited");
		expect(prompt).not.toHaveProperty("usageCount");
		expect(prompt).not.toHaveProperty("lastUsedAt");
	});

	test("includes parameters when present", async () => {
		const dto = {
			...mockPromptDTO("with-params"),
			parameters: [
				{
					name: "lang",
					type: "string",
					required: true,
					description: "Language",
				},
			],
		};
		mockConvex.query.mockResolvedValue([dto]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		const doc = yaml.load(response.body) as {
			prompts: Record<string, unknown>[];
		};
		expect(doc.prompts[0]).toHaveProperty("parameters");
	});

	test("handles empty prompt list", async () => {
		mockConvex.query.mockResolvedValue([]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		expect(response.statusCode).toBe(200);
		const doc = yaml.load(response.body) as { prompts: unknown[] };
		expect(doc.prompts).toEqual([]);
	});

	test("exported YAML is valid and round-trips correctly", async () => {
		mockConvex.query.mockResolvedValue([
			mockPromptDTO("prompt-a"),
			mockPromptDTO("prompt-b"),
		]);

		const response = await app.inject({
			method: "GET",
			url: "/api/prompts/export",
			headers: { authorization: `Bearer ${createTestJwt()}` },
		});

		const doc = yaml.load(response.body) as { prompts: unknown[] };
		expect(doc.prompts).toHaveLength(2);
	});
});

describe("POST /api/prompts/import", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify();
		registerImportExportRoutes(app);
		await app.ready();
		mockConvex.query.mockClear();
		mockConvex.mutation.mockClear();
	});

	afterEach(async () => {
		await app.close();
	});

	test("returns 401 without auth token", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			payload: { yaml: "prompts: []" },
		});
		expect(response.statusCode).toBe(401);
	});

	test("returns 400 with empty yaml body", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: "" },
		});
		expect(response.statusCode).toBe(400);
	});

	test("returns 400 with invalid YAML syntax", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: "prompts:\n  - slug: [invalid yaml" },
		});
		expect(response.statusCode).toBe(400);
	});

	test("returns 400 with YAML missing prompts key", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: "items:\n  - name: test" },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json().error).toMatch(/prompts/i);
	});

	test("returns 400 with invalid prompt data", async () => {
		const yamlContent = yaml.dump({
			prompts: [
				{ slug: "INVALID", name: "", description: "", content: "", tags: [] },
			],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		expect(response.statusCode).toBe(400);
		expect(response.json().errors.length).toBeGreaterThan(0);
	});

	test("creates valid prompts and returns count", async () => {
		mockConvex.query.mockResolvedValue([]); // no existing prompts
		mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("import-a"), validPrompt("import-b")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		expect(response.statusCode).toBe(200);
		const result = response.json();
		expect(result.created).toBe(2);
		expect(result.skipped).toEqual([]);
	});

	test("skips prompts with existing slugs", async () => {
		mockConvex.query.mockResolvedValue([mockPromptDTO("existing-slug")]);
		mockConvex.mutation.mockResolvedValue(["id_1"]);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("existing-slug"), validPrompt("new-slug")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		const result = response.json();
		expect(result.created).toBe(1);
		expect(result.skipped).toContain("existing-slug");
	});

	test("deduplicates slugs within the import batch", async () => {
		mockConvex.query.mockResolvedValue([]);
		mockConvex.mutation.mockResolvedValue(["id_1"]);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("dupe-slug"), validPrompt("dupe-slug")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		const result = response.json();
		expect(result.created).toBe(1);
		expect(result.skipped).toContain("dupe-slug");
	});

	test("handles mixed valid and invalid prompts", async () => {
		mockConvex.query.mockResolvedValue([]);
		mockConvex.mutation.mockResolvedValue(["id_1"]);

		const yamlContent = yaml.dump({
			prompts: [
				validPrompt("good-prompt"),
				{ slug: "BAD", name: "", description: "", content: "", tags: [] },
			],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		const result = response.json();
		expect(result.created).toBe(1);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	test("handles DUPLICATE_SLUG race condition gracefully", async () => {
		mockConvex.query.mockResolvedValue([]);
		mockConvex.mutation.mockRejectedValue(
			new ConvexError({ code: "DUPLICATE_SLUG", slug: "race-slug" }),
		);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("race-slug")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		const result = response.json();
		expect(result.created).toBe(0);
		expect(result.skipped).toContain("race-slug");
	});

	test("retries batch after DUPLICATE_SLUG without losing other prompts", async () => {
		mockConvex.query.mockResolvedValue([]);
		mockConvex.mutation
			.mockRejectedValueOnce(
				new ConvexError({ code: "DUPLICATE_SLUG", slug: "race-slug" }),
			)
			.mockResolvedValueOnce(["id_1", "id_2"]);

		const yamlContent = yaml.dump({
			prompts: [
				validPrompt("race-slug"),
				validPrompt("good-a"),
				validPrompt("good-b"),
			],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		const result = response.json();
		expect(result.created).toBe(2);
		expect(result.skipped).toContain("race-slug");
		expect(mockConvex.mutation).toHaveBeenCalledTimes(2);
	});

	test("returns 400 when import would exceed MAX_PROMPTS limit", async () => {
		// Simulate 999 existing prompts
		const existingPrompts = Array.from({ length: 999 }, (_, i) =>
			mockPromptDTO(`existing-${i}`),
		);
		mockConvex.query.mockResolvedValue(existingPrompts);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("new-a"), validPrompt("new-b")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		expect(response.statusCode).toBe(400);
		const result = response.json();
		expect(result.error).toMatch(/exceed.*1000.*limit/i);
		expect(result.created).toBe(0);
	});

	test("allows import up to exactly MAX_PROMPTS", async () => {
		const existingPrompts = Array.from({ length: 998 }, (_, i) =>
			mockPromptDTO(`existing-${i}`),
		);
		mockConvex.query.mockResolvedValue(existingPrompts);
		mockConvex.mutation.mockResolvedValue(["id_1", "id_2"]);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("new-a"), validPrompt("new-b")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		expect(response.statusCode).toBe(200);
		const result = response.json();
		expect(result.created).toBe(2);
	});

	test("returns 400 when model layer rejects with MAX_PROMPTS_EXCEEDED", async () => {
		const existingPrompts = Array.from({ length: 998 }, (_, i) =>
			mockPromptDTO(`existing-${i}`),
		);
		mockConvex.query.mockResolvedValue(existingPrompts);
		mockConvex.mutation.mockRejectedValue(
			new ConvexError({ code: "MAX_PROMPTS_EXCEEDED", maxPrompts: 1000 }),
		);

		const yamlContent = yaml.dump({
			prompts: [validPrompt("new-a"), validPrompt("new-b")],
		});

		const response = await app.inject({
			method: "POST",
			url: "/api/prompts/import",
			headers: { authorization: `Bearer ${createTestJwt()}` },
			payload: { yaml: yamlContent },
		});

		expect(response.statusCode).toBe(400);
		const result = response.json();
		expect(result.error).toMatch(/1000.*limit/i);
		expect(result.created).toBe(0);
	});
});
