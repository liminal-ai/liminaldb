import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
	rlsRules,
	assertRLS,
	assertCanRead,
	assertCanInsert,
	assertCanModify,
	assertCanDelete,
} from "../../../convex/auth/rls";

describe("RLS Rules", () => {
	describe("prompts table", () => {
		const ownerCtx = { userId: "user_owner" };
		const otherCtx = { userId: "user_other" };
		const promptDoc = {
			userId: "user_owner",
			slug: "test-prompt",
			name: "Test",
		};

		test("owner can read their own prompt", () => {
			expect(() => assertCanRead(ownerCtx, "prompts", promptDoc)).not.toThrow();
		});

		test("other user cannot read someone else's prompt", () => {
			expect(() => assertCanRead(otherCtx, "prompts", promptDoc)).toThrow(
				ConvexError,
			);
		});

		test("owner can insert under their own userId", () => {
			expect(() =>
				assertCanInsert(ownerCtx, "prompts", promptDoc),
			).not.toThrow();
		});

		test("cannot insert a prompt under another user's userId", () => {
			expect(() => assertCanInsert(otherCtx, "prompts", promptDoc)).toThrow(
				ConvexError,
			);
		});

		test("owner can modify their own prompt", () => {
			expect(() =>
				assertCanModify(ownerCtx, "prompts", promptDoc),
			).not.toThrow();
		});

		test("other user cannot modify someone else's prompt", () => {
			expect(() => assertCanModify(otherCtx, "prompts", promptDoc)).toThrow(
				ConvexError,
			);
		});

		test("owner can delete their own prompt", () => {
			expect(() =>
				assertCanDelete(ownerCtx, "prompts", promptDoc),
			).not.toThrow();
		});

		test("other user cannot delete someone else's prompt", () => {
			expect(() => assertCanDelete(otherCtx, "prompts", promptDoc)).toThrow(
				ConvexError,
			);
		});

		test("RLS violation includes table and operation in error data", () => {
			try {
				assertCanRead(otherCtx, "prompts", promptDoc);
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(ConvexError);
				const convexError = error as ConvexError<{
					code: string;
					table: string;
					operation: string;
				}>;
				expect(convexError.data.code).toBe("RLS_VIOLATION");
				expect(convexError.data.table).toBe("prompts");
				expect(convexError.data.operation).toBe("read");
			}
		});
	});

	describe("userPreferences table", () => {
		const ownerCtx = { userId: "user_owner" };
		const otherCtx = { userId: "user_other" };
		const prefsDoc = { userId: "user_owner", themes: {} };

		test("owner can read their own preferences", () => {
			expect(() =>
				assertCanRead(ownerCtx, "userPreferences", prefsDoc),
			).not.toThrow();
		});

		test("other user cannot read someone else's preferences", () => {
			expect(() =>
				assertCanRead(otherCtx, "userPreferences", prefsDoc),
			).toThrow(ConvexError);
		});

		test("owner can modify their own preferences", () => {
			expect(() =>
				assertCanModify(ownerCtx, "userPreferences", prefsDoc),
			).not.toThrow();
		});

		test("other user cannot modify someone else's preferences", () => {
			expect(() =>
				assertCanModify(otherCtx, "userPreferences", prefsDoc),
			).toThrow(ConvexError);
		});
	});

	describe("tables without RLS rules", () => {
		const ctx = { userId: "user_any" };

		test("tables without rules allow all operations (global data)", () => {
			const tagDoc = { name: "code", dimension: "domain" };
			expect(() => assertCanRead(ctx, "tags", tagDoc)).not.toThrow();
			expect(() => assertCanInsert(ctx, "tags", tagDoc)).not.toThrow();
		});

		test("rankingConfig is accessible (system config)", () => {
			const configDoc = { key: "default", weights: {} };
			expect(() =>
				assertCanRead(ctx, "rankingConfig", configDoc),
			).not.toThrow();
		});
	});

	describe("rlsRules structure", () => {
		test("prompts table has all four CRUD rules", () => {
			expect(rlsRules.prompts).toBeDefined();
			expect(typeof rlsRules.prompts?.read).toBe("function");
			expect(typeof rlsRules.prompts?.insert).toBe("function");
			expect(typeof rlsRules.prompts?.modify).toBe("function");
			expect(typeof rlsRules.prompts?.delete).toBe("function");
		});

		test("userPreferences table has all four CRUD rules", () => {
			expect(rlsRules.userPreferences).toBeDefined();
			expect(typeof rlsRules.userPreferences?.read).toBe("function");
			expect(typeof rlsRules.userPreferences?.insert).toBe("function");
			expect(typeof rlsRules.userPreferences?.modify).toBe("function");
			expect(typeof rlsRules.userPreferences?.delete).toBe("function");
		});
	});
});
