/**
 * Investigation script: What do WorkOS tokens look like?
 * Run: bun run scripts/investigate-tokens.ts
 */

import { WorkOS } from "@workos-inc/node";

const apiKey = process.env.WORKOS_API_KEY;
const clientId = process.env.WORKOS_CLIENT_ID;
const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!apiKey || !clientId || !email || !password) {
	console.log(
		"Missing env vars. Need: WORKOS_API_KEY, WORKOS_CLIENT_ID, TEST_USER_EMAIL, TEST_USER_PASSWORD",
	);
	process.exit(1);
}

const workos = new WorkOS(apiKey, { clientId });

async function investigate() {
	console.log("\n=== WorkOS Token Investigation ===\n");

	// 1. Get a token via authenticateWithPassword
	console.log("1. Authenticating with password...");
	const { user, accessToken, refreshToken } =
		await workos.userManagement.authenticateWithPassword({
			email,
			password,
			clientId,
		});

	console.log("\nUser:", {
		id: user.id,
		email: user.email,
		firstName: user.firstName,
	});

	// 2. Analyze the access token
	console.log("\n2. Access Token Analysis:");
	console.log("   Length:", accessToken.length);
	console.log("   Starts with:", accessToken.substring(0, 50) + "...");

	// Check if it's a JWT (three dot-separated parts)
	const parts = accessToken.split(".");
	console.log("   Parts (dot-separated):", parts.length);

	if (parts.length === 3) {
		console.log("   Looks like a JWT!");

		// Decode header and payload (not signature)
		try {
			const header = JSON.parse(Buffer.from(parts[0], "base64url").toString());
			const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());

			console.log("\n   Header:", JSON.stringify(header, null, 2));
			console.log("\n   Payload:", JSON.stringify(payload, null, 2));

			// Check expiration
			if (payload.exp) {
				const expDate = new Date(payload.exp * 1000);
				console.log("\n   Expires:", expDate.toISOString());
				console.log(
					"   Time until expiry:",
					Math.round((payload.exp * 1000 - Date.now()) / 1000 / 60),
					"minutes",
				);
			}
		} catch (e) {
			console.log("   Failed to decode as JWT:", e);
		}
	} else {
		console.log("   Not a JWT - opaque token");
	}

	// 3. Check refresh token
	console.log("\n3. Refresh Token:");
	if (refreshToken) {
		console.log("   Length:", refreshToken.length);
		const refreshParts = refreshToken.split(".");
		console.log("   Parts:", refreshParts.length);
		console.log("   Type:", refreshParts.length === 3 ? "JWT" : "Opaque");
	} else {
		console.log("   No refresh token returned");
	}

	// 4. Check what JWKS URL would be
	console.log("\n4. JWKS URL:");
	const jwksUrl = workos.userManagement.getJwksUrl(clientId);
	console.log("  ", jwksUrl);

	// 5. Check SDK's jwks property
	console.log("\n5. SDK jwks property:");
	console.log("   Type:", typeof workos.userManagement.jwks);
	console.log("   Defined:", workos.userManagement.jwks !== undefined);

	// 6. What methods exist for validation?
	console.log("\n6. Relevant SDK methods:");
	const methods = Object.getOwnPropertyNames(
		Object.getPrototypeOf(workos.userManagement),
	)
		.filter((m) => !m.startsWith("_") && m !== "constructor")
		.filter(
			(m) =>
				m.toLowerCase().includes("auth") ||
				m.toLowerCase().includes("session") ||
				m.toLowerCase().includes("token") ||
				m.toLowerCase().includes("valid") ||
				m.toLowerCase().includes("verify"),
		);
	console.log("  ", methods);
}

investigate().catch(console.error);

// Additional investigation - can we call isValidJwt?
async function checkValidation() {
	console.log("\n=== Validation Methods ===\n");

	// Re-authenticate to get fresh token
	const { accessToken } = await workos.userManagement.authenticateWithPassword({
		email: email!,
		password: password!,
		clientId: clientId!,
	});

	// Try to access isValidJwt - it showed as a method
	const um = workos.userManagement as any;

	console.log("isValidJwt exists:", typeof um.isValidJwt);

	if (typeof um.isValidJwt === "function") {
		try {
			const result = await um.isValidJwt(accessToken);
			console.log("isValidJwt result:", result);
		} catch (e) {
			console.log("isValidJwt error:", e);
		}
	}

	// Check jwks getter
	console.log("\njwks getter type:", typeof um.jwks);
	if (um.jwks) {
		console.log("jwks value type:", typeof um.jwks);
	}
}

checkValidation().catch(console.error);
