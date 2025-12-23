export enum TokenSource {
	BEARER = "bearer",
	COOKIE = "cookie",
}

export type TokenExtractionResult = {
	token: string | null;
	source: TokenSource | null;
};

export type JwtValidationResult = {
	valid: boolean;
	error?: string;
};

export type JwtClaims = {
	sub: string;
	email: string;
	sid: string;
	org_id?: string;
};

export type AuthUser = {
	id: string;
	email: string;
	sessionId: string;
};

export type AuthContext = {
	user: AuthUser;
	accessToken: string;
};

export type ApiKeyConfig = {
	current: string;
	previous?: string | null;
};
