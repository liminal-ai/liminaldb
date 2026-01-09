import { RedisClient } from "bun";
import { config } from "./config";

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
