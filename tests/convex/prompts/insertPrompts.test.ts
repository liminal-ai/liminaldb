import { describe, test, expect } from "vitest";
import { ConvexError } from "convex/values";
import {
	asConvexCtx,
	createMockCtx,
	getQueryBuilder,
	mockSequentialReturns,
	mockInsertSequence,
} from "../../fixtures/mockConvexCtx";
import * as Prompts from "../../../convex/model/prompts";
import type { Id } from "../../../convex/_generated/dataModel";

describe("insertPrompts", () => {
	describe("slug validation (pure function)", () => {
		test("validateSlug accepts valid slug", () => {
			expect(() => Prompts.validateSlug("ai-meta-check")).not.toThrow();
		});

		test("validateSlug accepts slug with numbers", () => {
			expect(() => Prompts.validateSlug("prompt-v2-test")).not.toThrow();
		});

		test("validateSlug accepts single word", () => {
			expect(() => Prompts.validateSlug("debug")).not.toThrow();
		});

		test("validateSlug rejects uppercase", () => {
			expect(() => Prompts.validateSlug("AI-Meta-Check")).toThrow(
				/Invalid slug/,
			);
		});

		test("validateSlug rejects colons", () => {
			expect(() => Prompts.validateSlug("team:prompt")).toThrow(/colons/i);
		});

		test("validateSlug rejects spaces", () => {
			expect(() => Prompts.validateSlug("has spaces")).toThrow(/Invalid slug/);
		});

		test("validateSlug rejects empty string", () => {
			expect(() => Prompts.validateSlug("")).toThrow(
				/required and cannot be empty/,
			);
		});

		test("validateSlug rejects leading dash", () => {
			expect(() => Prompts.validateSlug("-leading")).toThrow(/Invalid slug/);
		});

		test("validateSlug rejects trailing dash", () => {
			expect(() => Prompts.validateSlug("trailing-")).toThrow(/Invalid slug/);
		});
	});

	describe("single prompt with tags", () => {
		test("writes tags directly to tagNames field", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "code-review-helper",
					name: "Code Review Helper",
					description: "Reviews code for issues",
					content: "Review this code...",
					tags: ["code", "debug"],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// Tags written directly — no junction table, no tag lookups
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					slug: "code-review-helper",
					tagNames: ["code", "debug"],
				}),
			);

			// No promptTags inserts
			const insertCalls = ctx.db.insert.mock.calls;
			const junctionInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "promptTags",
			);
			expect(junctionInserts).toHaveLength(0);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});

		test("accepts custom user-defined tags", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "my-prompt",
					name: "My Prompt",
					description: "...",
					content: "...",
					tags: ["my-project", "q4-review"],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					tagNames: ["my-project", "q4-review"],
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});

		test("deduplicates tags", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "dup-tags",
					name: "Dup",
					description: "...",
					content: "...",
					tags: ["code", "code", "debug"],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					tagNames: ["code", "debug"],
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("batch insert", () => {
		test("inserts multiple prompts with tags", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_a", "prompt_b"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "prompt-a",
					name: "A",
					description: "...",
					content: "...",
					tags: ["code"],
				},
				{
					slug: "prompt-b",
					name: "B",
					description: "...",
					content: "...",
					tags: ["code", "debug"],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// Only prompt inserts — no junction table
			const insertCalls = ctx.db.insert.mock.calls;
			expect(
				insertCalls.filter((c: unknown[]) => c[0] === "prompts"),
			).toHaveLength(2);
			expect(
				insertCalls.filter((c: unknown[]) => c[0] === "promptTags"),
			).toHaveLength(0);

			expect(result).toHaveLength(2);
		});
	});

	describe("duplicate slug", () => {
		test("throws error if slug already exists for user", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Slug exists
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue({
				_id: "existing_prompt",
				slug: "ai-meta-check",
			});

			const input: Prompts.PromptInput[] = [
				{
					slug: "ai-meta-check",
					name: "...",
					description: "...",
					content: "...",
					tags: [],
				},
			];

			await expect(
				Prompts.insertMany(asConvexCtx(ctx), userId, input),
			).rejects.toThrow(ConvexError);

			// Should not insert anything
			expect(ctx.db.insert).not.toHaveBeenCalled();
		});

		test("batch fails entirely if any slug is duplicate", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Second slug exists
			mockSequentialReturns(getQueryBuilder(ctx, "prompts").unique, [
				null, // first slug doesn't exist
				{ _id: "existing", slug: "duplicate-slug" }, // second slug exists
			]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "new-slug",
					name: "A",
					description: "...",
					content: "...",
					tags: [],
				},
				{
					slug: "duplicate-slug",
					name: "B",
					description: "...",
					content: "...",
					tags: [],
				},
			];

			await expect(
				Prompts.insertMany(asConvexCtx(ctx), userId, input),
			).rejects.toThrow(ConvexError);

			// Atomic: nothing should be inserted
			expect(ctx.db.insert).not.toHaveBeenCalled();
		});

		test("batch fails if same slug appears twice in input", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// First slug check passes (doesn't exist in DB)
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			const input: Prompts.PromptInput[] = [
				{
					slug: "same-slug",
					name: "First",
					description: "...",
					content: "...",
					tags: [],
				},
				{
					slug: "same-slug", // duplicate within batch
					name: "Second",
					description: "...",
					content: "...",
					tags: [],
				},
			];

			await expect(
				Prompts.insertMany(asConvexCtx(ctx), userId, input),
			).rejects.toThrow(ConvexError);

			// Atomic: nothing should be inserted
			expect(ctx.db.insert).not.toHaveBeenCalled();
		});
	});

	describe("empty tags", () => {
		test("inserts prompt with empty tagNames array", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "no-tags",
					name: "No Tags",
					description: "...",
					content: "...",
					tags: [],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// Should create prompt with empty tagNames
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					tagNames: [],
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("with parameters", () => {
		test("inserts prompt with parameters", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, ["prompt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "template-prompt",
					name: "Template",
					description: "...",
					content: "Hello {{name}}",
					tags: [],
					parameters: [
						{
							name: "name",
							type: "string",
							required: true,
							description: "The name to greet",
						},
					],
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					parameters: [
						{
							name: "name",
							type: "string",
							required: true,
							description: "The name to greet",
						},
					],
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});
});
