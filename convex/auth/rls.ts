import type { RLSContext } from "./types";

export type RLSRule = (
	ctx: RLSContext,
	doc: Record<string, unknown>,
) => boolean;

export type RLSRules = Record<
	string,
	{
		read?: RLSRule;
		insert?: RLSRule;
		modify?: RLSRule;
		delete?: RLSRule;
	}
>;

export const rlsRules: RLSRules = {};

export function withRLS<TArgs, TResult>(
	handler: (ctx: RLSContext, args: TArgs) => Promise<TResult> | TResult,
): (ctx: RLSContext, args: TArgs) => Promise<TResult> | TResult {
	void handler;
	throw new Error("Not implemented: withRLS");
}
