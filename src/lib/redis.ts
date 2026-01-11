import { RedisClient } from "bun";
import { config } from "./config";
import { PREFERENCES_CACHE_VERSION } from "../schemas/preferences";

export class NotImplementedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "NotImplementedError";
	}
}

export interface RedisWrapper {
	get(key: string): Promise<string | null>;
	set(key: string, value: string, ttlSeconds?: number): Promise<"OK" | null>;
	del(key: string): Promise<number>;
	sadd(key: string, ...members: string[]): Promise<number>;
	smembers(key: string): Promise<string[]>;
	srem(key: string, ...members: string[]): Promise<number>;
	expire(key: string, ttlSeconds: number): Promise<number>;
}

let client: RedisWrapper | null = null;

export const getRedis = (): RedisWrapper => {
	if (!config.redisUrl) {
		throw new Error("REDIS_URL not configured");
	}

	if (!client) {
		const raw = new RedisClient(config.redisUrl);
		client = {
			get: (key) => raw.get(key),
			set: async (key, value, ttlSeconds) => {
				if (ttlSeconds !== undefined) {
					return raw.set(key, value, "EX", ttlSeconds);
				}
				return raw.set(key, value);
			},
			del: (key) => raw.del(key),
			sadd: (key, ...members) => raw.sadd(key, ...members),
			smembers: (key) => raw.smembers(key),
			srem: (key, ...members) => raw.srem(key, ...members),
			expire: (key, ttlSeconds) => raw.expire(key, ttlSeconds),
		};
	}

	return client;
};

// For testing - allows injecting a mock
export const setRedisClient = (mockClient: RedisWrapper | null) => {
	client = mockClient;
};

// Preference cache helpers
const PREFERENCES_TTL_SECONDS = 24 * 60 * 60; // 24 hours

function getPreferencesCacheKey(userId: string): string {
	return `liminal:prefs:${userId}`;
}

export interface CachedPreferences {
	themes: {
		webapp?: string;
		chatgpt?: string;
		vscode?: string;
	};
}

interface VersionedCachedPreferences extends CachedPreferences {
	_version: number;
}

/**
 * Get cached preferences for a user.
 * Returns null if not cached or if cache version is stale.
 */
export async function getCachedPreferences(
	userId: string,
): Promise<CachedPreferences | null> {
	try {
		const redis = getRedis();
		const cached = await redis.get(getPreferencesCacheKey(userId));
		if (!cached) {
			return null;
		}
		const parsed = JSON.parse(cached) as VersionedCachedPreferences;
		// Check cache version - reject stale cache from before theme rename
		if (parsed._version !== PREFERENCES_CACHE_VERSION) {
			return null;
		}
		return { themes: parsed.themes };
	} catch {
		// Cache miss or error - return null to fall back to Convex
		return null;
	}
}

/**
 * Cache preferences for a user.
 * Includes version for cache invalidation on theme changes.
 */
export async function setCachedPreferences(
	userId: string,
	preferences: CachedPreferences,
): Promise<void> {
	try {
		const redis = getRedis();
		const versioned: VersionedCachedPreferences = {
			...preferences,
			_version: PREFERENCES_CACHE_VERSION,
		};
		await redis.set(
			getPreferencesCacheKey(userId),
			JSON.stringify(versioned),
			PREFERENCES_TTL_SECONDS,
		);
	} catch {
		// Silently fail - cache is optional optimization
	}
}

/**
 * Invalidate cached preferences for a user.
 */
export async function invalidateCachedPreferences(
	userId: string,
): Promise<void> {
	try {
		const redis = getRedis();
		await redis.del(getPreferencesCacheKey(userId));
	} catch {
		// Silently fail - cache invalidation is best-effort
	}
}
