/**
 * Unit tests for Redis caching logic.
 * Tests cache versioning and preference caching behavior.
 */

import { describe, test, expect, vi, beforeEach } from "vitest";

// Mock config before importing redis
vi.mock("../../src/lib/config", () => ({
	config: {
		redisUrl: "redis://localhost:6379",
	},
}));

// Create a mock Redis client that stores data in memory
const mockStorage = new Map<string, string>();
const mockRedisClient = {
	get: vi.fn((key: string) => Promise.resolve(mockStorage.get(key) ?? null)),
	set: vi.fn((key: string, value: string) => {
		mockStorage.set(key, value);
		return Promise.resolve("OK" as const);
	}),
	del: vi.fn((key: string) => {
		const existed = mockStorage.has(key);
		mockStorage.delete(key);
		return Promise.resolve(existed ? 1 : 0);
	}),
	sadd: vi.fn(() => Promise.resolve(1)),
	smembers: vi.fn(() => Promise.resolve([])),
	srem: vi.fn(() => Promise.resolve(1)),
	expire: vi.fn(() => Promise.resolve(1)),
};

// Mock the entire redis module to use our mock client
vi.mock("bun", () => ({
	RedisClient: vi.fn(() => mockRedisClient),
}));

describe("Redis Cache Versioning", () => {
	beforeEach(() => {
		mockStorage.clear();
		vi.clearAllMocks();
	});

	test("TC-CACHE-1: getCachedPreferences returns null for missing cache", async () => {
		const { getCachedPreferences, setRedisClient } = await import(
			"../../src/lib/redis"
		);
		setRedisClient(mockRedisClient);

		const result = await getCachedPreferences("user_123");
		expect(result).toBeNull();
	});

	test("TC-CACHE-2: getCachedPreferences returns null for stale cache version", async () => {
		const { getCachedPreferences, setRedisClient } = await import(
			"../../src/lib/redis"
		);
		setRedisClient(mockRedisClient);

		// Simulate stale cache with old version
		const staleData = {
			themes: { webapp: "dark-1" },
			_version: 0, // Old version (current is 1)
		};
		mockStorage.set("liminal:prefs:user_123", JSON.stringify(staleData));

		const result = await getCachedPreferences("user_123");
		expect(result).toBeNull(); // Should reject stale cache
	});

	test("TC-CACHE-3: getCachedPreferences returns data for current cache version", async () => {
		const { getCachedPreferences, setRedisClient } = await import(
			"../../src/lib/redis"
		);
		const { PREFERENCES_CACHE_VERSION } = await import(
			"../../src/schemas/preferences"
		);
		setRedisClient(mockRedisClient);

		// Simulate valid cache with current version
		const validData = {
			themes: { webapp: "dark-2", chatgpt: "light-1" },
			_version: PREFERENCES_CACHE_VERSION,
		};
		mockStorage.set("liminal:prefs:user_456", JSON.stringify(validData));

		const result = await getCachedPreferences("user_456");
		expect(result).toEqual({
			themes: { webapp: "dark-2", chatgpt: "light-1" },
		});
	});

	test("TC-CACHE-4: setCachedPreferences stores data with current version", async () => {
		const { setCachedPreferences, setRedisClient } = await import(
			"../../src/lib/redis"
		);
		const { PREFERENCES_CACHE_VERSION } = await import(
			"../../src/schemas/preferences"
		);
		setRedisClient(mockRedisClient);

		await setCachedPreferences("user_789", {
			themes: { webapp: "light-2" },
		});

		const stored = mockStorage.get("liminal:prefs:user_789");
		expect(stored).toBeDefined();
		const parsed = JSON.parse(stored!);
		expect(parsed._version).toBe(PREFERENCES_CACHE_VERSION);
		expect(parsed.themes.webapp).toBe("light-2");
	});

	test("TC-CACHE-5: getCachedPreferences handles malformed JSON gracefully", async () => {
		const { getCachedPreferences, setRedisClient } = await import(
			"../../src/lib/redis"
		);
		setRedisClient(mockRedisClient);

		// Store malformed JSON
		mockStorage.set("liminal:prefs:user_bad", "not-valid-json");

		const result = await getCachedPreferences("user_bad");
		expect(result).toBeNull(); // Should handle gracefully
	});
});
