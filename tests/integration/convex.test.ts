import { describe, expect, test } from "bun:test";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

const hasConvex = () => !!process.env.CONVEX_URL;

describe("Convex Connectivity", () => {
	test.skipIf(!hasConvex())("Convex health query returns ok", async () => {
		const convexUrl = process.env.CONVEX_URL as string;
		const client = new ConvexHttpClient(convexUrl);
		const result = await client.query(api.health.check);

		expect(result.status).toBe("ok");
	});
});
