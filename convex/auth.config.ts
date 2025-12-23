// Convex no longer validates JWTs directly - Fastify handles all auth.
// Auth flows through API key validation (proving trusted Fastify caller)
// and userId passed from Fastify (already validated via JWT).
export default {
	providers: [],
};
