import { describe, test, expect, beforeAll } from "vitest";
import { getTestAuth, requireTestAuth, type TestAuth } from "../fixtures/auth";
import { getTestBaseUrl } from "../fixtures/env";

/**
 * Integration tests for preferences API.
 * Tests against real server with authentication.
 *
 * RED: These tests will FAIL because handlers throw NotImplementedError (500)
 * GREEN: Tests pass when preferences are persisted and retrieved correctly
 */

describe("Preferences Integration", () => {
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

	describe("GET /api/preferences", () => {
		test("TC-INT-1: returns theme for authenticated user", async () => {
			// RED: Gets 500 (NotImplementedError)
			// GREEN: Gets 200 with { theme: "dark-1" } (default)
			const response = await fetch(
				`${baseUrl}/api/preferences?surface=webapp`,
				{
					headers: { Authorization: `Bearer ${auth.accessToken}` },
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data).toHaveProperty("theme");
		});

		test("TC-INT-2: returns 401 without auth", async () => {
			const response = await fetch(`${baseUrl}/api/preferences?surface=webapp`);

			expect(response.status).toBe(401);
		});
	});

	describe("PUT /api/preferences", () => {
		test("TC-INT-3: updates theme preference", async () => {
			// RED: Gets 500 (NotImplementedError)
			// GREEN: Gets 200 with { updated: true }
			const response = await fetch(`${baseUrl}/api/preferences`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					surface: "webapp",
					theme: "light-1",
				}),
			});

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.updated).toBe(true);
		});

		test("TC-INT-4: persisted theme is returned on subsequent GET", async () => {
			// RED: Both calls get 500 (NotImplementedError)
			// GREEN: PUT persists, GET retrieves the same value

			// Set theme
			await fetch(`${baseUrl}/api/preferences`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					surface: "webapp",
					theme: "dark-2",
				}),
			});

			// Get theme
			const response = await fetch(
				`${baseUrl}/api/preferences?surface=webapp`,
				{
					headers: { Authorization: `Bearer ${auth.accessToken}` },
				},
			);

			expect(response.status).toBe(200);
			const data = await response.json();
			expect(data.theme).toBe("dark-2");
		});
	});

	describe("Surface isolation", () => {
		test("TC-INT-5: different surfaces have independent themes", async () => {
			// RED: Gets 500 (NotImplementedError)
			// GREEN: Each surface stores its own theme

			// Set webapp to light-1
			await fetch(`${baseUrl}/api/preferences`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					surface: "webapp",
					theme: "light-1",
				}),
			});

			// Set chatgpt to dark-3
			await fetch(`${baseUrl}/api/preferences`, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${auth.accessToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					surface: "chatgpt",
					theme: "dark-3",
				}),
			});

			// Verify webapp
			const webappRes = await fetch(
				`${baseUrl}/api/preferences?surface=webapp`,
				{
					headers: { Authorization: `Bearer ${auth.accessToken}` },
				},
			);
			expect(webappRes.status).toBe(200);
			const webappData = await webappRes.json();
			expect(webappData.theme).toBe("light-1");

			// Verify chatgpt
			const chatgptRes = await fetch(
				`${baseUrl}/api/preferences?surface=chatgpt`,
				{
					headers: { Authorization: `Bearer ${auth.accessToken}` },
				},
			);
			expect(chatgptRes.status).toBe(200);
			const chatgptData = await chatgptRes.json();
			expect(chatgptData.theme).toBe("dark-3");
		});
	});
});
