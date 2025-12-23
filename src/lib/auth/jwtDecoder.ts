import type { JwtClaims } from "./types";

export function decodeJwtClaims(token: string): JwtClaims {
	void token;
	throw new Error("Not implemented: decodeJwtClaims");
}
