import { query } from "./_generated/server";

export const check = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();

		if (!identity) {
			throw new Error("Not authenticated");
		}

		return {
			status: "ok",
			user: {
				subject: identity.subject,
				email: identity.email,
				name: identity.name,
			},
		};
	},
});
