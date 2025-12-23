import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from "jose";
import type { JwtValidationResult } from "./types";

// Lazily initialized JWKS for caching
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
	if (jwks) {
		return jwks;
	}

	const clientId = process.env.WORKOS_CLIENT_ID;
	if (!clientId) {
		throw new Error("WORKOS_CLIENT_ID environment variable required");
	}

	const jwksUrl = new URL(`https://api.workos.com/sso/jwks/${clientId}`);
	jwks = createRemoteJWKSet(jwksUrl);
	return jwks;
}

/**
 * Returns the valid issuers for WorkOS JWT validation.
 * WorkOS may use either issuer format depending on the token type.
 */
function getValidIssuers(): string[] {
	const clientId = process.env.WORKOS_CLIENT_ID;
	if (!clientId) {
		throw new Error("WORKOS_CLIENT_ID environment variable required");
	}

	return [
		"https://api.workos.com/",
		`https://api.workos.com/user_management/${clientId}`,
	];
}

export async function validateJwt(token: string): Promise<JwtValidationResult> {
	if (!token) {
		return { valid: false, error: "Not authenticated" };
	}

	try {
		const keySet = getJwks();
		const issuers = getValidIssuers();
		const audience = process.env.WORKOS_CLIENT_ID;

		if (!audience) {
			throw new Error("WORKOS_CLIENT_ID environment variable required");
		}

		await jwtVerify(token, keySet, {
			issuer: issuers,
			audience,
		});

		return { valid: true };
	} catch (error) {
		if (error instanceof joseErrors.JWTExpired) {
			return { valid: false, error: "Token expired" };
		}

		// Network/fetch errors - service unavailable
		if (error instanceof TypeError && error.message.includes("fetch")) {
			return { valid: false, error: "Authentication service unavailable" };
		}

		// All other jose errors map to "Invalid token"
		if (
			error instanceof joseErrors.JWTClaimValidationFailed ||
			error instanceof joseErrors.JWSSignatureVerificationFailed ||
			error instanceof joseErrors.JWTInvalid
		) {
			return { valid: false, error: "Invalid token" };
		}

		// For any other errors (network issues, unexpected), still return invalid
		return { valid: false, error: "Invalid token" };
	}
}

/**
 * Clears the cached JWKS. Useful for testing.
 */
export function clearJwksCache(): void {
	jwks = null;
}
