import { describe, expect, test, beforeEach, afterAll } from "vitest";

import { validateApiKey, withApiKeyAuth } from "../../convex/auth/apiKey";
import type { ConvexAuthContext } from "../../convex/auth/types";

/**
 * Unit tests for the withApiKeyAuth wrapper and healthAuth behavior.
 *
 * These tests verify:
 * 1. withApiKeyAuth wrapper validates API key correctly
 * 2. userId from args is passed through (not from JWT identity)
 */

// Store original env values
const originalApiKey = process.env.CONVEX_API_KEY;
const originalApiKeyPrevious = process.env.CONVEX_API_KEY_PREVIOUS;

describe("withApiKeyAuth wrapper", () => {
	beforeEach(() => {
		// Set up test API key
		process.env.CONVEX_API_KEY = "test_api_key_12345";
		process.env.CONVEX_API_KEY_PREVIOUS = undefined;
	});

	test("validates API key and calls handler with userId from args", async () => {
		const mockHandler = async (
			ctx: ConvexAuthContext,
			args: { apiKey: string; userId: string; data: string },
		): Promise<{ userId: string; data: string }> => {
			return { userId: args.userId, data: args.data };
		};

		const wrappedHandler = withApiKeyAuth(mockHandler);

		const result = await wrappedHandler(
			{ userId: "", sessionId: "" }, // ctx not used, userId comes from args
			{
				apiKey: "test_api_key_12345",
				userId: "user_from_args_123",
				data: "test data",
			},
		);

		expect(result.userId).toBe("user_from_args_123");
		expect(result.data).toBe("test data");
	});

	test("rejects invalid API key", async () => {
		const mockHandler = async (
			_ctx: ConvexAuthContext,
			args: { apiKey: string; userId: string },
		): Promise<{ userId: string }> => {
			return { userId: args.userId };
		};

		const wrappedHandler = withApiKeyAuth(mockHandler);

		await expect(
			wrappedHandler(
				{ userId: "", sessionId: "" },
				{
					apiKey: "wrong_api_key",
					userId: "user_123",
				},
			),
		).rejects.toThrow("Invalid API key");
	});

	test("rejects missing API key", async () => {
		const mockHandler = async (
			_ctx: ConvexAuthContext,
			args: { apiKey?: string; userId: string },
		): Promise<{ userId: string }> => {
			return { userId: args.userId };
		};

		const wrappedHandler = withApiKeyAuth(mockHandler);

		await expect(
			wrappedHandler(
				{ userId: "", sessionId: "" },
				{
					userId: "user_123",
				},
			),
		).rejects.toThrow("Invalid API key");
	});

	test("accepts previous API key during rotation", async () => {
		process.env.CONVEX_API_KEY = "new_api_key";
		process.env.CONVEX_API_KEY_PREVIOUS = "old_api_key";

		const mockHandler = async (
			_ctx: ConvexAuthContext,
			args: { apiKey: string; userId: string },
		): Promise<{ userId: string }> => {
			return { userId: args.userId };
		};

		const wrappedHandler = withApiKeyAuth(mockHandler);

		// Old key should still work
		const result = await wrappedHandler(
			{ userId: "", sessionId: "" },
			{
				apiKey: "old_api_key",
				userId: "user_123",
			},
		);

		expect(result.userId).toBe("user_123");
	});

	// Restore original env values after all tests
	afterAll(() => {
		if (originalApiKey !== undefined) {
			process.env.CONVEX_API_KEY = originalApiKey;
		}
		if (originalApiKeyPrevious !== undefined) {
			process.env.CONVEX_API_KEY_PREVIOUS = originalApiKeyPrevious;
		}
	});
});

describe("validateApiKey function", () => {
	beforeEach(() => {
		process.env.CONVEX_API_KEY = "valid_key_123";
		process.env.CONVEX_API_KEY_PREVIOUS = undefined;
	});

	// Restore original env values after all tests
	afterAll(() => {
		if (originalApiKey !== undefined) {
			process.env.CONVEX_API_KEY = originalApiKey;
		} else {
			delete process.env.CONVEX_API_KEY;
		}
		if (originalApiKeyPrevious !== undefined) {
			process.env.CONVEX_API_KEY_PREVIOUS = originalApiKeyPrevious;
		} else {
			delete process.env.CONVEX_API_KEY_PREVIOUS;
		}
	});

	test("returns true for valid current key", () => {
		expect(validateApiKey("valid_key_123")).toBe(true);
	});

	test("returns false for invalid key", () => {
		expect(validateApiKey("invalid_key")).toBe(false);
	});

	test("returns false for null key", () => {
		expect(validateApiKey(null)).toBe(false);
	});

	test("returns false for undefined key", () => {
		expect(validateApiKey(undefined)).toBe(false);
	});

	test("returns false for empty string key", () => {
		expect(validateApiKey("")).toBe(false);
	});

	test("returns true for previous key during rotation", () => {
		process.env.CONVEX_API_KEY_PREVIOUS = "previous_key_456";
		expect(validateApiKey("previous_key_456")).toBe(true);
	});

	test("uses config override when provided", () => {
		const config = {
			current: "config_key_789",
			previous: null,
		};
		expect(validateApiKey("config_key_789", config)).toBe(true);
		expect(validateApiKey("valid_key_123", config)).toBe(false);
	});
});
