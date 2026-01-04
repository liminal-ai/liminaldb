import { describe, test, expect, beforeAll, afterEach } from "vitest";
import {
	getTestAuth,
	requireTestAuth,
	type TestAuth,
} from "../../fixtures/auth";
import { getTestBaseUrl } from "../../fixtures/env";

/**
 * Integration tests for UI prompts flow.
 * Tests API and module endpoints against the real staging server.
 */

describe("UI Prompts Integration", () => {
	let baseUrl: string;
	let auth: TestAuth;
	const createdSlugs: string[] = [];

	beforeAll(async () => {
		requireTestAuth();
		baseUrl = getTestBaseUrl();
		const resolvedAuth = await getTestAuth();
		if (!resolvedAuth) {
			throw new Error("Failed to get test auth");
		}
		auth = resolvedAuth;
	});

	afterEach(async () => {
		// Cleanup created prompts
		for (const slug of createdSlugs) {
			try {
				await fetch(`${baseUrl}/api/prompts/${slug}`, {
					method: "DELETE",
					headers: { Authorization: `Bearer ${auth.accessToken}` },
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

	describe("API endpoints", () => {
		test("GET /api/prompts with auth returns prompt list", async () => {
			const response = await fetch(`${baseUrl}/api/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			const prompts = await response.json();
			expect(Array.isArray(prompts)).toBe(true);
		});

		test("created prompt appears in list API", async () => {
			const slug = trackSlug(`ui-test-${Date.now()}`);

			// Create via API
			const createRes = await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "UI Test Prompt",
							description: "Created for UI test",
							content: "Test content",
							tags: ["ui-test"],
						},
					],
				}),
			});

			expect(createRes.status).toBe(201);

			// Fetch list
			const listRes = await fetch(`${baseUrl}/api/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(listRes.status).toBe(200);
			const prompts = (await listRes.json()) as Array<{ slug: string }>;
			const found = prompts.find((p) => p.slug === slug);
			expect(found).toBeDefined();
		});
	});

	describe("Module endpoints", () => {
		test("GET /_m/prompts returns HTML", async () => {
			const response = await fetch(`${baseUrl}/_m/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const body = await response.text();
			expect(body.length).toBeGreaterThan(0);
		});

		test("GET /_m/prompt-editor returns HTML", async () => {
			const response = await fetch(`${baseUrl}/_m/prompt-editor`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const body = await response.text();
			expect(body.length).toBeGreaterThan(0);
		});
	});
});
