/**
 * Environment variable utilities for tests.
 */

/**
 * Require an environment variable to be set.
 * @param name - The name of the environment variable
 * @returns The value of the environment variable
 * @throws Error if the environment variable is not set
 */
export function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required env var: ${name}`);
	}
	return value;
}

/**
 * Get the base URL for test requests.
 * @returns The TEST_BASE_URL environment variable value
 */
export function getTestBaseUrl(): string {
	return requireEnv("TEST_BASE_URL");
}
