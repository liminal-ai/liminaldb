import { query } from "./_generated/server";
import { v } from "convex/values";
import { validateApiKey } from "./auth/apiKey";

export const check = query({
	args: {
		apiKey: v.string(),
		userId: v.string(),
	},
	handler: async (_ctx, args) => {
		// Validate API key (proves caller is trusted Fastify backend)
		if (!validateApiKey(args.apiKey)) {
			throw new Error("Invalid API key");
		}

		// userId comes from args (passed by Fastify after JWT validation)
		// No longer using ctx.auth.getUserIdentity() - that's the old pattern

		return {
			status: "ok",
			user: {
				subject: args.userId,
				// email and name not available without full user lookup
				// but we have the userId for RLS purposes
			},
		};
	},
});
