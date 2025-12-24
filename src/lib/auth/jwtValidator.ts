import { jwtVerify, createRemoteJWKSet, errors as joseErrors } from "jose";
import type { JwtValidationResult } from "./types";
import { config } from "../config";

// Lazily initialized JWKS for caching
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

function getJwks(): ReturnType<typeof createRemoteJWKSet> {
	if (jwks) {
		return jwks;
	}

	const jwksUrl = new URL(
		`https://api.workos.com/sso/jwks/${config.workosClientId}`,
	);
	jwks = createRemoteJWKSet(jwksUrl);
	return jwks;
}

/**
 * Returns the valid issuers for WorkOS JWT validation.
 * WorkOS may use either issuer format depending on the token type:
 * - User Management API tokens use api.workos.com issuers
 * - AuthKit OAuth2 tokens (MCP/DCR) use the AuthKit server URL as issuer
 */
function getValidIssuers(): string[] {
	const issuers = [
		"https://api.workos.com/",
		`https://api.workos.com/user_management/${config.workosClientId}`,
	];

	// Add AuthKit OAuth2 issuer for MCP/DCR tokens
	if (config.workosAuthServerUrl) {
		issuers.push(config.workosAuthServerUrl);
	}

	return issuers;
}

export async function validateJwt(token: string): Promise<JwtValidationResult> {
	if (!token) {
		return { valid: false, error: "Not authenticated" };
	}

	try {
		const keySet = getJwks();
		const issuers = getValidIssuers();

		await jwtVerify(token, keySet, {
			issuer: issuers,
			audience: config.workosClientId,
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
