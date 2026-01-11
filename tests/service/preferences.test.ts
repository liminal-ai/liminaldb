/**
 * Service tests for preferences API routes.
 * Tests API route wiring and validation.
 *
 * Skeleton-Red Phase: Tests assert real behavior and will ERROR
 * because handlers throw NotImplementedError.
 */

import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestJwt } from "../fixtures";

// Mock JWT validator
vi.mock("../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

// Mock config
vi.mock("../../src/lib/config", () => ({
	config: {
		convexApiKey: "test_api_key",
		convexUrl: "http://localhost:9999",
		redisUrl: "redis://localhost:6379",
	},
}));

// Mock redis
vi.mock("../../src/lib/redis", () => ({
	getCachedPreferences: vi.fn().mockResolvedValue(null),
	setCachedPreferences: vi.fn().mockResolvedValue(undefined),
	invalidateCachedPreferences: vi.fn().mockResolvedValue(undefined),
}));

// Mock convex
vi.mock("../../src/lib/convex", () => ({
	convex: {
		query: vi.fn().mockResolvedValue(null),
		mutation: vi.fn().mockResolvedValue(true),
	},
}));

describe("Preferences API", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		const { registerPreferencesRoutes } = await import(
			"../../src/routes/preferences"
		);
		app = Fastify();
		registerPreferencesRoutes(app);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	describe("GET /api/preferences", () => {
		test("TC-1: requires authentication", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/preferences?surface=webapp",
			});
			expect(response.statusCode).toBe(401);
		});

		test("TC-2: returns 400 for invalid surface", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/preferences?surface=invalid-surface",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(400);
			expect(JSON.parse(response.body)).toEqual({ error: "Invalid surface" });
		});

		test("TC-3: returns theme for valid surface", async () => {
			// RED: Expects 200 with theme, gets 500 (NotImplementedError)
			// GREEN: Handler returns { theme: "dark-1" }
			const response = await app.inject({
				method: "GET",
				url: "/api/preferences?surface=webapp",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(200);
			const data = JSON.parse(response.body);
			expect(data).toHaveProperty("theme");
		});

		test("TC-4: defaults to webapp surface when not specified", async () => {
			// RED: Expects 200, gets 500 (NotImplementedError)
			// GREEN: Handler defaults surface to "webapp" and returns theme
			const response = await app.inject({
				method: "GET",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
			});

			expect(response.statusCode).toBe(200);
			const data = JSON.parse(response.body);
			expect(data).toHaveProperty("theme");
		});
	});

	describe("PUT /api/preferences", () => {
		test("TC-5: requires authentication", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				payload: { surface: "webapp", theme: "dark-1" },
			});
			expect(response.statusCode).toBe(401);
		});

		test("TC-6: returns 400 for invalid theme", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: { surface: "webapp", theme: "invalid-theme" },
			});

			expect(response.statusCode).toBe(400);
			expect(JSON.parse(response.body)).toEqual({ error: "Invalid theme" });
		});

		test("TC-7: returns 400 for invalid surface", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: { surface: "invalid-surface", theme: "dark-1" },
			});

			expect(response.statusCode).toBe(400);
			expect(JSON.parse(response.body)).toEqual({ error: "Invalid surface" });
		});

		test("TC-8: returns 400 when surface missing", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: { theme: "dark-1" },
			});

			expect(response.statusCode).toBe(400);
			expect(JSON.parse(response.body)).toEqual({ error: "Invalid surface" });
		});

		test("TC-9: returns 400 when theme missing", async () => {
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: { surface: "webapp" },
			});

			expect(response.statusCode).toBe(400);
			expect(JSON.parse(response.body)).toEqual({ error: "Invalid theme" });
		});

		test("TC-10: updates theme preference", async () => {
			// RED: Expects 200 with { updated: true }, gets 500 (NotImplementedError)
			// GREEN: Handler persists preference and returns success
			const response = await app.inject({
				method: "PUT",
				url: "/api/preferences",
				headers: {
					authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
				},
				payload: { surface: "webapp", theme: "light-1" },
			});

			expect(response.statusCode).toBe(200);
			const data = JSON.parse(response.body);
			expect(data.updated).toBe(true);
		});
	});
});
