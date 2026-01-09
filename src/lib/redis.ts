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
}

const client: RedisWrapper | null = null;

export const getRedis = (): RedisWrapper => {
	throw new NotImplementedError("Redis client not implemented");
};
