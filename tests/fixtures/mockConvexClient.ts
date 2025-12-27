import { vi } from "vitest";

export interface MockConvexClient {
	mutation: ReturnType<typeof vi.fn>;
	query: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock Convex HTTP client for service tests.
 * Unlike Phase 1 which mocked ctx.db, this mocks the entire Convex client.
 */
export function createMockConvexClient(): MockConvexClient {
	return {
		mutation: vi.fn(() => Promise.resolve([])),
		query: vi.fn(() => Promise.resolve(null)),
	};
}
