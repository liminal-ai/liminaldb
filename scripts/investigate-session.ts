/**
 * Investigation: What validates a session? What are the costs?
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
	// Get a token with session
	const { accessToken, user } =
		await workos.userManagement.authenticateWithPassword({
			email,
			password,
			clientId,
		});

	// Decode to get session ID
	const parts = accessToken.split(".");
	const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
	const sessionId = payload.sid;

	console.log("=== Session Investigation ===\n");
	console.log("User ID:", user.id);
	console.log("Session ID:", sessionId);

	// 1. What does getUser actually check?
	console.log("\n1. getUser() - what does it return?");
	const start1 = Date.now();
	const userResult = await workos.userManagement.getUser(user.id);
	console.log(`   Time: ${Date.now() - start1}ms`);
	console.log("   Returns:", Object.keys(userResult));
	// Does it include session info?

	// 2. Is there a way to get/validate a session directly?
	console.log("\n2. listSessions() - can we check if session is valid?");
	const start2 = Date.now();
	const sessions = await workos.userManagement.listSessions(user.id);
	console.log(`   Time: ${Date.now() - start2}ms`);
	console.log("   Session count:", sessions.data.length);
	if (sessions.data.length > 0) {
		const currentSession = sessions.data.find((s) => s.id === sessionId);
		console.log("   Current session found:", !!currentSession);
		if (currentSession) {
			console.log("   Session state:", currentSession);
		}
	}

	// 3. Compare timing of different validation approaches
	console.log("\n3. Timing comparison (5 iterations each):");

	const um = workos.userManagement as {
		isValidJwt?: (token: string) => Promise<unknown>;
	};

	// isValidJwt
	if (typeof um.isValidJwt !== "function") {
		console.log("   isValidJwt() not available on WorkOS SDK");
	} else {
		const jwtTimes: number[] = [];
		for (let i = 0; i < 5; i++) {
			const start = Date.now();
			await um.isValidJwt(accessToken);
			jwtTimes.push(Date.now() - start);
		}
		console.log(
			`   isValidJwt(): ${jwtTimes.join(", ")}ms (avg: ${Math.round(jwtTimes.reduce((a, b) => a + b) / 5)}ms)`,
		);
	}

	// getUser
	const getUserTimes: number[] = [];
	for (let i = 0; i < 5; i++) {
		const start = Date.now();
		await workos.userManagement.getUser(user.id);
		getUserTimes.push(Date.now() - start);
	}
	console.log(
		`   getUser(): ${getUserTimes.join(", ")}ms (avg: ${Math.round(getUserTimes.reduce((a, b) => a + b) / 5)}ms)`,
	);

	// listSessions (if this is how we'd validate session)
	const sessionTimes: number[] = [];
	for (let i = 0; i < 5; i++) {
		const start = Date.now();
		await workos.userManagement.listSessions(user.id);
		sessionTimes.push(Date.now() - start);
	}
	console.log(
		`   listSessions(): ${sessionTimes.join(", ")}ms (avg: ${Math.round(sessionTimes.reduce((a, b) => a + b) / 5)}ms)`,
	);

	// 4. Is there a token introspection endpoint?
	console.log(
		"\n4. Looking for introspection or session validation methods...",
	);
	const methods = Object.getOwnPropertyNames(
		Object.getPrototypeOf(workos.userManagement),
	)
		.filter((m) => !m.startsWith("_") && m !== "constructor")
		.filter(
			(m) =>
				m.toLowerCase().includes("session") ||
				m.toLowerCase().includes("introspect") ||
				m.toLowerCase().includes("valid"),
		);
	console.log("   Relevant methods:", methods);

	// 5. Check if there's anything on the WorkOS object itself
	console.log("\n5. Other WorkOS modules that might help:");
	console.log(
		"   Available:",
		Object.keys(workos).filter((k) => !k.startsWith("_")),
	);
}

investigate().catch(console.error);
