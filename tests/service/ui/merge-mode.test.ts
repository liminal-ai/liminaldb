import { describe, it, expect, beforeEach, vi } from "vitest";
import {
	loadTemplate,
	mockFetch,
	setupClipboard,
	click,
	input,
	waitForAsync,
	assertElement,
} from "./setup";
import type { JSDOM } from "jsdom";
import { MERGE_FIXTURES } from "../../fixtures/merge";

type PromptItem = {
	slug: string;
	name: string;
	description: string;
	content: string;
	mergeFields: string[];
	tags: string[];
	parameters: unknown[];
	pinned: boolean;
	favorited: boolean;
	usageCount: number;
	lastUsedAt?: number;
};

const promptWithMergeFields: PromptItem = {
	slug: "merge-test",
	name: "Merge Test",
	description: "A test prompt with merge fields",
	content: MERGE_FIXTURES.twoFields.content,
	mergeFields: [...MERGE_FIXTURES.twoFields.mergeFields],
	tags: ["test"],
	parameters: [],
	pinned: false,
	favorited: false,
	usageCount: 0,
	lastUsedAt: undefined,
};

const promptWithDuplicates: PromptItem = {
	slug: "dup-test",
	name: "Duplicate Test",
	description: "A test prompt with duplicate fields",
	content:
		"{{language}} is great. I love {{language}}. Use {{language}} always.",
	mergeFields: ["language"],
	tags: ["test"],
	parameters: [],
	pinned: false,
	favorited: false,
	usageCount: 0,
	lastUsedAt: undefined,
};

const promptWithoutMergeFields: PromptItem = {
	slug: "no-merge",
	name: "No Merge",
	description: "A test prompt without merge fields",
	content: MERGE_FIXTURES.noFields.content,
	mergeFields: [],
	tags: ["test"],
	parameters: [],
	pinned: false,
	favorited: false,
	usageCount: 0,
	lastUsedAt: undefined,
};

