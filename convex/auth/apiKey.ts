import type { ApiKeyConfig, ConvexAuthContext } from "./types";

export function validateApiKey(apiKey: string, config: ApiKeyConfig): boolean {
	void apiKey;
	void config;
	throw new Error("Not implemented: validateApiKey");
}

export function withApiKeyAuth<TArgs, TResult>(
	handler: (ctx: ConvexAuthContext, args: TArgs) => Promise<TResult> | TResult,
): (ctx: ConvexAuthContext, args: TArgs) => Promise<TResult> | TResult {
	void handler;
	throw new Error("Not implemented: withApiKeyAuth");
}
