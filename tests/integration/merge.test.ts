import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { getTestAuth, requireTestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

/**
 * Integration tests for the merge endpoint.
 * Run against the real server via `bun run check:local`.
 */

describe("Merge API Integration", () => {
	let baseUrl: string;
	let authToken: string;
	const testSlug = `merge-test-${Date.now()}`;

	async function getUsageCountFromList(slug: string): Promise<number> {
		const listRes = await fetch(`${baseUrl}/api/prompts`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});
		expect(listRes.status).toBe(200);

		const prompts = (await listRes.json()) as Array<{
			slug: string;
			usageCount?: number;
		}>;
		const prompt = prompts.find((item) => item.slug === slug);
		if (!prompt) {
			throw new Error(`Prompt not found in list response: ${slug}`);
		}

		return prompt.usageCount ?? 0;
	}

	beforeAll(async () => {
		requireTestAuth();
		baseUrl = getTestBaseUrl();
		const auth = await getTestAuth();
		if (!auth) {
			throw new Error("Failed to get test auth");
		}
		authToken = auth.accessToken;

		// Create a test prompt with merge fields
		const createRes = await fetch(`${baseUrl}/api/prompts`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				prompts: [
					{
						slug: testSlug,
						name: "Merge Integration Test",
						description: "Template for merge testing",
						content: "Write {{code}} in {{language}} using {{framework}}",
						tags: ["code"],
					},
				],
			}),
		});

		expect(createRes.status).toBe(201);
	});

	afterAll(async () => {
		// Cleanup
		try {
			await fetch(`${baseUrl}/api/prompts/${testSlug}`, {
				method: "DELETE",
				headers: { Authorization: `Bearer ${authToken}` },
			});
		} catch {
			// Ignore cleanup errors
		}
	});

	test("GET prompt returns mergeFields", async () => {
		const res = await fetch(`${baseUrl}/api/prompts/${testSlug}`, {
			headers: { Authorization: `Bearer ${authToken}` },
		});

		expect(res.status).toBe(200);
		const prompt = (await res.json()) as { mergeFields: string[] };
		expect(prompt.mergeFields).toEqual(["code", "language", "framework"]);
	});

	test("full merge returns correct content", async () => {
		const res = await fetch(`${baseUrl}/api/prompts/${testSlug}/merge`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				values: {
					code: "hello world",
					language: "Python",
					framework: "FastAPI",
				},
			}),
		});

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			content: string;
			mergeFields: string[];
			unfilledFields: string[];
		};
		expect(body.content).toBe("Write hello world in Python using FastAPI");
		expect(body.mergeFields).toEqual(["code", "language", "framework"]);
		expect(body.unfilledFields).toEqual([]);
	});

	test("partial merge preserves unfilled fields", async () => {
		const res = await fetch(`${baseUrl}/api/prompts/${testSlug}/merge`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				values: { code: "hello world" },
			}),
		});

		expect(res.status).toBe(200);
		const body = (await res.json()) as {
			content: string;
			unfilledFields: string[];
		};
		expect(body.content).toBe(
			"Write hello world in {{language}} using {{framework}}",
		);
		expect(body.unfilledFields).toEqual(["language", "framework"]);
	});

	test("usage count incremented after merge", async () => {
		const countBefore = await getUsageCountFromList(testSlug);

		// Perform merge
		const mergeRes = await fetch(`${baseUrl}/api/prompts/${testSlug}/merge`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ values: { code: "test" } }),
		});
		expect(mergeRes.status).toBe(200);

		// Bounded retry for async fire-and-forget usage tracking.
		const timeoutMs = 3000;
		const intervalMs = 100;
		const deadline = Date.now() + timeoutMs;
		let countAfter = countBefore;

		while (Date.now() < deadline) {
			countAfter = await getUsageCountFromList(testSlug);
			if (countAfter >= countBefore + 1) {
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, intervalMs));
		}

		expect(countAfter).toBeGreaterThanOrEqual(countBefore + 1);
	});

	test("401 without auth token", async () => {
		const res = await fetch(`${baseUrl}/api/prompts/${testSlug}/merge`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ values: { code: "test" } }),
		});

		expect(res.status).toBe(401);
	});

	test("400 with missing values key", async () => {
		const res = await fetch(`${baseUrl}/api/prompts/${testSlug}/merge`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${authToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ notValues: "invalid" }),
		});

		expect(res.status).toBe(400);
		const body = (await res.json()) as { error: string };
		expect(body).toHaveProperty("error");
	});

	test("404 with nonexistent slug", async () => {
		const res = await fetch(
			`${baseUrl}/api/prompts/nonexistent-slug-${Date.now()}/merge`,
			{
				method: "POST",
				headers: {
					Authorization: `Bearer ${authToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ values: { code: "test" } }),
			},
		);

		expect(res.status).toBe(404);
		const body = (await res.json()) as { error: string };
		expect(body).toEqual({ error: "Prompt not found" });
	});
});
