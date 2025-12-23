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
	return async (ctx, args) => {
		const { table, operation, doc } = args as unknown as {
			table: string;
			operation: keyof RLSRules[string];
			doc: Record<string, unknown>;
		};

		const tableRules = rlsRules[table];
		if (!tableRules) {
			throw new Error("RLS rules not defined");
		}

		const rule = tableRules[operation];
		if (typeof rule !== "function") {
			throw new Error("RLS rule not defined for operation");
		}

		const allowed = rule(ctx, doc);
		if (!allowed) {
			throw new Error("RLS violation");
		}

		return handler(ctx, args);
	};
}
