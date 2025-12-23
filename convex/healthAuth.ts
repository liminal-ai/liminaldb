import { query } from "./_generated/server";
import { v } from "convex/values";
import { withApiKeyAuth } from "./auth/apiKey";

export const check = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
	},
	handler: withApiKeyAuth(
		async (_ctx, args: { apiKey: string; userId: string }) => {
			return {
				status: "ok",
				user: {
					subject: args.userId,
				},
			};
		},
	),
});
