import { describe, test, expect, beforeAll, afterEach } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

/**
 * Integration tests for prompt mutations/queries.
 * These run against the deployed Convex backend to verify our mental model.
 *
 * Prerequisites:
 * - CONVEX_URL set to staging deployment
 * - CONVEX_API_KEY set
 * - Test user exists
 */

function getConvexClient(): ConvexHttpClient {
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL not configured");
	}
	return new ConvexHttpClient(convexUrl);
}

function getApiKey(): string {
	const apiKey = process.env.CONVEX_API_KEY;
	if (!apiKey) {
		throw new Error("CONVEX_API_KEY not configured");
	}
	return apiKey;
}

describe("Convex Prompts Integration", () => {
	let client: ConvexHttpClient;
	let apiKey: string;
	const testUserId = "integration_test_user";
	const createdSlugs: string[] = [];

	beforeAll(() => {
		client = getConvexClient();
		apiKey = getApiKey();
	});

	afterEach(async () => {
		// Cleanup: delete all prompts created during tests
		for (const slug of createdSlugs) {
			try {
				await client.mutation(api.prompts.deletePromptBySlug, {
					apiKey,
					userId: testUserId,
					slug,
				});
			} catch {
				// Ignore errors - prompt may not exist if test failed
			}
		}
		createdSlugs.length = 0;
	});

	function trackSlug(slug: string): string {
		createdSlugs.push(slug);
		return slug;
	}

	describe("insertPrompts → getPromptBySlug round trip", () => {
		test("insert and retrieve prompt", async () => {
			const testSlug = trackSlug(`test-prompt-${Date.now()}`);

			// Insert
			const ids = await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "Integration Test Prompt",
						description: "Created by integration test",
						content: "Test content",
						tags: ["integration-test"],
					},
				],
			});

			expect(ids).toHaveLength(1);

			// Retrieve
			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt).not.toBeNull();
			expect(prompt?.slug).toBe(testSlug);
			expect(prompt?.name).toBe("Integration Test Prompt");
			expect(prompt?.tags).toContain("integration-test");
		});

		test("insert prompt with parameters", async () => {
			const testSlug = trackSlug(`param-prompt-${Date.now()}`);

			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "Param Test",
						description: "Has parameters",
						content: "Hello {{name}}",
						tags: [],
						parameters: [
							{
								name: "name",
								type: "string",
								required: true,
								description: "Name to greet",
							},
						],
					},
				],
			});

			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt?.parameters).toHaveLength(1);
			expect(prompt?.parameters?.[0]?.name).toBe("name");
		});
	});

	describe("duplicate slug rejection", () => {
		test("rejects duplicate slug for same user", async () => {
			const testSlug = trackSlug(`duplicate-test-${Date.now()}`);

			// First insert should succeed
			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "First",
						description: "...",
						content: "...",
						tags: [],
					},
				],
			});

			// Second insert with same slug should fail
			await expect(
				client.mutation(api.prompts.insertPrompts, {
					apiKey,
					userId: testUserId,
					prompts: [
						{
							slug: testSlug,
							name: "Duplicate",
							description: "...",
							content: "...",
							tags: [],
						},
					],
				}),
			).rejects.toThrow(/already exists/);
		});
	});

	describe("slug validation", () => {
		test("rejects invalid slug format", async () => {
			await expect(
				client.mutation(api.prompts.insertPrompts, {
					apiKey,
					userId: testUserId,
					prompts: [
						{
							slug: "Invalid:Slug",
							name: "...",
							description: "...",
							content: "...",
							tags: [],
						},
					],
				}),
			).rejects.toThrow(/Invalid slug|colons/);
		});

		test("rejects duplicate slugs within same batch", async () => {
			await expect(
				client.mutation(api.prompts.insertPrompts, {
					apiKey,
					userId: testUserId,
					prompts: [
						{
							slug: "dupe-in-batch",
							name: "First",
							description: "...",
							content: "...",
							tags: [],
						},
						{
							slug: "dupe-in-batch",
							name: "Second",
							description: "...",
							content: "...",
							tags: [],
						},
					],
				}),
			).rejects.toThrow(/Duplicate slug in batch/);
		});
	});

	describe("non-existent slug", () => {
		test("returns null for slug that doesn't exist", async () => {
			const result = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: "definitely-does-not-exist-12345",
			});

			expect(result).toBeNull();
		});
	});

	describe("user isolation", () => {
		test("cannot retrieve another user's prompt", async () => {
			const testSlug = trackSlug(`isolation-test-${Date.now()}`);

			// Create prompt as testUserId
			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "Private",
						description: "...",
						content: "...",
						tags: [],
					},
				],
			});

			// Try to retrieve as different user
			const result = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: "different_user",
				slug: testSlug,
			});

			expect(result).toBeNull();
		});
	});

	describe("large batch operations", () => {
		test("handles batch of 10 prompts", async () => {
			const prompts = Array.from({ length: 10 }, (_, i) => ({
				slug: trackSlug(`batch-${Date.now()}-${i}`),
				name: `Batch Prompt ${i}`,
				description: `Description ${i}`,
				content: `Content ${i}`,
				tags: ["batch-test"],
			}));

			const ids = await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts,
			});

			expect(ids).toHaveLength(10);

			// Verify all were created
			for (const prompt of prompts) {
				const result = await client.query(api.prompts.getPromptBySlug, {
					apiKey,
					userId: testUserId,
					slug: prompt.slug,
				});
				expect(result).not.toBeNull();
			}
		});

		test("shared tags in batch are deduplicated", async () => {
			const sharedTag = `shared-${Date.now()}`;
			const prompts = [
				{
					slug: trackSlug(`batch-shared-a-${Date.now()}`),
					name: "A",
					description: "...",
					content: "...",
					tags: [sharedTag, "unique-a"],
				},
				{
					slug: trackSlug(`batch-shared-b-${Date.now()}`),
					name: "B",
					description: "...",
					content: "...",
					tags: [sharedTag, "unique-b"],
				},
			];

			const ids = await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts,
			});

			expect(ids).toHaveLength(2);

			// Both should have the shared tag
			for (const prompt of prompts) {
				const result = await client.query(api.prompts.getPromptBySlug, {
					apiKey,
					userId: testUserId,
					slug: prompt.slug,
				});
				expect(result?.tags).toContain(sharedTag);
			}
		});
	});

	describe("parameter edge cases", () => {
		test("handles all parameter types", async () => {
			const testSlug = trackSlug(`all-params-${Date.now()}`);

			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "All Params",
						description: "Has all parameter types",
						content: "{{str}} {{arr}} {{num}} {{bool}}",
						tags: [],
						parameters: [
							{ name: "str", type: "string", required: true },
							{ name: "arr", type: "string[]", required: false },
							{ name: "num", type: "number", required: true },
							{ name: "bool", type: "boolean", required: false },
						],
					},
				],
			});

			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt?.parameters).toHaveLength(4);
			expect(prompt?.parameters?.map((p) => p.type)).toEqual([
				"string",
				"string[]",
				"number",
				"boolean",
			]);
		});

		test("handles empty parameters array", async () => {
			const testSlug = trackSlug(`empty-params-${Date.now()}`);

			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "Empty Params",
						description: "...",
						content: "...",
						tags: [],
						parameters: [],
					},
				],
			});

			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt?.parameters).toEqual([]);
		});

		test("handles prompt without parameters", async () => {
			const testSlug = trackSlug(`no-params-${Date.now()}`);

			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "No Params",
						description: "...",
						content: "...",
						tags: [],
						// parameters field omitted
					},
				],
			});

			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt?.parameters).toBeUndefined();
		});

		test("handles parameters with optional description", async () => {
			const testSlug = trackSlug(`param-desc-${Date.now()}`);

			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "Param Descriptions",
						description: "...",
						content: "{{with}} {{without}}",
						tags: [],
						parameters: [
							{
								name: "with",
								type: "string",
								required: true,
								description: "Has a description",
							},
							{
								name: "without",
								type: "string",
								required: false,
								// description omitted
							},
						],
					},
				],
			});

			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt?.parameters?.[0]?.description).toBe("Has a description");
			expect(prompt?.parameters?.[1]?.description).toBeUndefined();
		});
	});

	describe("delete prompt", () => {
		test("deletes existing prompt", async () => {
			const testSlug = trackSlug(`delete-test-${Date.now()}`);

			// Create
			await client.mutation(api.prompts.insertPrompts, {
				apiKey,
				userId: testUserId,
				prompts: [
					{
						slug: testSlug,
						name: "To Delete",
						description: "...",
						content: "...",
						tags: [],
					},
				],
			});

			// Delete
			const deleted = await client.mutation(api.prompts.deletePromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(deleted).toBe(true);

			// Verify gone
			const prompt = await client.query(api.prompts.getPromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: testSlug,
			});

			expect(prompt).toBeNull();

			// Remove from cleanup list since we already deleted it
			const idx = createdSlugs.indexOf(testSlug);
			if (idx > -1) createdSlugs.splice(idx, 1);
		});

		test("returns false for non-existent prompt", async () => {
			const deleted = await client.mutation(api.prompts.deletePromptBySlug, {
				apiKey,
				userId: testUserId,
				slug: "does-not-exist-12345",
			});

			expect(deleted).toBe(false);
		});
	});
});
