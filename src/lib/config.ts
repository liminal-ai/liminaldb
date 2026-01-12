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
 * Widget sandbox origin pattern for ChatGPT widgets.
 * Widgets run on *.web-sandbox.oaiusercontent.com
 */
export const WIDGET_SANDBOX_ORIGIN_PATTERN =
	/^https:\/\/[a-z0-9-]+\.web-sandbox\.oaiusercontent\.com$/;

/**
 * Parse CORS origins from environment variable.
 * Expects comma-separated list of origins (e.g., "https://app.example.com,https://admin.example.com")
 */
function parseCorsOrigins(): (string | RegExp)[] | true {
	const isProduction = process.env.NODE_ENV === "production";

	if (!isProduction) {
		// Development/test: allow all origins
		return true;
	}

	const originsEnv = process.env.CORS_ALLOWED_ORIGINS;
	if (!originsEnv) {
		// Production without explicit origins: only allow widget sandbox
		// This ensures widgets still work while forcing explicit config for web app
		return [WIDGET_SANDBOX_ORIGIN_PATTERN];
	}

	// Include configured origins plus widget sandbox pattern
	const configuredOrigins = originsEnv
		.split(",")
		.map((origin) => origin.trim());
	return [...configuredOrigins, WIDGET_SANDBOX_ORIGIN_PATTERN];
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

	/** WorkOS AuthKit server URL for MCP OAuth issuer validation */
	workosAuthServerUrl: optionalEnv("WORKOS_AUTH_SERVER_URL"),

	/** MCP resource URL for OAuth protected resource metadata */
	mcpResourceUrl: optionalEnv("MCP_RESOURCE_URL"),

	/** Node environment (development, production, test) */
	nodeEnv: optionalEnv("NODE_ENV") ?? "development",

	/** Whether running in production */
	isProduction: process.env.NODE_ENV === "production",

	/** Whether running in test mode */
	isTest: process.env.NODE_ENV === "test",

	/**
	 * CORS allowed origins.
	 * In development/test: true (allow all origins)
	 * In production: parsed from CORS_ALLOWED_ORIGINS env var
	 */
	corsOrigins: parseCorsOrigins(),

	/** Redis URL for durable drafts */
	redisUrl: optionalEnv("REDIS_URL"),

	/** Public API URL for widget CORS and API calls (defaults to localhost for dev) */
	publicApiUrl: optionalEnv("PUBLIC_API_URL") ?? "http://localhost:5001",

	/** Secret for signing widget JWT tokens (optional - only required when using widgets) */
	widgetJwtSecret: optionalEnv("WIDGET_JWT_SECRET"),
} as const;
