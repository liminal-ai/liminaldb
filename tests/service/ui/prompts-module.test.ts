import { describe, test, expect, beforeEach, vi } from "vitest";
import {
	loadTemplate,
	mockPrompts,
	mockFetch,
	setupClipboard,
	waitForAsync,
	click,
	postMessage,
} from "./setup";
import type { JSDOM } from "jsdom";

describe("Prompts Module", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await loadTemplate("prompts.html");
	});

	describe("TC-2.2: Page load fetches and renders prompt list", () => {
		test("fetches /api/prompts on load", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			dom.window.fetch = fetchMock;

			// Trigger initial load (deferred for testability)
			dom.window.loadPrompts();
			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts"),
				expect.any(Object),
			);
		});

		test("renders prompt items in list", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const items = dom.window.document.querySelectorAll(".prompt-item");
			expect(items.length).toBe(2);
		});

		test("displays slug in list item", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const listHtml =
				dom.window.document.getElementById("prompt-list")?.innerHTML;
			expect(listHtml).toContain("code-review");
		});

		test("displays tags in list item", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const listHtml =
				dom.window.document.getElementById("prompt-list")?.innerHTML;
			expect(listHtml).toContain("code");
			expect(listHtml).toContain("review");
		});
	});

	describe("TC-2.3: Click prompt item displays content", () => {
		test("clicking prompt shows content area", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) {
				throw new Error("Prompt item not found");
			}
			click(firstItem);

			await waitForAsync(50);

			const promptView = dom.window.document.getElementById("prompt-view");
			expect(promptView?.style.display).not.toBe("none");
		});

		test("content area shows prompt slug", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) {
				throw new Error("Prompt item not found");
			}
			click(firstItem);

			await waitForAsync(50);

			const slugEl = dom.window.document.getElementById("prompt-slug");
			expect(slugEl?.textContent).toBe("code-review");
		});

		test("content area shows prompt content", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) {
				throw new Error("Prompt item not found");
			}
			click(firstItem);

			await waitForAsync(50);

			const contentEl = dom.window.document.getElementById("prompt-content");
			expect(contentEl?.textContent).toContain("You are a code reviewer");
		});

		test("clicked item has selected class", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) {
				throw new Error("Prompt item not found");
			}
			click(firstItem);

			await waitForAsync(50);

			expect(firstItem?.classList.contains("selected")).toBe(true);
		});
	});

	describe("TC-2.4: Search triggers API call", () => {
		test("receiving shell:search message calls API with query", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			dom.window.fetch = fetchMock;

			// Initial load
			dom.window.loadPrompts();
			await waitForAsync(100);
			fetchMock.mockClear();

			// Search message from shell
			postMessage(dom, { type: "shell:search", query: "code" });

			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts?q=code"),
				expect.any(Object),
			);
		});
	});

	describe("TC-2.5: Copy writes to clipboard", () => {
		test("copy button copies content to clipboard", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			const clipboard = setupClipboard(dom);

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select a prompt first
			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) {
				throw new Error("Prompt item not found");
			}
			click(firstItem);
			await waitForAsync(50);

			// Click copy
			const copyBtn = dom.window.document.getElementById("copy-btn");
			if (!copyBtn) {
				throw new Error("Copy button not found");
			}
			click(copyBtn);
			await waitForAsync(50);

			expect(clipboard.writeText).toHaveBeenCalledWith(
				expect.stringContaining("You are a code reviewer"),
			);
		});
	});

	describe("TC-3.1: New Prompt navigates to editor", () => {
		test("clicking New Prompt sends navigate message", async () => {
			const postMessageSpy = vi.fn();
			dom.window.parent.postMessage = postMessageSpy;

			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) {
				throw new Error("New prompt button not found");
			}
			click(newBtn);

			expect(postMessageSpy).toHaveBeenCalledWith(
				{ type: "module:navigate", path: "/prompts/new" },
				"*",
			);
		});
	});
});
