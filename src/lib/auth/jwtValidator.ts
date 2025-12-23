import type { JwtValidationResult } from "./types";

export async function validateJwt(token: string): Promise<JwtValidationResult> {
	void token;
	throw new Error("Not implemented: validateJwt");
}
