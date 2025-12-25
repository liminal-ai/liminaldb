import { mock, type Mock } from "bun:test";

interface MockReplyType {
	code: Mock<(status: number) => MockReplyType>;
	status: Mock<(status: number) => MockReplyType>;
	send: Mock<(body: unknown) => MockReplyType>;
	redirect: Mock<(url: string) => MockReplyType>;
	setCookie: Mock<
		(
			name: string,
			value: string,
			options?: Record<string, unknown>,
		) => MockReplyType
	>;
	clearCookie: Mock<(name: string) => MockReplyType>;
	header: Mock<(name: string, value: unknown) => MockReplyType>;
	getStatus: () => number | null;
	getBody: () => unknown;
	getRedirectUrl: () => string | null;
	getCookies: () => Record<string, { value: string; options?: unknown }>;
	getClearedCookies: () => Record<string, boolean>;
	getHeaders: () => Record<string, unknown>;
}

export function createMockReply(): MockReplyType {
	let statusCode: number | null = null;
	let body: unknown = null;
	let redirectUrl: string | null = null;
	const cookies: Record<string, { value: string; options?: unknown }> = {};
	const clearedCookies: Record<string, boolean> = {};
	const headers: Record<string, unknown> = {};

	const reply: MockReplyType = {
		code: mock((status: number) => {
			statusCode = status;
			return reply;
		}),
		status: mock((status: number) => {
			statusCode = status;
			return reply;
		}),
		send: mock((payload: unknown) => {
			body = payload;
			return reply;
		}),
		redirect: mock((url: string) => {
			redirectUrl = url;
			return reply;
		}),
		setCookie: mock(
			(name: string, value: string, options?: Record<string, unknown>) => {
				cookies[name] = { value, options };
				return reply;
			},
		),
		clearCookie: mock((name: string) => {
			clearedCookies[name] = true;
			return reply;
		}),
		header: mock((name: string, value: unknown) => {
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
