import type { RedisWrapper } from "../../src/lib/redis";

export function createRedisMock(): RedisWrapper & {
	_store: Map<string, string>;
	_sets: Map<string, Set<string>>;
} {
	const store = new Map<string, string>();
	const sets = new Map<string, Set<string>>();

	return {
		_store: store,
		_sets: sets,

		async get(key: string) {
			return store.get(key) ?? null;
		},

		async set(key: string, value: string, _ttlSeconds?: number) {
			store.set(key, value);
			return "OK";
		},

		async del(key: string) {
			const existed = store.has(key) || sets.has(key);
			store.delete(key);
			sets.delete(key);
			return existed ? 1 : 0;
		},

		async sadd(key: string, ...members: string[]) {
			let set = sets.get(key);
			if (!set) {
				set = new Set();
				sets.set(key, set);
			}
			let added = 0;
			for (const member of members) {
				if (!set.has(member)) {
					set.add(member);
					added++;
				}
			}
			return added;
		},

		async smembers(key: string) {
			return Array.from(sets.get(key) ?? []);
		},

		async srem(key: string, ...members: string[]) {
			const set = sets.get(key);
			if (!set) return 0;
			let removed = 0;
			for (const member of members) {
				if (set.delete(member)) removed++;
			}
			return removed;
		},
	};
}
