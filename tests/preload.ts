/**
 * Test preload - runs before any tests.
 * Fails immediately if env vars aren't loaded (wrong command used).
 * Skips check in CI environments where service tests use mocks.
 */

// Skip check in CI - service tests use mocks, integration tests pass env vars explicitly
if (process.env.CI) {
	console.log(
		"CI environment detected - skipping env var validation (tests use mocks)",
	);
} else {
	const required = ["WORKOS_CLIENT_ID", "WORKOS_API_KEY", "COOKIE_SECRET"];
	const missing = required.filter((key) => !process.env[key]);

	if (missing.length > 0) {
		console.error("\n" + "=".repeat(60));
		console.error("ERROR: Environment variables not loaded!");
		console.error("=".repeat(60));
		console.error("\nYou ran: bun test");
		console.error("You need: bun run test");
		console.error("\nThe package.json script loads .env.local automatically.");
		console.error("Running 'bun test' directly skips this.\n");
		console.error("Missing vars:", missing.join(", "));
		console.error("=".repeat(60) + "\n");
		process.exit(1);
	}
}
