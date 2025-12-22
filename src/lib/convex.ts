import { ConvexHttpClient } from "convex/browser";

const _convexUrl = process.env.CONVEX_URL;

if (!_convexUrl) {
	throw new Error("CONVEX_URL environment variable is required");
}

const convexUrl: string = _convexUrl;

// Unauthenticated client for public queries
export const convex = new ConvexHttpClient(convexUrl);

// Create authenticated client for a specific request
export function createAuthenticatedClient(accessToken: string): ConvexHttpClient {
	const client = new ConvexHttpClient(convexUrl);
	client.setAuth(accessToken);
	return client;
}
