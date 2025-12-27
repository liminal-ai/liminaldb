import { describe, test, expect } from "vitest";
import {
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

	describe("single prompt with new tags", () => {
		test("creates tags that don't exist", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// No existing tags
			getQueryBuilder(ctx, "tags").unique.mockResolvedValue(null);
			// No existing prompt with this slug
			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);

			// Sequence: tag1, tag2, prompt, promptTag1, promptTag2
			mockInsertSequence(ctx, ["tag_1", "tag_2", "prompt_1", "pt_1", "pt_2"]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "ai-meta-check",
					name: "Meta Cognitive Check",
					description: "Use when you want AI to introspect",
					content: "As you process this...",
					tags: ["introspection", "claude"],
				},
			];

			const result = await Prompts.insertMany(ctx as any, userId, input);

			// Should create 2 tags
			expect(ctx.db.insert).toHaveBeenCalledWith("tags", {
				userId,
				name: "introspection",
			});
			expect(ctx.db.insert).toHaveBeenCalledWith("tags", {
				userId,
				name: "claude",
			});

			// Should create prompt with empty tagNames (trigger syncs in real runtime)
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"prompts",
				expect.objectContaining({
					slug: "ai-meta-check",
					tagNames: [], // Synced by trigger on promptTags insert
				}),
			);

			// Should create junction records
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"promptTags",
				expect.objectContaining({
					promptId: "prompt_1",
					tagId: "tag_1",
				}),
			);
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"promptTags",
				expect.objectContaining({
					promptId: "prompt_1",
					tagId: "tag_2",
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("single prompt with existing tags", () => {
		test("reuses existing tags without creating duplicates", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			// Tag already exists
			getQueryBuilder(ctx, "tags").unique.mockResolvedValue({
				_id: "existing_tag",
				userId,
				name: "claude",
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
					tags: ["claude"],
				},
			];

			const result = await Prompts.insertMany(ctx as any, userId, input);

			// Should NOT insert new tag (only prompt and promptTags)
			const insertCalls = ctx.db.insert.mock.calls;
			const tagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "tags",
			);
			expect(tagInserts).toHaveLength(0);

			// Should create junction with existing tag
			expect(ctx.db.insert).toHaveBeenCalledWith(
				"promptTags",
				expect.objectContaining({
					tagId: "existing_tag",
				}),
			);

			expect(result).toEqual(["prompt_1" as Id<"prompts">]);
		});
	});

	describe("batch insert", () => {
		test("creates shared tag only once across batch", async () => {
			const ctx = createMockCtx();
			const userId = "user_123";

			getQueryBuilder(ctx, "tags").unique.mockImplementation(() => {
				// This mock doesn't know which tag was queried, so we need different approach
				// The implementation should track tags it creates during the batch
				return Promise.resolve(null);
			});

			getQueryBuilder(ctx, "prompts").unique.mockResolvedValue(null);
			mockInsertSequence(ctx, [
				"shared_tag",
				"unique_tag",
				"prompt_a",
				"prompt_b",
				"pt_1",
				"pt_2",
				"pt_3",
			]);

			const input: Prompts.PromptInput[] = [
				{
					slug: "prompt-a",
					name: "A",
					description: "...",
					content: "...",
					tags: ["shared"],
				},
				{
					slug: "prompt-b",
					name: "B",
					description: "...",
					content: "...",
					tags: ["shared", "unique"],
				},
			];

			const result = await Prompts.insertMany(ctx as any, userId, input);

			// Count tag inserts - "shared" should only be inserted once
			const insertCalls = ctx.db.insert.mock.calls;
			const tagInserts = insertCalls.filter(
				(call: unknown[]) => call[0] === "tags",
			);
			const sharedTagInserts = tagInserts.filter(
				(call: unknown[]) => (call[1] as { name: string }).name === "shared",
			);
			expect(sharedTagInserts).toHaveLength(1);

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
				Prompts.insertMany(ctx as any, userId, input),
			).rejects.toThrow(/already exists/);

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
				Prompts.insertMany(ctx as any, userId, input),
			).rejects.toThrow(/already exists/);

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
				Prompts.insertMany(ctx as any, userId, input),
			).rejects.toThrow(/Duplicate slug in batch: "same-slug"/);

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

			const result = await Prompts.insertMany(ctx as any, userId, input);

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

			const result = await Prompts.insertMany(ctx as any, userId, input);

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
