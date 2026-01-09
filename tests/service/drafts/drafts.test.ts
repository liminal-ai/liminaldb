import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { registerDraftRoutes } from "../../../src/routes/drafts";
import { createRedisMock } from "../../__mocks__/redis";
import { setRedisClient } from "../../../src/lib/redis";
import { createTestJwt } from "../../fixtures";
import type { DraftDTO, DraftUpsertRequest } from "../../../src/schemas/drafts";

// Mock bun (required for RedisClient import)
vi.mock("bun", () => ({
	RedisClient: vi.fn(),
}));

// Mock JWT validator
vi.mock("../../../src/lib/auth/jwtValidator", () => ({
	validateJwt: vi.fn(async () => ({ valid: true })),
}));

// Mock config
vi.mock("../../../src/lib/config", () => ({
	config: {
		cookieSecret: "test_cookie_secret",
		nodeEnv: "test",
		isProduction: false,
		isTest: true,
		redisUrl: "redis://localhost:6379", // Required for getRedis() to not throw
	},
}));

describe("Drafts API", () => {
	let app: ReturnType<typeof Fastify>;
	let redisMock: ReturnType<typeof createRedisMock>;

	beforeEach(async () => {
		redisMock = createRedisMock();
		setRedisClient(redisMock);

		app = Fastify();
		app.register(cookie, { secret: "test_cookie_secret" });
		registerDraftRoutes(app);
		await app.ready();
	});

	afterEach(async () => {
		await app.close();
		setRedisClient(null);
	});

	const authHeaders = () => ({
		authorization: `Bearer ${createTestJwt({ sub: "user_123" })}`,
		"Content-Type": "application/json",
	});

	it("TC-32: draft survives browser refresh (persists in Redis)", async () => {
		const draftData: DraftUpsertRequest = {
			type: "edit",
			promptSlug: "test-prompt",
			data: {
				slug: "test-prompt",
				name: "Test Prompt",
				description: "A test",
				content: "Hello {{name}}",
				tags: ["test"],
			},
		};

		// Create draft
		await app.inject({
			method: "PUT",
			url: "/api/drafts/edit:test-prompt",
			payload: draftData,
			headers: authHeaders(),
		});

		// Simulate "refresh" by fetching drafts
		const listResponse = await app.inject({
			method: "GET",
			url: "/api/drafts",
			headers: authHeaders(),
		});

		expect(listResponse.statusCode).toBe(200);
		const drafts = JSON.parse(listResponse.body) as DraftDTO[];
		expect(drafts.length).toBeGreaterThan(0);
		expect(drafts[0]?.promptSlug).toBe("test-prompt");
	});

	it("TC-36: save endpoint provides draft data for Convex update", async () => {
		const draftData: DraftUpsertRequest = {
			type: "edit",
			promptSlug: "test-prompt",
			data: {
				slug: "test-prompt",
				name: "Updated Name",
				description: "Updated description",
				content: "Updated content",
				tags: ["updated"],
			},
		};

		// Create draft
		const response = await app.inject({
			method: "PUT",
			url: "/api/drafts/edit:test-prompt",
			payload: draftData,
			headers: authHeaders(),
		});

		expect(response.statusCode).toBe(200);
		const draft = JSON.parse(response.body) as DraftDTO;

		// Draft data should be usable for Convex update
		expect(draft.data.name).toBe("Updated Name");
		expect(draft.data.content).toBe("Updated content");
		expect(draft.draftId).toBe("edit:test-prompt");
	});

	it("TC-37: delete endpoint clears draft from Redis", async () => {
		// First create a draft
		const draftData: DraftUpsertRequest = {
			type: "edit",
			promptSlug: "test-prompt",
			data: {
				slug: "test-prompt",
				name: "Test",
				description: "Test",
				content: "Test",
				tags: [],
			},
		};

		await app.inject({
			method: "PUT",
			url: "/api/drafts/edit:test-prompt",
			payload: draftData,
			headers: authHeaders(),
		});

		// Delete the draft (DELETE doesn't need Content-Type header)
		const { "Content-Type": _, ...deleteHeaders } = authHeaders();
		const deleteResponse = await app.inject({
			method: "DELETE",
			url: "/api/drafts/edit:test-prompt",
			headers: deleteHeaders,
		});

		expect(deleteResponse.statusCode).toBe(200);
		const result = JSON.parse(deleteResponse.body);
		expect(result.deleted).toBe(true);

		// Verify draft is gone
		const listResponse = await app.inject({
			method: "GET",
			url: "/api/drafts",
			headers: authHeaders(),
		});

		const drafts = JSON.parse(listResponse.body) as DraftDTO[];
		expect(
			drafts.find((d) => d.draftId === "edit:test-prompt"),
		).toBeUndefined();
	});

	it("TC-39: draft expires after 24 hours (TTL)", async () => {
		const draftData: DraftUpsertRequest = {
			type: "new",
			data: {
				slug: "new-prompt",
				name: "New Prompt",
				description: "Test",
				content: "Content",
				tags: [],
			},
		};

		const response = await app.inject({
			method: "PUT",
			url: "/api/drafts/new:abc123",
			payload: draftData,
			headers: authHeaders(),
		});

		expect(response.statusCode).toBe(200);
		const draft = JSON.parse(response.body) as DraftDTO;

		// Verify expiresAt is approximately 24 hours from now
		const expectedExpiry = Date.now() + 24 * 60 * 60 * 1000;
		expect(draft.expiresAt).toBeGreaterThan(Date.now());
		expect(draft.expiresAt).toBeLessThanOrEqual(expectedExpiry + 1000); // 1s tolerance
	});
});
