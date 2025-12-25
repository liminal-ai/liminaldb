/**
 * Auth fixtures for integration testing.
 *
 * Setup:
 * 1. Run: bun run scripts/create-test-user.ts
 * 2. Add TEST_USER_EMAIL and TEST_USER_PASSWORD to .env.local
 *
 * The fixture authenticates with WorkOS to get a fresh token each test run.
 * Works for local, CI, and staging - each environment has its own test user.
 */

import { WorkOS } from "@workos-inc/node";

export interface TestAuth {
	accessToken: string;
	userId: string;
	email: string;
}

// Cache the auth result within a test run
let cachedAuth: TestAuth | null = null;

/**
 * Get test auth by authenticating with WorkOS.
 * Caches the result for the duration of the test run.
 */
export async function getTestAuth(): Promise<TestAuth | null> {
	if (cachedAuth) {
		return cachedAuth;
	}

	const email = process.env.TEST_USER_EMAIL;
	const password = process.env.TEST_USER_PASSWORD;
	const clientId = process.env.WORKOS_CLIENT_ID;
	const apiKey = process.env.WORKOS_API_KEY;

	if (!email || !password || !clientId || !apiKey) {
		return null;
	}

	try {
		const workos = new WorkOS(apiKey, { clientId });

		const { user, accessToken } =
			await workos.userManagement.authenticateWithPassword({
				email,
				password,
				clientId,
			});

		cachedAuth = {
			accessToken,
			userId: user.id,
			email: user.email,
		};

		return cachedAuth;
	} catch (error) {
		console.error("Failed to authenticate test user:", error);
		return null;
	}
}

/**
 * Check if test auth is configured (env vars present).
 * Does not verify the credentials are valid.
 */
export function hasTestAuth(): boolean {
	return !!(
		process.env.TEST_USER_EMAIL &&
		process.env.TEST_USER_PASSWORD &&
		process.env.WORKOS_CLIENT_ID &&
		process.env.WORKOS_API_KEY
	);
}

/**
 * Clear the cached auth (useful between test suites if needed)
 */
export function clearAuthCache(): void {
	cachedAuth = null;
}
