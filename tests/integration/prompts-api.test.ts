import { describe, test, expect, beforeAll, afterEach } from "bun:test";

/**
 * HTTP API integration tests for prompts.
 * These run against deployed staging to verify full round-trip.
 *
 * Prerequisites:
 * - TEST_BASE_URL set to staging
 * - Valid test user credentials
 */

function getBaseUrl(): string {
	const url = process.env.TEST_BASE_URL;
	if (!url) throw new Error("TEST_BASE_URL not configured");
	return url;
}

async function getAuthToken(): Promise<string> {
	// Use WorkOS to get a real token for the test user
	const email = process.env.TEST_USER_EMAIL;
	const password = process.env.TEST_USER_PASSWORD;
	const clientId = process.env.WORKOS_CLIENT_ID;
	const apiKey = process.env.WORKOS_API_KEY;

	if (!email || !password || !clientId || !apiKey) {
		throw new Error("Test user credentials not configured");
	}

	const { WorkOS } = await import("@workos-inc/node");
	const workos = new WorkOS(apiKey);

	const { accessToken } = await workos.userManagement.authenticateWithPassword({
		email,
		password,
		clientId,
	});

	return accessToken;
}

describe("Prompts API Integration", () => {
	let baseUrl: string;
	let authToken: string;
	const createdSlugs: string[] = [];

	beforeAll(async () => {
		baseUrl = getBaseUrl();
		authToken = await getAuthToken();
	});

	afterEach(async () => {
		// Cleanup created prompts
		for (const slug of createdSlugs) {
			try {
				await fetch(`${baseUrl}/api/prompts/${slug}`, {
					method: "DELETE",
					headers: { Authorization: `Bearer ${authToken}` },
				});
			} catch {
				// Ignore cleanup errors
			}
		}
		createdSlugs.length = 0;
	});

	function trackSlug(slug: string): string {
		createdSlugs.push(slug);
		return slug;
	}

	describe("POST /api/prompts -> GET /api/prompts/:slug round trip", () => {
		test("create and retrieve prompt", async () => {
			const slug = trackSlug(`api-test-${Date.now()}`);

			// Create
			const createRes = await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "API Integration Test",
							description: "Created via HTTP API",
							content: "Test content",
							tags: ["api-test"],
						},
					],
				}),
			});

			expect(createRes.status).toBe(201);
			const createData = (await createRes.json()) as { ids: string[] };
			expect(createData.ids).toHaveLength(1);

			// Retrieve
			const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});

			expect(getRes.status).toBe(200);
			const prompt = (await getRes.json()) as {
				slug: string;
				name: string;
				tags: string[];
			};
			expect(prompt.slug).toBe(slug);
			expect(prompt.name).toBe("API Integration Test");
			expect(prompt.tags).toContain("api-test");
		});

		test("create prompt with tags and verify tags returned", async () => {
			const slug = trackSlug(`tags-test-${Date.now()}`);

			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Tags Test",
							description: "Multiple tags",
							content: "Content",
							tags: ["tag-a", "tag-b", "tag-c"],
						},
					],
				}),
			});

			const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});

			const prompt = (await getRes.json()) as { tags: string[] };
			expect(prompt.tags).toContain("tag-a");
			expect(prompt.tags).toContain("tag-b");
			expect(prompt.tags).toContain("tag-c");
		});
	});

	describe("DELETE /api/prompts/:slug", () => {
		test("delete existing prompt", async () => {
			const slug = trackSlug(`delete-test-${Date.now()}`);

			// Create
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "To Delete",
							description: "Will be deleted",
							content: "Content",
							tags: [],
						},
					],
				}),
			});

			// Delete
			const deleteRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${authToken}` },
			});

			expect(deleteRes.status).toBe(200);
			const deleteData = (await deleteRes.json()) as { deleted: boolean };
			expect(deleteData.deleted).toBe(true);

			// Verify gone
			const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			expect(getRes.status).toBe(404);

			// Remove from cleanup since we deleted it
			const idx = createdSlugs.indexOf(slug);
			if (idx > -1) createdSlugs.splice(idx, 1);
		});
	});

	describe("error cases", () => {
		test("401 without auth", async () => {
			const res = await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ prompts: [] }),
			});

			expect(res.status).toBe(401);
		});

		test("400 with invalid slug", async () => {
			const res = await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug: "Invalid:Slug",
							name: "Test",
							description: "Test",
							content: "Test",
							tags: [],
						},
					],
				}),
			});

			expect(res.status).toBe(400);
		});

		test("409 on duplicate slug", async () => {
			const slug = trackSlug(`dupe-test-${Date.now()}`);

			// First create
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "First",
							description: "First",
							content: "First",
							tags: [],
						},
					],
				}),
			});

			// Second create with same slug
			const res = await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Dupe",
							description: "Dupe",
							content: "Dupe",
							tags: [],
						},
					],
				}),
			});

			expect(res.status).toBe(409);
		});
	});
});
