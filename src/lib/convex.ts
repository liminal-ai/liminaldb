import { ConvexHttpClient } from "convex/browser";

const _convexUrl =
	process.env.CONVEX_URL ||
	(process.env.NODE_ENV === "test" ? "http://localhost:3210" : undefined);

if (!_convexUrl) {
	throw new Error("CONVEX_URL environment variable is required");
}

const convexUrl: string = _convexUrl;

// Unauthenticated client for making Convex calls
// For authenticated calls, pass apiKey + userId as args to Convex functions
export const convex = new ConvexHttpClient(convexUrl);

/**
 * @deprecated Use the `convex` client directly and pass apiKey + userId as function arguments.
 * The new pattern: `await convex.query(api.someFunction, { apiKey, userId, ...otherArgs })`
 * Convex functions validate the apiKey and use userId for RLS.
 */
export function createAuthenticatedClient(
	accessToken: string,
): ConvexHttpClient {
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(accessToken);
	return client;
}
