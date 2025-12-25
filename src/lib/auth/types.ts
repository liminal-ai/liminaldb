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
	email?: string; // Optional - not present in MCP OAuth tokens
	sid?: string; // Optional - not present in MCP OAuth tokens
	org_id?: string;
	aud?: string; // Audience claim (client ID)
	scope?: string; // Space-separated list of scopes
	exp?: number; // Expiration timestamp (Unix seconds)
};

export type AuthUser = {
	id: string;
	email?: string; // Optional - not present in MCP OAuth tokens
	sessionId?: string; // Optional - not present in MCP OAuth tokens
};

export type AuthContext = {
	user: AuthUser;
	accessToken: string;
};

export type ApiKeyConfig = {
	current: string;
	previous?: string | null;
};
