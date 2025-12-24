import { ConvexHttpClient } from "convex/browser";

const _convexUrl =
	process.env.CONVEX_URL ||
	(process.env.NODE_ENV === "test" ? "http://localhost:3210" : undefined);

if (!_convexUrl) {
	throw new Error("CONVEX_URL environment variable is required");
}

const convexUrl: string = _convexUrl;

/**
 * Convex HTTP client for making Convex calls.
 *
 * For authenticated calls, pass apiKey + userId as function arguments:
 * ```typescript
 * await convex.query(api.someFunction, { apiKey: config.convexApiKey, userId, ...args })
 * ```
 *
 * Convex functions validate the apiKey and use userId for RLS.
 */
export const convex = new ConvexHttpClient(convexUrl);
