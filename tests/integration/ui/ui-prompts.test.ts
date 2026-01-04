import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import {
	getTestAuth,
	requireTestAuth,
	type TestAuth,
} from "../../fixtures/auth";
import { requireEnv } from "../../fixtures/env";

/**
 * Integration tests for UI prompts flow.
 * Tests create → list → view happy path using app.inject().
 * Consistent with ui-auth.test.ts pattern.
 */

describe("UI Prompts Integration", () => {
	let app: ReturnType<typeof Fastify>;
	let auth!: TestAuth;
	const createdSlugs: string[] = [];
	const cookieSecret = requireEnv("COOKIE_SECRET");

	beforeAll(async () => {
		requireTestAuth();
		const resolvedAuth = await getTestAuth();
		if (!resolvedAuth) {
			throw new Error("Failed to get test auth");
		}
		auth = resolvedAuth;

		// Import routes
		const { registerAppRoutes } = await import("../../../src/routes/app");
		const { registerModuleRoutes } = await import(
			"../../../src/routes/modules"
		);
		const { registerPromptRoutes } = await import(
			"../../../src/routes/prompts"
		);
		const { registerAuthRoutes } = await import("../../../src/routes/auth");

		app = Fastify();
		app.register(cookie, { secret: cookieSecret });
		registerAuthRoutes(app);
		registerAppRoutes(app);
		registerModuleRoutes(app);
		registerPromptRoutes(app);
		await app.ready();
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	afterEach(async () => {
		// Cleanup created prompts
		for (const slug of createdSlugs) {
			try {
				await app.inject({
					method: "DELETE",
					url: `/api/prompts/${slug}`,
					headers: { authorization: `Bearer ${auth.accessToken}` },
				});
			} catch {
				// Ignore
			}
		}
		createdSlugs.length = 0;
	});

	function trackSlug(slug: string): string {
		createdSlugs.push(slug);
		return slug;
	}

	describe("Happy path: Create and view prompt", () => {
		test("created prompt appears in list API", async () => {
			const slug = trackSlug(`ui-test-${Date.now()}`);

			// Create via API
			const createRes = await app.inject({
				method: "POST",
				url: "/api/prompts",
				headers: {
					authorization: `Bearer ${auth.accessToken}`,
					"content-type": "application/json",
				},
				payload: {
					prompts: [
						{
							slug,
							name: "UI Test Prompt",
							description: "Created for UI test",
							content: "Test content",
							tags: ["ui-test"],
						},
					],
				},
			});

			expect(createRes.statusCode).toBe(201);

			// Fetch list
			const listRes = await app.inject({
				method: "GET",
				url: "/api/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(listRes.statusCode).toBe(200);
			const prompts = listRes.json();
			const found = prompts.find((p: { slug: string }) => p.slug === slug);
			expect(found).toBeDefined();
		});
	});
});
