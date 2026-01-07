/**
 * Service tests for prompt viewer functionality in prompts.html
 * Tests view mode toggling, copy button, and content rendering
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
	loadTemplate,
	mockFetch,
	mockPrompts,
	setupClipboard,
	click,
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

	describe("view mode toggling", () => {
		it("has view mode buttons", async () => {
			const renderedBtn = dom.window.document.querySelector(
				'[data-view="rendered"]',
			);
			const semanticBtn = dom.window.document.querySelector(
				'[data-view="semantic"]',
			);
			const plainBtn = dom.window.document.querySelector('[data-view="plain"]');

			expect(renderedBtn).not.toBeNull();
			expect(semanticBtn).not.toBeNull();
			expect(plainBtn).not.toBeNull();
		});

		it("rendered button is active by default", async () => {
			const renderedBtn = assertElement(
				dom.window.document.querySelector('[data-view="rendered"]'),
				"Expected rendered button to exist",
			);
			expect(renderedBtn.classList.contains("active")).toBe(true);
		});

		it("clicking semantic activates it and deactivates rendered", async () => {
			const semanticBtn = assertElement(
				dom.window.document.querySelector('[data-view="semantic"]'),
				"Expected semantic button to exist",
			);
			const renderedBtn = assertElement(
				dom.window.document.querySelector('[data-view="rendered"]'),
				"Expected rendered button to exist",
			);

			click(semanticBtn);
			await waitForAsync(50);

			expect(semanticBtn.classList.contains("active")).toBe(true);
			expect(renderedBtn.classList.contains("active")).toBe(false);
		});

		it("clicking plain activates it", async () => {
			const plainBtn = assertElement(
				dom.window.document.querySelector('[data-view="plain"]'),
				"Expected plain button to exist",
			);

			click(plainBtn);
			await waitForAsync(50);

			expect(plainBtn.classList.contains("active")).toBe(true);
		});

		it("plain view renders raw text without semantic spans", async () => {
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = assertElement(
				dom.window.document.querySelector(".prompt-item"),
				"Expected prompt item to exist",
			);
			click(firstItem);
			await waitForAsync(100);

			const plainBtn = assertElement(
				dom.window.document.querySelector('[data-view="plain"]'),
				"Expected plain button to exist",
			);
			click(plainBtn);
			await waitForAsync(50);

			const contentEl = assertElement(
				dom.window.document.getElementById("promptContent"),
				"Expected promptContent element to exist",
			);
			expect(contentEl.innerHTML).not.toContain("<span");
		});

		it("stores view mode in localStorage", async () => {
			const semanticBtn = assertElement(
				dom.window.document.querySelector('[data-view="semantic"]'),
				"Expected semantic button to exist",
			);

			click(semanticBtn);
			await waitForAsync(50);

			expect(dom.window.localStorage.getItem("promptViewMode")).toBe(
				"semantic",
			);
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
});
