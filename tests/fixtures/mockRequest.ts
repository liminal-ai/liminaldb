/**
 * Mock Fastify request for testing middleware and handlers.
 */

import type { FastifyRequest } from "fastify";

/**
 * Options for creating a mock request.
 */
type MockRequestOptions = {
	headers?: Record<string, string | string[]>;
	cookies?: Record<string, string>;
	url?: string;
	method?: string;
	query?: Record<string, unknown>;
	body?: unknown;
	authorization?: string;
};

/**
 * Minimal mock request type that satisfies the subset of FastifyRequest
 * used by auth middleware and token extraction.
 */
export interface MockRequest {
	headers: Record<string, string | string[] | undefined>;
	cookies: Record<string, string>;
	url: string;
	method: string;
	query: Record<string, unknown>;
	body: unknown;
	unsignCookie: (value: string) => { valid: boolean; value: string | null };
	user?: { id: string; email: string; sessionId: string };
	accessToken?: string;
	protocol?: string;
	hostname?: string;
}

/**
 * Create a mock Fastify request for testing.
 * @param opts - Configuration options for the mock request
 * @returns A mock request object with the specified properties
 */
export function createMockRequest(opts: MockRequestOptions = {}): MockRequest {
	const headers: Record<string, string | string[] | undefined> = {
		...(opts.headers ?? {}),
	};
	if (opts.authorization) {
		headers.authorization = opts.authorization;
	}

	const cookies = { ...(opts.cookies ?? {}) };

	return {
		headers,
		cookies,
		url: opts.url ?? "/api/test",
		method: opts.method ?? "GET",
		query: opts.query ?? {},
		body: opts.body,
		unsignCookie: (value: string): { valid: boolean; value: string | null } => {
			if (!value) {
				return { valid: false, value: null };
			}
			return { valid: true, value };
		},
	};
}

/**
 * Type assertion helper to cast MockRequest to FastifyRequest for middleware testing.
 * This is type-safe because MockRequest implements the subset of FastifyRequest
 * that the auth middleware actually uses.
 * @param mock - The mock request to cast
 * @returns The mock as a FastifyRequest type
 */
export function asFastifyRequest(mock: MockRequest): FastifyRequest {
	return mock as unknown as FastifyRequest;
}
