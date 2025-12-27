import { describe, test, expect } from "vitest";
import {
	validateSlug,
	validateTagName,
	validatePromptInput,
} from "../../../convex/model/prompts";

describe("validateSlug", () => {
	test("accepts valid slugs", () => {
		expect(() => validateSlug("hello")).not.toThrow();
		expect(() => validateSlug("hello-world")).not.toThrow();
		expect(() => validateSlug("a1-b2-c3")).not.toThrow();
		expect(() => validateSlug("prompt123")).not.toThrow();
	});

	test("rejects empty slug", () => {
		expect(() => validateSlug("")).toThrow("required and cannot be empty");
	});

	test("rejects whitespace-only slug", () => {
		expect(() => validateSlug("   ")).toThrow("required and cannot be empty");
	});

	test("rejects slug over max length", () => {
		const longSlug = "a".repeat(201);
		expect(() => validateSlug(longSlug)).toThrow("too long");
	});

	test("rejects uppercase letters", () => {
		expect(() => validateSlug("Hello")).toThrow("Invalid slug");
	});

	test("rejects colons (reserved for namespacing)", () => {
		expect(() => validateSlug("team:my-prompt")).toThrow("Invalid slug");
	});

	test("rejects special characters", () => {
		expect(() => validateSlug("hello@world")).toThrow("Invalid slug");
		expect(() => validateSlug("hello world")).toThrow("Invalid slug");
		expect(() => validateSlug("hello_world")).toThrow("Invalid slug");
	});
});

describe("validateTagName", () => {
	test("accepts valid tag names", () => {
		expect(() => validateTagName("debug")).not.toThrow();
		expect(() => validateTagName("work/projects/active")).not.toThrow();
		expect(() => validateTagName("my-tag")).not.toThrow();
		expect(() => validateTagName("my_tag")).not.toThrow();
		expect(() => validateTagName("Tag123")).not.toThrow();
	});

	test("rejects empty tag name", () => {
		expect(() => validateTagName("")).toThrow("required and cannot be empty");
	});

	test("rejects whitespace-only tag name", () => {
		expect(() => validateTagName("   ")).toThrow(
			"required and cannot be empty",
		);
	});

	test("rejects tag name over max length", () => {
		const longTag = "a".repeat(101);
		expect(() => validateTagName(longTag)).toThrow("too long");
	});

	test("rejects tag names starting with special character", () => {
		expect(() => validateTagName("-invalid")).toThrow("Invalid tag name");
		expect(() => validateTagName("/invalid")).toThrow("Invalid tag name");
		expect(() => validateTagName("_invalid")).toThrow("Invalid tag name");
	});

	test("rejects tag names with spaces", () => {
		expect(() => validateTagName("hello world")).toThrow("Invalid tag name");
	});
});

describe("validatePromptInput", () => {
	const validPrompt = {
		slug: "test-prompt",
		name: "Test Prompt",
		description: "A test prompt",
		content: "The actual prompt content",
		tags: ["debug", "test"],
	};

	test("accepts valid prompt input", () => {
		expect(() => validatePromptInput(validPrompt)).not.toThrow();
	});

	test("rejects empty name", () => {
		expect(() => validatePromptInput({ ...validPrompt, name: "" })).toThrow(
			"name is required and cannot be empty",
		);
	});

	test("rejects whitespace-only name", () => {
		expect(() => validatePromptInput({ ...validPrompt, name: "   " })).toThrow(
			"name is required and cannot be empty",
		);
	});

	test("rejects empty description", () => {
		expect(() =>
			validatePromptInput({ ...validPrompt, description: "" }),
		).toThrow("description is required and cannot be empty");
	});

	test("rejects empty content", () => {
		expect(() => validatePromptInput({ ...validPrompt, content: "" })).toThrow(
			"content is required and cannot be empty",
		);
	});

	test("rejects name over max length", () => {
		const longName = "a".repeat(201);
		expect(() =>
			validatePromptInput({ ...validPrompt, name: longName }),
		).toThrow("name too long");
	});

	test("rejects description over max length", () => {
		const longDesc = "a".repeat(2001);
		expect(() =>
			validatePromptInput({ ...validPrompt, description: longDesc }),
		).toThrow("description too long");
	});

	test("rejects content over max length", () => {
		const longContent = "a".repeat(100001);
		expect(() =>
			validatePromptInput({ ...validPrompt, content: longContent }),
		).toThrow("content too long");
	});

	test("rejects too many tags", () => {
		const manyTags = Array.from({ length: 51 }, (_, i) => `tag${i}`);
		expect(() =>
			validatePromptInput({ ...validPrompt, tags: manyTags }),
		).toThrow("Too many tags");
	});

	test("rejects invalid tag names in array", () => {
		expect(() =>
			validatePromptInput({ ...validPrompt, tags: ["valid", "invalid tag"] }),
		).toThrow("Invalid tag name");
	});

	test("rejects invalid slug format", () => {
		expect(() =>
			validatePromptInput({ ...validPrompt, slug: "Invalid Slug" }),
		).toThrow("Invalid slug");
	});

	test("accepts prompt with empty tags array", () => {
		expect(() =>
			validatePromptInput({ ...validPrompt, tags: [] }),
		).not.toThrow();
	});

	test("accepts prompt with parameters", () => {
		expect(() =>
			validatePromptInput({
				...validPrompt,
				parameters: [
					{ name: "target", type: "string" as const, required: true },
				],
			}),
		).not.toThrow();
	});
});
