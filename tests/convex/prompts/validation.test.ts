import { describe, test, expect } from "vitest";
import {
	validateSlug,
	validatePromptInput,
} from "../../../convex/model/prompts";
import { validateTagName } from "../../../convex/model/tagConstants";

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
	test("accepts valid slug-format tags", () => {
		expect(validateTagName("debug")).toBe("debug");
		expect(validateTagName("code")).toBe("code");
		expect(validateTagName("instruction")).toBe("instruction");
	});

	test("accepts user-defined custom tags", () => {
		expect(validateTagName("my-custom-tag")).toBe("my-custom-tag");
		expect(validateTagName("foobar")).toBe("foobar");
		expect(validateTagName("q4-review")).toBe("q4-review");
	});

	test("is case-insensitive (normalizes to lowercase)", () => {
		expect(validateTagName("DEBUG")).toBe("debug");
		expect(validateTagName("Code")).toBe("code");
	});

	test("rejects empty tag name", () => {
		expect(() => validateTagName("")).toThrow("empty");
	});

	test("rejects whitespace-only tag name", () => {
		expect(() => validateTagName("   ")).toThrow("empty");
	});

	test("rejects tags with invalid characters", () => {
		expect(() => validateTagName("work/projects")).toThrow();
		expect(() => validateTagName("hello world")).toThrow();
		expect(() => validateTagName("hello_world")).toThrow();
	});
});

describe("validatePromptInput", () => {
	const validPrompt = {
		slug: "test-prompt",
		name: "Test Prompt",
		description: "A test prompt",
		content: "The actual prompt content",
		tags: ["debug", "code"],
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
		// Create 51 tags by repeating valid tags
		const validTags = ["code", "debug", "review"];
		const manyTags = Array.from({ length: 51 }, (_, i) => validTags[i % 3]);
		expect(() =>
			validatePromptInput({ ...validPrompt, tags: manyTags as string[] }),
		).toThrow("Too many tags");
	});

	test("accepts custom user-defined tags", () => {
		expect(() =>
			validatePromptInput({
				...validPrompt,
				tags: ["code", "my-custom-tag", "q4-review"],
			}),
		).not.toThrow();
	});

	test("rejects tags with invalid characters", () => {
		expect(() =>
			validatePromptInput({
				...validPrompt,
				tags: ["code", "has spaces"],
			}),
		).toThrow();
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
