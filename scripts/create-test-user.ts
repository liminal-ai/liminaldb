/**
 * Creates a test user in WorkOS for automated testing.
 *
 * Usage:
 *   bun run scripts/create-test-user.ts
 *
 * Requires WORKOS_API_KEY and WORKOS_CLIENT_ID in .env.local
 */

import { WorkOS } from "@workos-inc/node";

const TEST_EMAIL = "test@promptdb.local";
const TEST_PASSWORD = "TestPassword123!";
const TEST_FIRST_NAME = "Test";
const TEST_LAST_NAME = "User";

async function main() {
	const apiKey = process.env.WORKOS_API_KEY;
	const clientId = process.env.WORKOS_CLIENT_ID;

	if (!apiKey) {
		console.error("WORKOS_API_KEY not set in environment");
		process.exit(1);
	}

	if (!clientId) {
		console.error("WORKOS_CLIENT_ID not set in environment");
		process.exit(1);
	}

	const workos = new WorkOS(apiKey, { clientId });

	// Check if user already exists
	console.log(`Checking for existing user: ${TEST_EMAIL}`);

	const existingUsers = await workos.userManagement.listUsers({
		email: TEST_EMAIL,
	});

	let user = existingUsers.data[0];

	if (user) {
		console.log(`User already exists: ${user.id}`);
	} else {
		console.log("Creating test user...");

		user = await workos.userManagement.createUser({
			email: TEST_EMAIL,
			password: TEST_PASSWORD,
			firstName: TEST_FIRST_NAME,
			lastName: TEST_LAST_NAME,
			emailVerified: true,
		});

		console.log(`Created user: ${user.id}`);
	}

	// Verify we can authenticate
	console.log("Verifying authentication...");

	try {
		const { accessToken } = await workos.userManagement.authenticateWithPassword(
			{
				email: TEST_EMAIL,
				password: TEST_PASSWORD,
				clientId,
			},
		);

		console.log("Authentication successful!");
		console.log("");
		console.log("Add these to your .env.local:");
		console.log("----------------------------------------");
		console.log(`TEST_USER_EMAIL=${TEST_EMAIL}`);
		console.log(`TEST_USER_PASSWORD=${TEST_PASSWORD}`);
		console.log("----------------------------------------");
		console.log("");
		console.log("Test user ready for automated testing.");
	} catch (error) {
		console.error("Authentication failed:", error);
		console.error("");
		console.error("The user exists but authentication failed.");
		console.error("Check that Email + Password auth is enabled in WorkOS.");
		process.exit(1);
	}
}

main();
