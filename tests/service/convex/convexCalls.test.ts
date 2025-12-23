import { describe, expect, test } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

/**
 * Tests for Convex API key authentication pattern.
 *
 * These tests verify that Convex functions properly validate the API key
 * that proves the caller is the trusted Fastify backend.
 */

const hasConvex = (): boolean => !!process.env.CONVEX_URL;
const hasApiKey = (): boolean => !!process.env.CONVEX_API_KEY;

function getConvexClient(): ConvexHttpClient {
	const convexUrl = process.env.CONVEX_URL;
	if (!convexUrl) {
		throw new Error("CONVEX_URL not configured");
	}
	return new ConvexHttpClient(convexUrl);
}

describe("Convex API Key Auth", () => {
	test("healthAuth.check accepts valid apiKey and userId", async () => {
		if (!hasConvex() || !hasApiKey()) {
			throw new Error("CONVEX_URL and CONVEX_API_KEY required for this test");
		}

		const client = getConvexClient();
		const apiKey = process.env.CONVEX_API_KEY as string;
		const testUserId = "user_test_123";

		const result = await client.query(api.healthAuth.check, {
			apiKey,
			userId: testUserId,
		});

		expect(result.status).toBe("ok");
		expect(result.user.subject).toBe(testUserId);
	});

	test("healthAuth.check rejects invalid apiKey", async () => {
		if (!hasConvex()) {
			throw new Error("CONVEX_URL required for this test");
		}

		const client = getConvexClient();
		const invalidApiKey = "invalid_api_key_12345";
		const testUserId = "user_test_123";

		await expect(
			client.query(api.healthAuth.check, {
				apiKey: invalidApiKey,
				userId: testUserId,
			}),
		).rejects.toThrow("Invalid API key");
	});

	test("healthAuth.check rejects missing apiKey", async () => {
		if (!hasConvex()) {
			throw new Error("CONVEX_URL required for this test");
		}

		const client = getConvexClient();
		const testUserId = "user_test_123";

		// Calling without apiKey should fail validation
		// Note: We cast to bypass TypeScript since we're testing runtime validation
		await expect(
			client.query(api.healthAuth.check, {
				userId: testUserId,
			} as { apiKey: string; userId: string }),
		).rejects.toThrow();
	});

	test("healthAuth.check rejects missing userId", async () => {
		if (!hasConvex() || !hasApiKey()) {
			throw new Error("CONVEX_URL and CONVEX_API_KEY required for this test");
		}

		const client = getConvexClient();
		const apiKey = process.env.CONVEX_API_KEY as string;

		// Calling without userId should fail validation
		await expect(
			client.query(api.healthAuth.check, {
				apiKey,
			} as { apiKey: string; userId: string }),
		).rejects.toThrow();
	});
});
