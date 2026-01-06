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

		test("GET /api/prompts/tags returns unique tags array", async () => {
			// Create a prompt with tags
			const slug = trackSlug(`tags-test-${Date.now()}`);
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Tags Test",
							description: "Test tags endpoint",
							content: "Content",
							tags: ["unique-tag-test"],
						},
					],
				}),
			});

			const response = await fetch(`${baseUrl}/api/prompts/tags`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			const tags = await response.json();
			expect(Array.isArray(tags)).toBe(true);
			expect(tags).toContain("unique-tag-test");
		});

		test("GET /api/prompts with tags filter returns filtered results", async () => {
			const slug = trackSlug(`filter-test-${Date.now()}`);
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Filter Test",
							description: "Test tag filtering",
							content: "Content",
							tags: ["filter-test-tag"],
						},
					],
				}),
			});

			const response = await fetch(
				`${baseUrl}/api/prompts?tags=filter-test-tag`,
				{
					headers: { Authorization: `Bearer ${auth.accessToken}` },
				},
			);

			expect(response.status).toBe(200);
			const prompts = (await response.json()) as Array<{ slug: string }>;
			expect(prompts.length).toBeGreaterThan(0);
			expect(prompts.some((p) => p.slug === slug)).toBe(true);
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

	describe("Deep-link routes (history support)", () => {
		test("GET /prompts/:slug returns shell HTML for deep-linking", async () => {
			// First create a prompt to ensure slug exists
			const slug = trackSlug(`deep-link-test-${Date.now()}`);
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Deep Link Test",
							description: "Test deep linking",
							content: "Content",
							tags: [],
						},
					],
				}),
			});

			// Test deep-link route
			const response = await fetch(`${baseUrl}/prompts/${slug}`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const body = await response.text();
			// Should be shell.html with prompts module
			expect(body).toContain("/_m/prompts");
			expect(body).toContain("LIMINAL");
		});

		test("GET /prompts/:slug/edit returns shell HTML for edit mode deep-linking", async () => {
			const slug = trackSlug(`edit-link-test-${Date.now()}`);
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug,
							name: "Edit Link Test",
							description: "Test edit deep linking",
							content: "Content",
							tags: [],
						},
					],
				}),
			});

			const response = await fetch(`${baseUrl}/prompts/${slug}/edit`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const body = await response.text();
			expect(body).toContain("/_m/prompts");
		});

		test("GET /prompts/new returns shell HTML with editor module", async () => {
			const response = await fetch(`${baseUrl}/prompts/new`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
			const body = await response.text();
			// New prompt uses prompt-editor module
			expect(body).toContain("/_m/prompt-editor");
		});
	});
});
