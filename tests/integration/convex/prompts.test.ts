import {
	describe,
	test,
	expect,
	beforeAll,
	afterAll,
	afterEach,
} from "bun:test";
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
