/**
 * Mock Fastify reply for testing middleware and handlers.
 */

import type { FastifyReply } from "fastify";
import { vi, type MockInstance } from "vitest";

/**
 * Interface for the mock Fastify reply object.
 */
export interface MockReplyType {
	code: MockInstance<(status: number) => MockReplyType>;
	status: MockInstance<(status: number) => MockReplyType>;
	send: MockInstance<(body: unknown) => MockReplyType>;
	redirect: MockInstance<(url: string) => MockReplyType>;
	setCookie: MockInstance<
		(
			name: string,
			value: string,
			options?: Record<string, unknown>,
		) => MockReplyType
	>;
	clearCookie: MockInstance<(name: string) => MockReplyType>;
	header: MockInstance<(name: string, value: unknown) => MockReplyType>;
	getStatus: () => number | null;
	getBody: () => unknown;
	getRedirectUrl: () => string | null;
	getCookies: () => Record<string, { value: string; options?: unknown }>;
	getClearedCookies: () => Record<string, boolean>;
	getHeaders: () => Record<string, unknown>;
}

/**
 * Create a mock Fastify reply object for testing.
 * Tracks status codes, bodies, redirects, cookies, and headers.
 * @returns A mock reply object with tracking getters
 */
export function createMockReply(): MockReplyType {
	let statusCode: number | null = null;
	let body: unknown = null;
	let redirectUrl: string | null = null;
	const cookies: Record<string, { value: string; options?: unknown }> = {};
	const clearedCookies: Record<string, boolean> = {};
	const headers: Record<string, unknown> = {};

	const reply: MockReplyType = {
		code: vi.fn((status: number) => {
			statusCode = status;
			return reply;
		}),
		status: vi.fn((status: number) => {
			statusCode = status;
			return reply;
		}),
		send: vi.fn((payload: unknown) => {
			body = payload;
			return reply;
		}),
		redirect: vi.fn((url: string) => {
			redirectUrl = url;
			return reply;
		}),
		setCookie: vi.fn(
			(name: string, value: string, options?: Record<string, unknown>) => {
				cookies[name] = { value, options };
				return reply;
			},
		),
		clearCookie: vi.fn((name: string) => {
			clearedCookies[name] = true;
			return reply;
		}),
		header: vi.fn((name: string, value: unknown) => {
			headers[name] = value;
			return reply;
		}),
		getStatus: () => statusCode,
		getBody: () => body,
		getRedirectUrl: () => redirectUrl,
		getCookies: () => cookies,
		getClearedCookies: () => clearedCookies,
		getHeaders: () => headers,
	};

	return reply;
}

/**
 * Type assertion helper to cast MockReplyType to FastifyReply for middleware testing.
 * @param mock - The mock reply to cast
 * @returns The mock as a FastifyReply type
 */
export function asFastifyReply(mock: MockReplyType): FastifyReply {
	return mock as unknown as FastifyReply;
}