describe("Prompts Module - Merge Mode", () => {
	let dom: JSDOM;
	let clipboard: ReturnType<typeof setupClipboard>;

	beforeEach(async () => {
		dom = await loadTemplate("prompts.html");
		clipboard = setupClipboard(dom);
	});

	function configureFetch(
		prompts: PromptItem[],
		extraResponses: Record<
			string,
			{ ok?: boolean; status?: number; data: unknown }
		> = {},
	) {
		const promptData = prompts.map((prompt) => ({
			...prompt,
			mergeFields: [...(prompt.mergeFields || [])],
			tags: [...(prompt.tags || [])],
			parameters: [...(prompt.parameters || [])],
		}));

		const fetchMock = mockFetch({
			"/api/prompts/tags": { data: { purpose: [], domain: [], task: [] } },
			"/api/prompts": { data: promptData },
			...extraResponses,
		});
		dom.window.fetch = fetchMock;
		return fetchMock;
	}

	async function loadAndSelect(
		prompts: PromptItem[],
		slug: string,
		extraResponses: Record<
			string,
			{ ok?: boolean; status?: number; data: unknown }
		> = {},
	) {
		const fetchMock = configureFetch(prompts, extraResponses);
		dom.window.loadPrompts();
		await waitForAsync(120);

		const item = assertElement(
			dom.window.document.querySelector(`.prompt-item[data-slug="${slug}"]`),
			`Expected prompt item for ${slug}`,
		);
		click(item);
		await waitForAsync(120);

		return fetchMock;
	}

	async function enterMergeMode() {
		const toggle = assertElement(
			dom.window.document.getElementById("merge-toggle"),
			"Expected merge toggle",
		);
		click(toggle);
		await waitForAsync(140);
	}

	it("TC-3.1a: merge button visible for prompts with merge fields", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		const mergeToggle = assertElement(
			dom.window.document.getElementById("merge-toggle"),
		);
		expect(mergeToggle.style.display).not.toBe("none");
	});

	it("TC-3.1b: merge button hidden for prompts without merge fields", async () => {
		await loadAndSelect([promptWithoutMergeFields], "no-merge");
		const mergeToggle = assertElement(
			dom.window.document.getElementById("merge-toggle"),
		);
		expect(mergeToggle.style.display).toBe("none");
	});

	it("merge mode entry fails gracefully when renderer dependency is missing", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");

		(dom.window.promptViewer as { renderMarkdown?: unknown }).renderMarkdown =
			undefined;

		const mergeToggle = assertElement(
			dom.window.document.getElementById("merge-toggle"),
		);
		click(mergeToggle);
		await waitForAsync(120);

		const viewer = assertElement(
			dom.window.document.getElementById("promptViewer"),
		);
		const editBtn = assertElement(dom.window.document.getElementById("edit-btn"));
		const lineEditToggle = assertElement(
			dom.window.document.getElementById("line-edit-toggle"),
		);
		const errorToast = assertElement(
			dom.window.document.querySelector(".toast-error .toast-message"),
		);

		expect(viewer.classList.contains("merge-mode")).toBe(false);
		expect(mergeToggle.classList.contains("active")).toBe(false);
		expect(editBtn.style.display).toBe("");
		expect(lineEditToggle.style.display).toBe("");
		expect(errorToast.textContent).toContain("Merge mode is temporarily unavailable");
	});

	it("TC-3.2a: content renders as markdown in merge mode", async () => {
		const markdownPrompt = {
			...promptWithMergeFields,
			content: "# Header\n\nWrite {{code}} in {{language}}",
		};

		await loadAndSelect([markdownPrompt], "merge-test");

		const originalRender = dom.window.promptViewer.renderMarkdown;
		dom.window.promptViewer.renderMarkdown = vi.fn((content: string) => ({
			html: content.replace(/^# Header/m, "<h1>Header</h1>"),
			stats: { tags: 0, vars: 2 },
		}));

		await enterMergeMode();

		const viewer = assertElement(
			dom.window.document.getElementById("promptViewer"),
		);
		const contentEl = assertElement(
			dom.window.document.getElementById("promptContent"),
		);
		expect(viewer.classList.contains("view-rendered")).toBe(true);
		expect(contentEl.querySelector("h1")?.textContent).toBe("Header");
		dom.window.promptViewer.renderMarkdown = originalRender;
	});

	it("TC-3.2b: fields become inputs with braces", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const wrappers = dom.window.document.querySelectorAll(
			".merge-input-wrapper",
		);
		expect(wrappers.length).toBe(2);

		const codeInput = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		expect(codeInput.placeholder).toBe("code");
	});

	it("TC-3.2c: duplicate fields synchronize values", async () => {
		await loadAndSelect([promptWithDuplicates], "dup-test");
		await enterMergeMode();

		const inputs = dom.window.document.querySelectorAll(
			"input.merge-input[data-field='language']",
		) as NodeListOf<HTMLInputElement>;
		expect(inputs.length).toBe(3);
		const firstInput = assertElement(inputs[0]);
		const secondInput = assertElement(inputs[1]);
		const thirdInput = assertElement(inputs[2]);

		input(firstInput, "Python");
		expect(firstInput.value).toBe("Python");
		expect(secondInput.value).toBe("Python");
		expect(thirdInput.value).toBe("Python");
	});

	it("TC-3.2d: filled fields are visually distinct", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const codeInput = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		const codeWrapper = assertElement(
			codeInput.closest(".merge-input-wrapper"),
		);
		expect(codeWrapper.classList.contains("filled")).toBe(false);

		input(codeInput, "console.log(1)");
		expect(codeWrapper.classList.contains("filled")).toBe(true);
	});

	it("TC-3.3a: copy produces fully merged content", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in JavaScript",
					mergeFields: ["code", "language"],
					unfilledFields: [],
				},
			},
		});
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='language']",
				) as HTMLInputElement,
			),
			"JavaScript",
		);

		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		expect(clipboard.writeText).toHaveBeenCalledWith(
			"Write console.log(1) in JavaScript",
		);
	});

	it("TC-3.3b: partial copy preserves unfilled fields", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in {{language}}",
					mergeFields: ["code", "language"],
					unfilledFields: ["language"],
				},
			},
		});
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);

		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		expect(clipboard.writeText).toHaveBeenCalledWith(
			"Write console.log(1) in {{language}}",
		);
	});

	it("TC-3.4a: unfilled field warning on copy", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in {{language}}",
					mergeFields: ["code", "language"],
					unfilledFields: ["language"],
				},
			},
		});
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		const toast = assertElement(
			dom.window.document.querySelector(".toast-warning .toast-message"),
		);
		expect(toast.textContent).toContain("unfilled fields: language");
	});

	it("TC-3.4b: warning does not block copy", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in {{language}}",
					mergeFields: ["code", "language"],
					unfilledFields: ["language"],
				},
			},
		});
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		expect(clipboard.writeText).toHaveBeenCalledTimes(1);
	});

	it("TC-3.5a: authoring controls hidden in merge mode", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		expect(
			assertElement(dom.window.document.getElementById("edit-btn")).style
				.display,
		).toBe("none");
		expect(
			assertElement(dom.window.document.getElementById("line-edit-toggle"))
				.style.display,
		).toBe("none");
	});

	it("TC-3.5b: authoring controls restored on exit", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(120);

		expect(
			assertElement(dom.window.document.getElementById("edit-btn")).style
				.display,
		).toBe("");
		expect(
			assertElement(dom.window.document.getElementById("line-edit-toggle"))
				.style.display,
		).toBe("");
	});

	it("TC-3.6a: line edit resumes if it was on", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		click(
			assertElement(dom.window.document.getElementById("line-edit-toggle")),
		);
		await waitForAsync(80);

		await enterMergeMode();
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(120);

		const viewer = assertElement(
			dom.window.document.getElementById("promptViewer"),
		);
		expect(viewer.classList.contains("line-edit-mode")).toBe(true);
		expect(
			dom.window.document.querySelectorAll(".editable-line").length,
		).toBeGreaterThan(0);
	});

	it("TC-3.6b: plain view if line edit was off", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(120);

		const viewer = assertElement(
			dom.window.document.getElementById("promptViewer"),
		);
		expect(viewer.classList.contains("line-edit-mode")).toBe(false);
		expect(dom.window.document.querySelectorAll(".editable-line").length).toBe(
			0,
		);
	});

	it("TC-3.6c: line edit localStorage preference unchanged", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");

		click(
			assertElement(dom.window.document.getElementById("line-edit-toggle")),
		);
		await waitForAsync(80);
		expect(dom.window.localStorage.getItem("lineEditEnabled")).toBe("true");

		await enterMergeMode();
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(120);

		expect(dom.window.localStorage.getItem("lineEditEnabled")).toBe("true");
	});

	it("TC-3.7a: confirm when fields filled but not copied", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);

		const confirmMock = vi.fn(() => false);
		dom.window.confirm = confirmMock;

		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(80);

		expect(confirmMock).toHaveBeenCalledTimes(1);
		expect(
			assertElement(
				dom.window.document.getElementById("promptViewer"),
			).classList.contains("merge-mode"),
		).toBe(true);
	});

	it("TC-3.7b: no confirm when no fields touched", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const confirmMock = vi.fn(() => true);
		dom.window.confirm = confirmMock;
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(80);

		expect(confirmMock).not.toHaveBeenCalled();
		expect(
			assertElement(
				dom.window.document.getElementById("promptViewer"),
			).classList.contains("merge-mode"),
		).toBe(false);
	});

	it("TC-3.7c: no confirm after successful copy", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in JavaScript",
					mergeFields: ["code", "language"],
					unfilledFields: [],
				},
			},
		});
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		const confirmMock = vi.fn(() => true);
		dom.window.confirm = confirmMock;
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(80);

		expect(confirmMock).not.toHaveBeenCalled();
	});

	it("TC-3.7d: confirm if fields edited after copy", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test/merge": {
				data: {
					content: "Write console.log(1) in JavaScript",
					mergeFields: ["code", "language"],
					unfilledFields: [],
				},
			},
		});
		await enterMergeMode();

		const codeInput = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		input(codeInput, "console.log(1)");
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);
		input(codeInput, "console.log(2)");

		const confirmMock = vi.fn(() => true);
		dom.window.confirm = confirmMock;
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(80);

		expect(confirmMock).toHaveBeenCalledTimes(1);
	});

	it("TC-3.7e: confirm on prompt navigation with dirty fields", async () => {
		await loadAndSelect(
			[promptWithMergeFields, promptWithDuplicates],
			"merge-test",
		);
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);

		const confirmMock = vi.fn(() => false);
		dom.window.confirm = confirmMock;
		const secondItem = assertElement(
			dom.window.document.querySelector(".prompt-item[data-slug='dup-test']"),
		);
		click(secondItem);
		await waitForAsync(100);

		expect(confirmMock).toHaveBeenCalledTimes(1);
		expect(
			assertElement(dom.window.document.getElementById("prompt-slug"))
				.textContent,
		).toBe("merge-test");
	});

	it("TC-3.8a: active line edit saved before mode switch", async () => {
		const fetchMock = await loadAndSelect(
			[promptWithMergeFields],
			"merge-test",
			{
				"/api/prompts/merge-test": { data: promptWithMergeFields },
			},
		);

		click(
			assertElement(dom.window.document.getElementById("line-edit-toggle")),
		);
		await waitForAsync(80);

		const editable = assertElement(
			dom.window.document.querySelector(".editable-line"),
		);
		click(editable);
		await waitForAsync(80);

		const lineInput = assertElement(
			dom.window.document.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement,
		);
		input(lineInput, "Updated line content");

		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(220);

		const saveCalls = fetchMock.mock.calls.filter(([url, opts]: unknown[]) => {
			return (
				typeof url === "string" &&
				url.includes("/api/prompts/merge-test") &&
				(opts as RequestInit | undefined)?.method === "PUT"
			);
		});
		expect(saveCalls.length).toBeGreaterThan(0);
		expect(
			assertElement(
				dom.window.document.getElementById("promptViewer"),
			).classList.contains("merge-mode"),
		).toBe(true);
	});

	it("TC-3.8b: line edit save failure blocks mode switch", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test", {
			"/api/prompts/merge-test": {
				ok: false,
				status: 500,
				data: { error: "Save failed" },
			},
		});

		click(
			assertElement(dom.window.document.getElementById("line-edit-toggle")),
		);
		await waitForAsync(80);

		const editable = assertElement(
			dom.window.document.querySelector(".editable-line"),
		);
		click(editable);
		await waitForAsync(80);

		const lineInput = assertElement(
			dom.window.document.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement,
		);
		input(lineInput, "Will fail");

		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(220);

		const viewer = assertElement(
			dom.window.document.getElementById("promptViewer"),
		);
		expect(viewer.classList.contains("merge-mode")).toBe(false);
		expect(viewer.classList.contains("line-edit-mode")).toBe(true);
	});

	it("TC-3.9a: full copy increments usage count (fetch called)", async () => {
		const fetchMock = await loadAndSelect(
			[promptWithMergeFields],
			"merge-test",
			{
				"/api/prompts/merge-test/merge": {
					data: {
						content: "Write console.log(1) in JavaScript",
						mergeFields: ["code", "language"],
						unfilledFields: [],
					},
				},
			},
		);
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='language']",
				) as HTMLInputElement,
			),
			"JavaScript",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		const mergeCalls = fetchMock.mock.calls.filter(([url]: unknown[]) =>
			typeof url === "string"
				? url.includes("/api/prompts/merge-test/merge")
				: false,
		);
		expect(mergeCalls.length).toBe(1);
	});

	it("TC-3.9b: partial copy increments usage count", async () => {
		const fetchMock = await loadAndSelect(
			[promptWithMergeFields],
			"merge-test",
			{
				"/api/prompts/merge-test/merge": {
					data: {
						content: "Write console.log(1) in {{language}}",
						mergeFields: ["code", "language"],
						unfilledFields: ["language"],
					},
				},
			},
		);
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		const mergeCalls = fetchMock.mock.calls.filter(([url]: unknown[]) =>
			typeof url === "string"
				? url.includes("/api/prompts/merge-test/merge")
				: false,
		);
		expect(mergeCalls.length).toBe(1);
	});

	it("TC-3.9c: repeated copies increment each time", async () => {
		const fetchMock = await loadAndSelect(
			[promptWithMergeFields],
			"merge-test",
			{
				"/api/prompts/merge-test/merge": {
					data: {
						content: "Write console.log(1) in JavaScript",
						mergeFields: ["code", "language"],
						unfilledFields: [],
					},
				},
			},
		);
		await enterMergeMode();

		input(
			assertElement(
				dom.window.document.querySelector(
					"input.merge-input[data-field='code']",
				) as HTMLInputElement,
			),
			"console.log(1)",
		);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);
		click(assertElement(dom.window.document.getElementById("copy-btn")));
		await waitForAsync(120);

		const mergeCalls = fetchMock.mock.calls.filter(([url]: unknown[]) =>
			typeof url === "string"
				? url.includes("/api/prompts/merge-test/merge")
				: false,
		);
		expect(mergeCalls.length).toBe(2);
	});

	it("TC-3.10a: tab navigates between field inputs", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const inputs = dom.window.document.querySelectorAll(
			"input.merge-input",
		) as NodeListOf<HTMLInputElement>;
		expect(inputs.length).toBe(2);
		expect(assertElement(inputs[0]).getAttribute("tabindex")).toBeNull();
		expect(assertElement(inputs[1]).getAttribute("tabindex")).toBeNull();

		const fieldOrder = Array.from(inputs).map((el) => el.dataset.field);
		expect(fieldOrder).toEqual(["code", "language"]);
	});

	it("TC-3.11a: HTML in value displays as literal text", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const payload = "<script>alert(1)</script>";
		const codeInput = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		input(codeInput, payload);

		expect(codeInput.value).toBe(payload);
		expect(
			dom.window.document.querySelector("#promptContent script"),
		).toBeNull();
	});

	it("TC-3.12a: values cleared on re-entry", async () => {
		await loadAndSelect([promptWithMergeFields], "merge-test");
		await enterMergeMode();

		const codeInput = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		input(codeInput, "console.log(1)");

		dom.window.confirm = vi.fn(() => true);
		click(assertElement(dom.window.document.getElementById("merge-toggle")));
		await waitForAsync(120);
		await enterMergeMode();

		const codeInputAgain = assertElement(
			dom.window.document.querySelector(
				"input.merge-input[data-field='code']",
			) as HTMLInputElement,
		);
		expect(codeInputAgain.value).toBe("");
	});

	it("non-TC: literal %%%MERGE_N%%% text not replaced", async () => {
		const literalPrompt: PromptItem = {
			...promptWithMergeFields,
			slug: "literal-test",
			name: "Literal Placeholder",
			description: "Contains literal merge-like placeholder text",
			content: MERGE_FIXTURES.literalPlaceholder.content,
			mergeFields: [...MERGE_FIXTURES.literalPlaceholder.mergeFields],
		};

		await loadAndSelect([literalPrompt], "literal-test");
		await enterMergeMode();

		const contentText =
			assertElement(dom.window.document.getElementById("promptContent"))
				.textContent || "";
		expect(contentText).toContain("%%%MERGE_0_name%%%");
		expect(
			dom.window.document.querySelectorAll(
				"input.merge-input[data-field='name']",
			).length,
		).toBe(1);
	});
});
