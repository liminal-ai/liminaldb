import { mock } from "bun:test";

export interface MockConvexClient {
	mutation: ReturnType<typeof mock>;
	query: ReturnType<typeof mock>;
}

/**
 * Create a mock Convex HTTP client for service tests.
 * Unlike Phase 1 which mocked ctx.db, this mocks the entire Convex client.
 */
export function createMockConvexClient(): MockConvexClient {
	return {
		mutation: mock(() => Promise.resolve([])),
		query: mock(() => Promise.resolve(null)),
	};
}
