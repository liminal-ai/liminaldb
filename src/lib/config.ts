/**
 * Validated configuration from environment variables.
 * All required variables are validated at import time, failing fast
 * if configuration is missing rather than at first use.
 */

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} environment variable required`);
	}
	return value;
}

function optionalEnv(name: string): string | undefined {
	return process.env[name];
}

/**
 * Application configuration with validated environment variables.
 * Import this instead of accessing process.env directly.
 */
export const config = {
	/** API key for authenticating Fastify to Convex */
	convexApiKey: requireEnv("CONVEX_API_KEY"),

	/** Convex deployment URL */
	convexUrl: requireEnv("CONVEX_URL"),

	/** WorkOS API key for SDK calls */
	workosApiKey: requireEnv("WORKOS_API_KEY"),

	/** WorkOS client/application ID */
	workosClientId: requireEnv("WORKOS_CLIENT_ID"),

	/** OAuth callback URL */
	workosRedirectUri: requireEnv("WORKOS_REDIRECT_URI"),

	/** Secret for signing HttpOnly cookies */
	cookieSecret: requireEnv("COOKIE_SECRET"),

	/** Node environment (development, production, test) */
	nodeEnv: optionalEnv("NODE_ENV") ?? "development",

	/** Whether running in production */
	isProduction: process.env.NODE_ENV === "production",

	/** Whether running in test mode */
	isTest: process.env.NODE_ENV === "test",
} as const;
