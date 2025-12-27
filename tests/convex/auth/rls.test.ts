import { describe, expect, test, beforeEach } from "vitest";

import { rlsRules, withRLS } from "../../../convex/auth/rls";

type RlsArgs = {
	table: string;
	operation: "read" | "insert" | "modify" | "delete";
	doc: Record<string, unknown>;
};

const ctx = { userId: "userA" };
const ownDoc = { userId: "userA", value: "ok" };
const otherDoc = { userId: "userB", value: "nope" };

beforeEach(() => {
	rlsRules.prompts = {
		read: (ruleCtx, doc) => doc.userId === ruleCtx.userId,
		insert: (ruleCtx, doc) => doc.userId === ruleCtx.userId,
		modify: (ruleCtx, doc) => doc.userId === ruleCtx.userId,
		delete: (ruleCtx, doc) => doc.userId === ruleCtx.userId,
	};
});

describe("RLS Rules", () => {
	test("allows read of own record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "ok");
		await expect(
			handler(ctx as any, { table: "prompts", operation: "read", doc: ownDoc }),
		).resolves.toBe("ok");
	});

	test("rejects read of other record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "ok");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "read",
				doc: otherDoc,
			}),
		).rejects.toThrow();
	});

	test("allows read of multiple own records", async () => {
		const docs = [
			{ userId: "userA", value: "one" },
			{ userId: "userA", value: "two" },
		];
		const handler = withRLS<
			RlsArgs & { docs: Array<Record<string, unknown>> },
			Array<Record<string, unknown>>
		>(async (_ctx, args) => args.docs);

		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "read",
				doc: ownDoc,
				docs,
			}),
		).resolves.toHaveLength(2);
	});

	test("allows insert for matching userId", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "inserted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "insert",
				doc: ownDoc,
			}),
		).resolves.toBe("inserted");
	});

	test("rejects insert for different userId", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "inserted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "insert",
				doc: otherDoc,
			}),
		).rejects.toThrow();
	});

	test("rejects insert without userId field", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "inserted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "insert",
				doc: { value: "no user" },
			}),
		).rejects.toThrow();
	});

	test("allows update of own record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "updated");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "modify",
				doc: ownDoc,
			}),
		).resolves.toBe("updated");
	});

	test("rejects update of other record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "updated");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "modify",
				doc: otherDoc,
			}),
		).rejects.toThrow();
	});

	test("rejects delete when rule missing", async () => {
		delete rlsRules.prompts?.delete;
		const handler = withRLS<RlsArgs, string>(async () => "deleted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "delete",
				doc: ownDoc,
			}),
		).rejects.toThrow();
	});

	test("allows delete of own record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "deleted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "delete",
				doc: ownDoc,
			}),
		).resolves.toBe("deleted");
	});

	test("rejects delete of other record", async () => {
		const handler = withRLS<RlsArgs, string>(async () => "deleted");
		await expect(
			handler(ctx as any, {
				table: "prompts",
				operation: "delete",
				doc: otherDoc,
			}),
		).rejects.toThrow();
	});
});
