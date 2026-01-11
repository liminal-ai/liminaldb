import { SignJWT, jwtVerify, errors as joseErrors } from "jose";
import { config } from "../config";

/**
 * Widget JWT payload structure
 */
export interface WidgetJwtPayload {
	userId: string;
}

/**
 * Widget JWT verification result
 */
export interface WidgetJwtResult {
	valid: boolean;
	payload?: WidgetJwtPayload;
	error?: string;
}

/**
 * Get the secret as a Uint8Array for jose operations
 */
function getSecretKey(): Uint8Array {
	return new TextEncoder().encode(config.widgetJwtSecret);
}

/**
 * Widget token expiry time.
 * 4 hours is long enough for most editing sessions while still limiting exposure.
 */
const WIDGET_TOKEN_EXPIRY = "4h";

/**
 * Create a widget JWT token for API authentication.
 * Token includes userId and expires in 4 hours.
 *
 * @param userId - The authenticated user's ID
 * @returns Signed JWT string
 */
export async function createWidgetToken(userId: string): Promise<string> {
	const secret = getSecretKey();

	const token = await new SignJWT({ userId })
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime(WIDGET_TOKEN_EXPIRY)
		.setIssuer("promptdb:widget")
		.sign(secret);

	return token;
}

/**
 * Verify a widget JWT token and extract the payload.
 *
 * @param token - The JWT string to verify
 * @returns Verification result with payload on success
 */
export async function verifyWidgetToken(
	token: string,
): Promise<WidgetJwtResult> {
	if (!token) {
		return { valid: false, error: "No token provided" };
	}

	try {
		const secret = getSecretKey();

		const { payload } = await jwtVerify(token, secret, {
			issuer: "promptdb:widget",
		});

		const userId = payload.userId;
		if (typeof userId !== "string" || !userId) {
			return { valid: false, error: "Invalid token payload" };
		}

		return {
			valid: true,
			payload: { userId },
		};
	} catch (error) {
		if (error instanceof joseErrors.JWTExpired) {
			return { valid: false, error: "Token expired" };
		}

		if (
			error instanceof joseErrors.JWTClaimValidationFailed ||
			error instanceof joseErrors.JWSSignatureVerificationFailed ||
			error instanceof joseErrors.JWTInvalid
		) {
			return { valid: false, error: "Invalid token" };
		}

		return { valid: false, error: "Invalid token" };
	}
}
