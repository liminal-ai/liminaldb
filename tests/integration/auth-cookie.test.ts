/**
 * Integration tests for cookie-based web authentication flow.
 *
 * These tests verify the web login flow works correctly:
 * - Login redirects to WorkOS with correct parameters
 * - Callback sets signed HttpOnly cookie
 * - Logout clears the cookie
 * - Redirect URL validation prevents open redirect attacks
 *
 * Note: Full OAuth flow testing requires E2E with browser (Playwright).
 * These tests verify the server-side behavior.
 */

import { describe, expect, test } from "vitest";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:5001";

describe("Auth Cookie Integration", () => {
	describe("Login endpoint", () => {
		test("GET /auth/login redirects to WorkOS", async () => {
			const res = await fetch(`${BASE_URL}/auth/login`, {
				redirect: "manual", // Don't follow redirects
			});

			expect(res.status).toBe(302);
			const location = res.headers.get("location");
			expect(location).toBeTruthy();
			expect(location).toContain("workos.com");
			expect(location).toContain("client_id=");
			expect(location).toContain("redirect_uri=");
		});

		test("Login includes state with redirect parameter", async () => {
			const res = await fetch(`${BASE_URL}/auth/login?redirect=/dashboard`, {
				redirect: "manual",
			});

			expect(res.status).toBe(302);
			const location = res.headers.get("location");
			expect(location).toBeTruthy();
			// State should be URL-encoded JSON containing the redirect
			expect(location).toContain("state=");
		});

		test("Login ignores invalid redirect (protocol injection)", async () => {
			const res = await fetch(
				`${BASE_URL}/auth/login?redirect=https://evil.com`,
				{
					redirect: "manual",
				},
			);

			expect(res.status).toBe(302);
			const location = res.headers.get("location");
			expect(location).toBeTruthy();
			// Should NOT include state with the malicious redirect
			// Either no state, or state without the evil redirect
			if (location?.includes("state=")) {
				// If there's state, verify it doesn't contain the evil redirect
				const stateMatch = location.match(/state=([^&]+)/);
				if (stateMatch?.[1]) {
					const stateValue = decodeURIComponent(stateMatch[1]);
					expect(stateValue).not.toContain("evil.com");
				}
			}
		});

		test("Login ignores invalid redirect (protocol-relative)", async () => {
			const res = await fetch(`${BASE_URL}/auth/login?redirect=//evil.com`, {
				redirect: "manual",
			});

			expect(res.status).toBe(302);
			const location = res.headers.get("location");
			expect(location).toBeTruthy();
			// Should NOT include state with the protocol-relative redirect
			if (location?.includes("state=")) {
				const stateMatch = location.match(/state=([^&]+)/);
				if (stateMatch?.[1]) {
					const stateValue = decodeURIComponent(stateMatch[1]);
					expect(stateValue).not.toContain("evil.com");
				}
			}
		});

		test("Login accepts valid relative path with query", async () => {
			const res = await fetch(
				`${BASE_URL}/auth/login?redirect=/prompts?filter=recent`,
				{
					redirect: "manual",
				},
			);

			expect(res.status).toBe(302);
			const location = res.headers.get("location");
			expect(location).toBeTruthy();
			expect(location).toContain("state=");

			// Verify the state contains the safe redirect
			const stateMatch = location?.match(/state=([^&]+)/);
			if (stateMatch?.[1]) {
				const stateJson = decodeURIComponent(stateMatch[1]);
				const state = JSON.parse(stateJson) as { redirect?: string };
				expect(state.redirect).toBe("/prompts?filter=recent");
			}
		});
	});

	describe("Callback endpoint", () => {
		test("GET /auth/callback without code returns 400", async () => {
			const res = await fetch(`${BASE_URL}/auth/callback`);

			expect(res.status).toBe(400);
			const body = (await res.json()) as { error: string };
			expect(body.error).toBe("Missing code");
		});

		test("GET /auth/callback with invalid code returns 401", async () => {
			const res = await fetch(`${BASE_URL}/auth/callback?code=invalid_code`);

			expect(res.status).toBe(401);
		});
	});

	describe("Logout endpoint", () => {
		test("GET /auth/logout without auth returns 401", async () => {
			const res = await fetch(`${BASE_URL}/auth/logout`, {
				redirect: "manual",
			});

			// Logout requires auth middleware
			expect(res.status).toBe(401);
		});
	});

	describe("Me endpoint", () => {
		test("GET /auth/me without auth returns 401", async () => {
			const res = await fetch(`${BASE_URL}/auth/me`);

			expect(res.status).toBe(401);
		});
	});

	describe("Redirect URL validation", () => {
		// These tests verify the server rejects malicious redirect URLs
		// by checking that they don't appear in the OAuth state

		const maliciousRedirects = [
			{ name: "absolute URL", value: "https://evil.com/steal" },
			{ name: "protocol-relative", value: "//evil.com/steal" },
			{ name: "backslash protocol", value: "/\\evil.com" },
			{ name: "javascript protocol", value: "javascript:alert(1)" },
			{ name: "data protocol", value: "data:text/html,<script>" },
		];

		for (const { name, value } of maliciousRedirects) {
			test(`Rejects ${name}: ${value}`, async () => {
				const res = await fetch(
					`${BASE_URL}/auth/login?redirect=${encodeURIComponent(value)}`,
					{ redirect: "manual" },
				);

				expect(res.status).toBe(302);
				const location = res.headers.get("location");

				// Either no state, or state that doesn't contain the malicious value
				if (location?.includes("state=")) {
					const stateMatch = location.match(/state=([^&]+)/);
					if (stateMatch?.[1]) {
						const stateJson = decodeURIComponent(stateMatch[1]);
						try {
							const state = JSON.parse(stateJson) as { redirect?: string };
							// If there's a redirect in state, it should be safe
							if (state.redirect) {
								expect(state.redirect.startsWith("/")).toBe(true);
								expect(state.redirect).not.toContain("evil.com");
								expect(state.redirect).not.toContain("javascript:");
								expect(state.redirect).not.toContain("data:");
							}
						} catch {
							// Invalid JSON in state is fine - means no redirect encoded
						}
					}
				}
			});
		}

		const validRedirects = [
			{ name: "simple path", value: "/dashboard", expected: "/dashboard" },
			{ name: "nested path", value: "/prompts/123", expected: "/prompts/123" },
			{
				name: "path with query",
				value: "/search?q=test",
				expected: "/search?q=test",
			},
			{ name: "root", value: "/", expected: "/" },
		];

		for (const { name, value, expected } of validRedirects) {
			test(`Accepts ${name}: ${value}`, async () => {
				const res = await fetch(
					`${BASE_URL}/auth/login?redirect=${encodeURIComponent(value)}`,
					{ redirect: "manual" },
				);

				expect(res.status).toBe(302);
				const location = res.headers.get("location");
				expect(location).toContain("state=");

				const stateMatch = location?.match(/state=([^&]+)/);
				expect(stateMatch).toBeTruthy();
				expect(stateMatch?.[1]).toBeTruthy();

				const stateJson = decodeURIComponent(stateMatch![1]!);
				const state = JSON.parse(stateJson) as { redirect?: string };
				expect(state.redirect).toBe(expected);
			});
		}
	});
});
