export type ConvexAuthContext = {
	userId: string;
	sessionId: string;
};

export type ApiKeyConfig = {
	current: string;
	previous?: string | null;
};

export type RLSContext = {
	userId: string;
};
