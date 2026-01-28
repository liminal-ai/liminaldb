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

	describe("single prompt with global tags", () => {
		test("looks up pre-seeded tags and creates junction records", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Tags are pre-seeded (global tags)
			getQueryBuilder(ctx, "tags").unique.mockImplementation(
				async (_options: unknown) => {
					// Return a mock tag for any valid tag name
					return { _id: "seeded_tag", name: "code", dimension: "domain" };
				},
			);
			// No existing prompt with this slug
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			// Sequence: prompt, promptTag1, promptTag2 (no tag inserts - tags are seeded)
			mockInsertSequence(ctx, ["prompt_1", "pt_1", "pt_2"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "code-review-helper",
					name: "Code Review Helper",
					description: "Reviews code for issues",
					content: "Review this code...",
					tags: ["code", "debug"], // Valid global tags
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// Should NOT insert new tags (they are pre-seeded)
			const insertCalls = ctx.db.insert.mock.calls;
			const tagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "tags",
			);
			expect(tagInserts).toHaveLength(0);

			// Should create prompt with empty tagNames (trigger syncs in real runtime)
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					slug: "code-review-helper",
					tagNames: [], // Synced by trigger on promptTags insert
				}),
			);

			// Should create junction records
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"promptTags",
				expect.objectContaining({
					promptId: "prompt_1",
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("single prompt with seeded tags", () => {
		test("uses seeded tag without creating new ones", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Tag already seeded (global tags)
			getQueryBuilder(ctx, "tags").unique.mockResolvedValue({
				_id: "seeded_review_tag",
				name: "review",
				dimension: "task",
			});
			// No existing prompt with this slug
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			mockInsertSequence(ctx, ["prompt_1", "pt_1"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "debug-helper",
					name: "Debug Helper",
					description: "...",
					content: "...",
					tags: ["review"], // Valid global tag
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// Should NOT insert new tag (only prompt and promptTags)
			const insertCalls = ctx.db.insert.mock.calls;
			const tagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "tags",
			);
			expect(tagInserts).toHaveLength(0);

			// Should create junction with seeded tag
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"promptTags",
				expect.objectContaining({
					tagId: "seeded_review_tag",
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("batch insert", () => {
		test("uses seeded tags across batch without creating duplicates", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Mock tag lookups returning seeded tags
			const tagMocks: Record<
				string,
				{ _id: string; name: string; dimension: string }
			> = {
				code: { _id: "seeded_code", name: "code", dimension: "domain" },
				debug: { _id: "seeded_debug", name: "debug", dimension: "task" },
			};

			getQueryBuilder(ctx, "tags").unique.mockImplementation(async () => {
				// Return a seeded tag for any valid tag
				return tagMocks.code;
			});

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			// No tag inserts - tags are seeded. Just prompts and junctions.
			mockInsertSequence(ctx, ["prompt_a", "prompt_b", "pt_1", "pt_2", "pt_3"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "prompt-a",
					name: "A",
					description: "...",
					content: "...",
					tags: ["code"], // Valid global tag
				},
				{
					slug: "prompt-b",
					name: "B",
					description: "...",
					content: "...",
					tags: ["code", "debug"], // Valid global tags
				},
			];

			const result = await Prompts.insertMany(asConvexCtx(ctx), userId, input);

			// No tag inserts - tags are pre-seeded
			const insertCalls = ctx.db.insert.mock.calls;
			const tagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "tags",
			);
			expect(tagInserts).toHaveLength(0);

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

			// Should not create any promptTags
			const insertCalls = ctx.db.insert.mock.calls;
			const promptTagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "promptTags",
			);
			expect(promptTagInserts).toHaveLength(0);

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
