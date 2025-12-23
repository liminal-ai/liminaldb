import type { ApiKeyConfig, ConvexAuthContext } from "./types";

/**
 * Performs constant-time string comparison to prevent timing attacks.
 * Uses XOR comparison to ensure all bytes are compared regardless of differences.
 * Returns false immediately if lengths differ (unavoidable timing leak,
 * but length is not sensitive for API key validation).
 *
 * Note: This implementation runs in Convex's Edge runtime which doesn't have
 * Node.js crypto. We use a manual XOR-based comparison that ensures all
 * characters are compared regardless of when differences are found.
 */
function constantTimeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		// XOR the character codes - result will be non-zero if any differ
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export function validateApiKey(
	apiKey: string | null | undefined,
	config?: ApiKeyConfig,
): boolean {
	if (!apiKey) {
		return false;
	}

	const current = config?.current ?? process.env.CONVEX_API_KEY;
	const previous = config?.previous ?? process.env.CONVEX_API_KEY_PREVIOUS;

	const matchesCurrent = current ? constantTimeEqual(apiKey, current) : false;
	const matchesPrevious = previous
		? constantTimeEqual(apiKey, previous)
		: false;

	// Force both comparisons to always execute (no short-circuit timing leak)
	// Using array includes avoids || short-circuit evaluation
	const matches = [matchesCurrent, matchesPrevious];
	return matches.includes(true);
}

export function withApiKeyAuth<TArgs extends { apiKey?: string }, TResult>(
	handler: (ctx: ConvexAuthContext, args: TArgs) => Promise<TResult> | TResult,
	config?: ApiKeyConfig,
): (ctx: ConvexAuthContext, args: TArgs) => Promise<TResult> | TResult {
	return async (ctx, args) => {
		const valid = validateApiKey(args.apiKey, config);
		if (!valid) {
			throw new Error("Invalid API key");
		}
		return handler(ctx, args);
	};
}
