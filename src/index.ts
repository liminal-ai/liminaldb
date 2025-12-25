import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { registerHealthRoutes } from "./api/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerMcpRoutes } from "./api/mcp";
import { registerWellKnownRoutes } from "./routes/well-known";
import { config } from "./lib/config";

const fastify = Fastify({
	logger: true,
});

// Register cookie plugin
fastify.register(cookie, {
	secret: config.cookieSecret,
	parseOptions: {},
});

// Configure CORS
// In development/test: allow all origins
// In production: explicitly list allowed origins from CORS_ALLOWED_ORIGINS env var
fastify.register(cors, {
	origin: config.corsOrigins,
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
registerWellKnownRoutes(fastify);

const start = async () => {
	try {
		await fastify.listen({ port: 5001, host: "0.0.0.0" });
		fastify.log.info("PromptDB server running on port 5001");
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
