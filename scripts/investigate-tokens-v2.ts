/**
 * Investigation script v2: Deeper look at validation
 * Run: bun run scripts/investigate-tokens-v2.ts
 */

import { WorkOS } from "@workos-inc/node";

const apiKey = process.env.WORKOS_API_KEY;
const clientId = process.env.WORKOS_CLIENT_ID;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!apiKey || !clientId || !email || !password) {
	console.log("Missing env vars");
	process.exit(1);
}

const workos = new WorkOS(apiKey, { clientId });

async function investigate() {
	const um = workos.userManagement as any;

	// Get a valid token
	const { accessToken, user } =
		await workos.userManagement.authenticateWithPassword({
			email,
			password,
			clientId,
		});

	console.log("=== isValidJwt Investigation ===\n");

	// 1. Valid token
	console.log("1. Valid token:");
	const validResult = await um.isValidJwt(accessToken);
	console.log("   Result type:", typeof validResult);
	console.log("   Result value:", validResult);

	// 2. Tampered token (change one character)
	console.log("\n2. Tampered token:");
	const tamperedToken = accessToken.slice(0, -5) + "XXXXX";
	try {
		const tamperedResult = await um.isValidJwt(tamperedToken);
		console.log("   Result:", tamperedResult);
	} catch (e: any) {
		console.log("   Error:", e.message || e);
	}

	// 3. Garbage token
	console.log("\n3. Garbage token:");
	try {
		const garbageResult = await um.isValidJwt("not.a.token");
		console.log("   Result:", garbageResult);
	} catch (e: any) {
		console.log("   Error:", e.message || e);
	}

	// 4. Does isValidJwt return claims or just boolean?
	console.log("\n4. Return value inspection:");
	const fullResult = await um.isValidJwt(accessToken);
	console.log("   typeof:", typeof fullResult);
	console.log("   JSON.stringify:", JSON.stringify(fullResult));

	// 5. How to get claims after validation?
	console.log("\n5. Decoding claims (manual):");
	const parts = accessToken.split(".");
	const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
	console.log("   sub (user ID):", payload.sub);
	console.log("   email:", payload.email);
	console.log("   sid (session):", payload.sid);

	// 6. Compare: What would we need to validate + extract user in middleware?
	console.log("\n=== Middleware Pattern Comparison ===\n");

	console.log("Current approach (cookie-based):");
	console.log("   1. Extract userId from signed cookie");
	console.log("   2. Call workos.userManagement.getUser(userId) - API CALL");
	console.log("   3. Get user object back");
	console.log("   Network calls per request: 1");

	console.log("\nPotential Bearer approach:");
	console.log("   1. Extract token from Authorization header");
	console.log(
		"   2. Call isValidJwt(token) - uses cached JWKS, may need occasional refresh",
	);
	console.log("   3. Decode payload to get sub (userId), email");
	console.log(
		"   Network calls per request: 0 (JWKS cached) or 1 (JWKS refresh)",
	);

	// 7. Test timing
	console.log("\n=== Timing Comparison ===\n");

	// Time getUser
	const getUserStart = Date.now();
	await workos.userManagement.getUser(user.id);
	const getUserTime = Date.now() - getUserStart;
	console.log(`getUser() time: ${getUserTime}ms`);

	// Time isValidJwt (first call - may fetch JWKS)
	const validateStart1 = Date.now();
	await um.isValidJwt(accessToken);
	const validateTime1 = Date.now() - validateStart1;
	console.log(`isValidJwt() first call: ${validateTime1}ms`);

	// Time isValidJwt (second call - JWKS cached)
	const validateStart2 = Date.now();
	await um.isValidJwt(accessToken);
	const validateTime2 = Date.now() - validateStart2;
	console.log(`isValidJwt() second call (cached): ${validateTime2}ms`);

	// Third call
	const validateStart3 = Date.now();
	await um.isValidJwt(accessToken);
	const validateTime3 = Date.now() - validateStart3;
	console.log(`isValidJwt() third call (cached): ${validateTime3}ms`);
}

investigate().catch(console.error);
