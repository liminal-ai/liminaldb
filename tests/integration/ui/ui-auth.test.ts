import { describe, test, expect, beforeAll } from "vitest";
import {
	getTestAuth,
	requireTestAuth,
	type TestAuth,
} from "../../fixtures/auth";
import { getTestBaseUrl } from "../../fixtures/env";

/**
 * Integration tests for UI authentication.
 * Tests the auth gate on /prompts routes against the real staging server.
 *
 * Uses existing getTestAuth() fixture which calls real WorkOS
 * with TEST_USER_EMAIL/TEST_USER_PASSWORD env vars.
 */

describe("UI Auth Integration", () => {
	let baseUrl: string;
	let auth: TestAuth;

	beforeAll(async () => {
		requireTestAuth();
		baseUrl = getTestBaseUrl();
		const resolvedAuth = await getTestAuth();
		if (!resolvedAuth) {
			throw new Error("Failed to get test auth");
		}
		auth = resolvedAuth;
	});

	describe("TC-1.1: Unauthenticated redirects to login", () => {
		test("GET /prompts without auth returns 302", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				redirect: "manual",
			});

			expect(response.status).toBe(302);
			expect(response.headers.get("location")).toContain("/auth/login");
		});

		test("redirect includes returnTo param", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				redirect: "manual",
			});

			expect(response.headers.get("location")).toContain("returnTo");
		});
	});

	describe("TC-1.2: Authenticated returns shell HTML", () => {
		test("GET /prompts with valid token returns 200", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			expect(response.headers.get("content-type")).toContain("text/html");
		});

		test("response contains shell structure", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			const body = await response.text();
			expect(body).toContain("shell");
			expect(body).toContain("main-module");
		});

		test("shell contains user email", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			const body = await response.text();
			expect(body).toContain(auth.email);
		});

		test("shell iframe src is /_m/prompts", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			const body = await response.text();
			expect(body).toContain('src="/_m/prompts"');
		});
	});

	describe("TC-1.3: OAuth flow establishes session", () => {
		test("getTestAuth returns valid token", () => {
			expect(auth.accessToken).toBeDefined();
			expect(auth.accessToken.length).toBeGreaterThan(0);
		});

		test("token enables subsequent requests", async () => {
			const response = await fetch(`${baseUrl}/prompts`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
		});
	});

	describe("/prompts/new route", () => {
		test("authenticated request returns shell with editor module", async () => {
			const response = await fetch(`${baseUrl}/prompts/new`, {
				headers: { Authorization: `Bearer ${auth.accessToken}` },
			});

			expect(response.status).toBe(200);
			const body = await response.text();
			expect(body).toContain('src="/_m/prompt-editor"');
		});
	});
});
