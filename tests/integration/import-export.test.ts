import { describe, test, expect, beforeAll, afterEach } from "vitest";
import { getTestAuth, requireTestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

describe("Import/Export API Integration", () => {
	let baseUrl: string;
	let authToken: string;
	const createdSlugs: string[] = [];

	beforeAll(async () => {
		requireTestAuth();
		baseUrl = getTestBaseUrl();
		const auth = await getTestAuth();
		if (!auth) {
			throw new Error("Failed to get test auth");
		}
		authToken = auth.accessToken;
	});

	afterEach(async () => {
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

	describe("GET /api/prompts/export", () => {
		test("exports prompts as YAML", async () => {
			const slug = trackSlug(`export-test-${Date.now()}`);

			// Create a prompt first
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
							name: "Export Test",
							description: "Test prompt for export",
							content: "Export test content",
							tags: ["code"],
						},
					],
				}),
			});

			// Export
			const res = await fetch(`${baseUrl}/api/prompts/export`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});

			expect(res.status).toBe(200);
			expect(res.headers.get("content-type")).toBe("application/x-yaml");
			expect(res.headers.get("content-disposition")).toMatch(
				/attachment; filename="liminaldb-prompts-.+\.yaml"/,
			);

			const body = await res.text();
			expect(body).toContain("prompts:");
			expect(body).toContain(slug);
		});
	});

	describe("POST /api/prompts/import", () => {
		test("imports valid YAML prompts", async () => {
			const slug = trackSlug(`import-test-${Date.now()}`);

			const yamlContent = [
				"prompts:",
				`  - slug: ${slug}`,
				"    name: Import Test",
				"    description: Imported prompt",
				"    content: |",
				"      Imported content here",
				"    tags:",
				"      - code",
			].join("\n");

			const res = await fetch(`${baseUrl}/api/prompts/import`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ yaml: yamlContent }),
			});

			expect(res.status).toBe(200);
			const result = (await res.json()) as {
				created: number;
				skipped: string[];
				errors: string[];
			};
			expect(result.created).toBe(1);
			expect(result.skipped).toEqual([]);

			// Verify prompt exists
			const getRes = await fetch(`${baseUrl}/api/prompts/${slug}`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			expect(getRes.status).toBe(200);
		});

		test("skips duplicate slugs on import", async () => {
			const slug = trackSlug(`dup-import-${Date.now()}`);

			// Create prompt first
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
							name: "Existing",
							description: "Already exists",
							content: "Original content",
							tags: [],
						},
					],
				}),
			});

			// Import same slug
			const yamlContent = [
				"prompts:",
				`  - slug: ${slug}`,
				"    name: Duplicate",
				"    description: Should be skipped",
				"    content: Duplicate content",
				"    tags: []",
			].join("\n");

			const res = await fetch(`${baseUrl}/api/prompts/import`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ yaml: yamlContent }),
			});

			expect(res.status).toBe(200);
			const result = (await res.json()) as {
				created: number;
				skipped: string[];
				errors: string[];
			};
			expect(result.created).toBe(0);
			expect(result.skipped).toContain(slug);
		});

		test("returns 400 for invalid YAML", async () => {
			const res = await fetch(`${baseUrl}/api/prompts/import`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ yaml: "not:\n  valid: [yaml syntax" }),
			});

			expect(res.status).toBe(400);
		});
	});

	describe("export → import round-trip", () => {
		test("exported YAML can be re-imported", async () => {
			const slug1 = trackSlug(`roundtrip-a-${Date.now()}`);
			const slug2 = trackSlug(`roundtrip-b-${Date.now()}`);

			// Create prompts
			await fetch(`${baseUrl}/api/prompts`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					prompts: [
						{
							slug: slug1,
							name: "Roundtrip A",
							description: "First prompt",
							content: "Content A",
							tags: ["code"],
						},
						{
							slug: slug2,
							name: "Roundtrip B",
							description: "Second prompt",
							content: "Content B",
							tags: ["review"],
						},
					],
				}),
			});

			// Export
			const exportRes = await fetch(`${baseUrl}/api/prompts/export`, {
				headers: { Authorization: `Bearer ${authToken}` },
			});
			const yamlContent = await exportRes.text();

			// Delete originals
			for (const slug of [slug1, slug2]) {
				await fetch(`${baseUrl}/api/prompts/${slug}`, {
					method: "DELETE",
					headers: { Authorization: `Bearer ${authToken}` },
				});
			}

			// Re-import
			const importRes = await fetch(`${baseUrl}/api/prompts/import`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ yaml: yamlContent }),
			});

			const result = (await importRes.json()) as {
				created: number;
				skipped: string[];
				errors: string[];
			};

			// Should create at least our 2 prompts (may skip others already in the library)
			expect(result.created).toBeGreaterThanOrEqual(2);
		});
	});
});
