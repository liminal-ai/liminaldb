/**
 * Service tests for OAuth Protected Resource Metadata endpoint (RFC 9728).
 *
 * Tests the /.well-known/oauth-protected-resource endpoint that tells
 * MCP clients where to authenticate.
 */

import Fastify from "fastify";
import { describe, expect, test, beforeEach } from "bun:test";
import { registerWellKnownRoutes } from "../../../src/routes/well-known";

// Set required env vars for tests
process.env.MCP_RESOURCE_URL = "http://localhost:5001/mcp";
process.env.WORKOS_AUTH_SERVER_URL = "https://test.authkit.app";
process.env.BASE_URL = "http://localhost:5001";

describe("OAuth Protected Resource Metadata", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify({ logger: false });
		registerWellKnownRoutes(app);
		await app.ready();
	});

	test("GET /.well-known/oauth-protected-resource returns 200", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		expect(response.statusCode).toBe(200);
	});

	test("response has Content-Type application/json", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		expect(response.headers["content-type"]).toContain("application/json");
	});

	test("response body has resource field matching MCP_RESOURCE_URL", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		const body = response.json();
		expect(body.resource).toBe("http://localhost:5001/mcp");
	});

	test("response body has authorization_servers array with WORKOS_AUTH_SERVER_URL", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		const body = response.json();
		expect(Array.isArray(body.authorization_servers)).toBe(true);
		expect(body.authorization_servers).toContain("https://test.authkit.app");
	});

	test("response body has scopes_supported array", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		const body = response.json();
		expect(Array.isArray(body.scopes_supported)).toBe(true);
	});

	test("response has Cache-Control header for caching", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		expect(response.headers["cache-control"]).toBeDefined();
	});
});

describe("OAuth Protected Resource Metadata - missing config", () => {
	test("returns 500 if MCP_RESOURCE_URL not configured", async () => {
		// Save and clear the env var
		const originalValue = process.env.MCP_RESOURCE_URL;
		delete process.env.MCP_RESOURCE_URL;

		const app = Fastify({ logger: false });
		registerWellKnownRoutes(app);
		await app.ready();

		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		// Restore env var
		process.env.MCP_RESOURCE_URL = originalValue;

		expect(response.statusCode).toBe(500);
	});

	test("returns 500 if WORKOS_AUTH_SERVER_URL not configured", async () => {
		// Save and clear the env var
		const originalValue = process.env.WORKOS_AUTH_SERVER_URL;
		delete process.env.WORKOS_AUTH_SERVER_URL;

		const app = Fastify({ logger: false });
		registerWellKnownRoutes(app);
		await app.ready();

		const response = await app.inject({
			method: "GET",
			url: "/.well-known/oauth-protected-resource",
		});

		// Restore env var
		process.env.WORKOS_AUTH_SERVER_URL = originalValue;

		expect(response.statusCode).toBe(500);
	});
});
