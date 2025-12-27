import { describe, expect, test } from "vitest";

import { validateApiKey } from "../../../convex/auth/apiKey";

describe("API Key Validation", () => {
	const config = {
		current: "current_key_123",
		previous: "previous_key_456",
	};

	test("accepts current key", () => {
		expect(validateApiKey("current_key_123", config)).toBe(true);
	});

	test("accepts previous key", () => {
		expect(validateApiKey("previous_key_456", config)).toBe(true);
	});

	test("rejects invalid key", () => {
		expect(validateApiKey("invalid_key", config)).toBe(false);
	});

	test("rejects empty string", () => {
		expect(validateApiKey("", config)).toBe(false);
	});

	test("rejects null input", () => {
		expect(validateApiKey(null as unknown as string, config)).toBe(false);
	});

	test("rejects undefined input", () => {
		expect(validateApiKey(undefined as unknown as string, config)).toBe(false);
	});
});
