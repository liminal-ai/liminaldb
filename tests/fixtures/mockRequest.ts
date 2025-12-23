type MockRequestOptions = {
	headers?: Record<string, string | string[]>;
	cookies?: Record<string, string>;
	url?: string;
	method?: string;
	query?: Record<string, unknown>;
	body?: unknown;
	authorization?: string;
};

export function createMockRequest(opts: MockRequestOptions = {}) {
	const headers = { ...(opts.headers ?? {}) };
	if (opts.authorization) {
		headers.authorization = opts.authorization;
	}

	const cookies = { ...(opts.cookies ?? {}) };

	return {
		headers,
		cookies,
		url: opts.url ?? "/",
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
