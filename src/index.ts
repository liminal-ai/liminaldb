import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { registerHealthRoutes } from "./api/health";
import { registerAuthRoutes } from "./routes/auth";
import { registerMcpRoutes } from "./api/mcp";
import { registerWellKnownRoutes } from "./routes/well-known";
import { registerPromptRoutes } from "./routes/prompts";
import { registerImportExportRoutes } from "./routes/import-export";
import { registerAppRoutes } from "./routes/app";
import { registerModuleRoutes } from "./routes/modules";
import { registerDraftRoutes } from "./routes/drafts";
import { registerPreferencesRoutes } from "./routes/preferences";
import { config } from "./lib/config";
import { NotImplementedError } from "./lib/redis";

const fastify = Fastify({
	logger: true,
});

// Global error handler for NotImplementedError → HTTP 501
fastify.setErrorHandler((error, _request, reply) => {
	if (error instanceof NotImplementedError) {
		return reply.status(501).send({ code: "NOT_IMPLEMENTED" });
	}
	// Let Fastify handle other errors with default behavior
	throw error;
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
registerPromptRoutes(fastify);
registerImportExportRoutes(fastify);
registerAppRoutes(fastify);
registerModuleRoutes(fastify);
registerDraftRoutes(fastify);
registerPreferencesRoutes(fastify);

const start = async () => {
	try {
		await fastify.listen({ port: 5001, host: "0.0.0.0" });
		fastify.log.info("LiminalDB server running on port 5001");

		// Graceful shutdown for container deployments (Fly.io sends SIGTERM)
		const shutdown = async (signal: string) => {
			fastify.log.info(`${signal} received, closing server...`);
			await fastify.close();
			process.exit(0);
		};

		process.on("SIGTERM", () => shutdown("SIGTERM"));
		process.on("SIGINT", () => shutdown("SIGINT"));
	} catch (err) {
		fastify.log.error(err);
		process.exit(1);
	}
};

start();
