import { describe, test, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import {
	getTestAuth,
	requireTestAuth,
	type TestAuth,
} from "../../fixtures/auth";
import { requireEnv } from "../../fixtures/env";

/**
 * Integration tests for UI authentication.
 * Tests the auth gate on /prompts routes.
 *
 * Uses existing getTestAuth() fixture which calls real WorkOS
 * with TEST_USER_EMAIL/TEST_USER_PASSWORD env vars.
 */

describe("UI Auth Integration", () => {
	let app: ReturnType<typeof Fastify>;
	const cookieSecret = requireEnv("COOKIE_SECRET");

	async function requireAuth(): Promise<TestAuth> {
		const auth = await getTestAuth();
		if (!auth) {
			throw new Error("Failed to get test auth");
		}
		return auth;
	}

	beforeAll(async () => {
		requireTestAuth();
		await requireAuth();

		// Import routes
		const { registerAppRoutes } = await import("../../../src/routes/app");
		const { registerModuleRoutes } = await import(
			"../../../src/routes/modules"
		);
		const { registerAuthRoutes } = await import("../../../src/routes/auth");

		app = Fastify();
		app.register(cookie, { secret: cookieSecret });
		registerAuthRoutes(app);
		registerAppRoutes(app);
		registerModuleRoutes(app);
		await app.ready();
	});

	afterAll(async () => {
		if (app) await app.close();
	});

	describe("TC-1.1: Unauthenticated redirects to login", () => {
		test("GET /prompts without auth returns 302", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/prompts",
			});

			expect(response.statusCode).toBe(302);
			expect(response.headers.location).toContain("/auth/login");
		});

		test("redirect includes returnTo param", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/prompts",
			});

			expect(response.headers.location).toContain("returnTo");
		});
	});

	describe("TC-1.2: Authenticated returns shell HTML", () => {
		test("GET /prompts with valid token returns 200", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.headers["content-type"]).toContain("text/html");
		});

		test("response contains shell structure", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.body).toContain("shell");
			expect(response.body).toContain("main-module");
		});

		test("shell contains user email", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.body).toContain(auth.email);
		});

		test("shell iframe src is /_m/prompts", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.body).toContain('src="/_m/prompts"');
		});
	});

	describe("TC-1.3: OAuth flow establishes session", () => {
		test("getTestAuth returns valid token", async () => {
			const auth = await requireAuth();

			expect(auth.accessToken).toBeDefined();
			expect(auth.accessToken.length).toBeGreaterThan(0);
		});

		test("token enables subsequent requests", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.statusCode).toBe(200);
		});
	});

	describe("/prompts/new route", () => {
		test("authenticated request returns shell with editor module", async () => {
			const auth = await requireAuth();

			const response = await app.inject({
				method: "GET",
				url: "/prompts/new",
				headers: { authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.statusCode).toBe(200);
			expect(response.body).toContain('src="/_m/prompt-editor"');
		});
	});
});
