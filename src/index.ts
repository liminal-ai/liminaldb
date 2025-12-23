import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { registerHealthRoutes } from "./api/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerMcpRoutes } from "./api/mcp";

const fastify = Fastify({
	logger: true,
});

// Register cookie plugin
const cookieSecret = process.env.COOKIE_SECRET;
if (!cookieSecret) {
	throw new Error("COOKIE_SECRET environment variable is required");
}

fastify.register(cookie, {
	secret: cookieSecret,
	parseOptions: {},
});

// Configure CORS for local development
fastify.register(cors, {
	origin: true, // Allow all origins in development
	credentials: true, // Allow cookies
});

// Serve static files from public directory
fastify.register(fastifyStatic, {
	root: join(import.meta.dir, "../public"),
	prefix: "/",
});

// Register routes
registerHealthRoutes(fastify);
registerAuthRoutes(fastify);
registerMcpRoutes(fastify);

const start = async () => {
	try {
		await fastify.listen({ port: 5001 });
		fastify.log.info("PromptDB server running on port 5001");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
