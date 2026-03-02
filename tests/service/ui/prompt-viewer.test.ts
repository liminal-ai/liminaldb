/**
 * Service tests for prompt viewer functionality in prompts.html
 * Tests semantic-only view mode, copy button, and content rendering
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
	loadTemplate,
	mockFetch,
	mockPrompts,
	setupClipboard,
	click,
	blur,
	waitForAsync,
	assertElement,
} from "./setup";
import type { JSDOM } from "jsdom";

describe("Prompts Module - Prompt Viewer", () => {
	let dom: JSDOM;

	const promptWithContent = {
		slug: "test-prompt",
		name: "Test Prompt",
		description: "A test prompt",
		content: "# Header\n\nHello {{name}}, this is **bold** and `code`.",
		mergeFields: ["name"],
		tags: ["test"],
		parameters: [],
	};

	beforeEach(async () => {
		dom = await loadTemplate("prompts.html");
		dom.window.fetch = mockFetch({
			"/api/prompts": { data: [promptWithContent, ...mockPrompts] },
		});
		setupClipboard(dom);
	});

	describe("view mode (semantic only)", () => {
		it("has no mode selector buttons in DOM", async () => {
			const modeButtons = dom.window.document.querySelectorAll("[data-view]");
			expect(modeButtons.length).toBe(0);
		});

		it("viewer defaults to semantic mode", async () => {
			const viewer = dom.window.document.getElementById("promptViewer");
			expect(viewer?.classList.contains("view-semantic")).toBe(true);
		});
	});

	describe("copy button", () => {
		it("has a copy button", async () => {
			const copyBtn = dom.window.document.getElementById("copy-btn");
			expect(copyBtn).not.toBeNull();
		});

		it("copies raw content to clipboard when clicked", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const copyBtn = assertElement(
				dom.window.document.getElementById("copy-btn"),
				"Expected copy button to exist",
			);
			click(copyBtn);
			await waitForAsync(50);

			const clipboard = dom.window.navigator.clipboard as unknown as {
				writeText: { mock: { calls: string[][] } };
			};
			expect(clipboard.writeText.mock.calls.length).toBeGreaterThan(0);
		});
	});

	describe("content display", () => {
		it("shows empty state initially", async () => {
			const emptyState = dom.window.document.querySelector(".empty-state");
			expect(emptyState).not.toBeNull();
		});

		it("displays content when prompt selected", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const contentEl = assertElement(
				dom.window.document.getElementById("promptContent"),
				"Expected promptContent element to exist",
			);
			expect(contentEl.innerHTML.length).toBeGreaterThan(0);
		});

		it("updates stats when prompt selected", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const charsEl = assertElement(
				dom.window.document.getElementById("statChars"),
				"Expected statChars element to exist",
			);
			expect(charsEl.textContent).not.toBe("0");
		});
	});

	describe("prompt selection", () => {
		it("adds selected class to clicked prompt", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(50);

			expect(firstItem.classList.contains("selected")).toBe(true);
		});

		it("removes selected class from previous selection", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const items = dom.window.document.querySelectorAll(".prompt-item");
			expect(items.length).toBeGreaterThanOrEqual(2);

			const first = assertElement(items[0], "Expected first item to exist");
			const second = assertElement(items[1], "Expected second item to exist");

			click(first);
			await waitForAsync(50);
			click(second);
			await waitForAsync(50);

			expect(first.classList.contains("selected")).toBe(false);
			expect(second.classList.contains("selected")).toBe(true);
		});
	});

	/**
	 * TC-6.6: Line Edit Mode
	 */
	describe("TC-6.6: Line Edit Mode", () => {
		it("line edit toggle is enabled by default", async () => {
			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			expect(toggle).not.toBeNull();
			expect(toggle.disabled).toBe(false);
		});

		it("clicking line edit toggle activates line edit mode", async () => {
			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			click(toggle);
			await waitForAsync(50);

			// Toggle should be active
			expect(toggle.classList.contains("active")).toBe(true);

			// Viewer should have line-edit-mode class
			const viewer = dom.window.document.getElementById("promptViewer");
			expect(viewer?.classList.contains("line-edit-mode")).toBe(true);
		});

		it("line edit mode shows editable lines when content is displayed", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select a prompt
			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			// Enable line edit
			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			click(toggle);
			await waitForAsync(50);

			// Content should have editable-line spans
			const contentEl = dom.window.document.getElementById("promptContent");
			const editableLines = contentEl?.querySelectorAll(".editable-line");
			expect(editableLines?.length).toBeGreaterThan(0);
		});

		it("clicking editable line creates input for editing", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select a prompt
			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			// Enable line edit
			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			click(toggle);
			await waitForAsync(50);

			// Click first editable line
			const contentEl = dom.window.document.getElementById("promptContent");
			const firstLine = contentEl?.querySelector(".editable-line");
			if (!firstLine) throw new Error("No editable line found");
			click(firstLine);
			await waitForAsync(50);

			// Should have input/textarea
			const input = contentEl?.querySelector(".line-edit-input");
			expect(input).not.toBeNull();
		});

		it("line edit save persists via PUT /api/prompts/:slug", async () => {
			const fetchMock = mockFetch({
				"/api/prompts/test-prompt": { data: { slug: "test-prompt" } },
				"/api/prompts": { data: [promptWithContent, ...mockPrompts] },
				"/api/drafts/": { data: {} },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			click(toggle);
			await waitForAsync(50);

			const contentEl = dom.window.document.getElementById("promptContent");
			const firstLine = contentEl?.querySelector(".editable-line");
			if (!firstLine) throw new Error("No editable line found");
			click(firstLine);
			await waitForAsync(50);

			const textarea = contentEl?.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement;
			if (!textarea) throw new Error("No textarea found");
			textarea.value = "Modified line content";

			blur(textarea);
			await waitForAsync(200);

			const putCalls = fetchMock.mock.calls.filter((call: unknown[]) => {
				const opts = call[1] as RequestInit | undefined;
				return opts?.method === "PUT";
			});
			expect(putCalls.length).toBeGreaterThan(0);

			const firstPutCall = putCalls[0];
			if (!firstPutCall) throw new Error("Expected PUT call");
			const putOptions = firstPutCall[1] as RequestInit | undefined;
			if (!putOptions?.body) throw new Error("Expected PUT body");
			const putBody = JSON.parse(putOptions.body as string);
			expect(putBody.content).toContain("Modified line content");
		});

		it("line edit save failure shows error toast and reverts content", async () => {
			const fetchMock = mockFetch({
				"/api/prompts/test-prompt": {
					ok: false,
					status: 500,
					data: { error: "Server error" },
				},
				"/api/prompts": { data: [promptWithContent, ...mockPrompts] },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const toggle = dom.window.document.getElementById(
				"line-edit-toggle",
			) as HTMLButtonElement;
			click(toggle);
			await waitForAsync(50);

			const contentEl = dom.window.document.getElementById("promptContent");
			const firstLine = contentEl?.querySelector(".editable-line");
			if (!firstLine) throw new Error("No editable line found");
			const originalText = firstLine.textContent || "";
			click(firstLine);
			await waitForAsync(50);

			const textarea = contentEl?.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement;
			if (!textarea) throw new Error("No textarea found");
			textarea.value = "This should not persist";

			blur(textarea);
			await waitForAsync(200);

			const toastEl = dom.window.document.querySelector(".toast-error, .toast.error");
			expect(toastEl).not.toBeNull();

			const updatedLine = contentEl?.querySelector(".editable-line");
			expect(updatedLine?.textContent).toBe(originalText);
		});
	});
});
