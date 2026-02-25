import { describe, test, expect, beforeEach, vi } from "vitest";
import {
	loadTemplate,
	mockPrompts,
	mockFetch,
	setupClipboard,
	waitForAsync,
	click,
	input,
	blur,
	postMessage,
	assertSinglePanel,
	enterEditModeForPrompt,
	resolveConfirmDialog,
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

			const contentEl = dom.window.document.getElementById("promptContent");
			expect(contentEl?.textContent).toContain("code reviewer");
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
		test("clicking New Prompt enters insert mode", async () => {
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();

			// Editor should be visible
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");

			// Empty state should be hidden
			const emptyState = dom.window.document.getElementById("empty-state");
			expect(emptyState?.style.display).toBe("none");
		});

		test("clicking New Prompt hides home module", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Home module should be hidden
			const homeModule = dom.window.document.getElementById("home-module");
			expect(homeModule?.classList.contains("hidden")).toBe(true);

			// Editor should be visible
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");
		});
	});

	describe("TC-6.1: Insert Mode - Single Prompt", () => {
		test("form shows empty/default values for new prompt", async () => {
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Form fields should be empty or have default values
			const slugInput = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement;
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			const contentInput = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			expect(slugInput?.value).toBe("");
			expect(nameInput?.value).toBe("New Prompt"); // Default value
			expect(contentInput?.value).toBe("");
		});

		test("valid form submission calls POST /api/prompts", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: { ids: ["test-id"] } },
			});
			dom.window.fetch = fetchMock;

			// Enter insert mode
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Fill form via input helper
			const slugInput = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement;
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			const descInput = dom.window.document.getElementById(
				"editor-description",
			) as HTMLInputElement;
			const contentInput = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			input(slugInput, "test-prompt");
			input(nameInput, "Test Prompt");
			input(descInput, "A test description");
			input(contentInput, "Test content here");

			// Click save button
			const saveBtn = dom.window.document.getElementById("btn-save");
			if (!saveBtn) throw new Error("Save button not found");
			click(saveBtn);
			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts"),
				expect.objectContaining({
					method: "POST",
				}),
			);
		});

		test("validation errors display inline on form fields", async () => {
			// Enter insert mode
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Leave all fields empty - should trigger validation
			const saveBtn = dom.window.document.getElementById("btn-save");
			if (!saveBtn) throw new Error("Save button not found");
			click(saveBtn);
			await waitForAsync(50);

			// Check for field errors (the row gets the class)
			const slugRow = dom.window.document.querySelector('[data-field="slug"]');
			const slugInput = dom.window.document.getElementById("editor-slug");
			// Either the row or input should have error indicator
			const hasError =
				slugRow?.classList.contains("has-error") ||
				slugInput?.classList.contains("field-error") ||
				dom.window.document.getElementById("error-slug")?.textContent !== "";
			expect(hasError).toBe(true);
		});

		test("discard button exits insert mode without save", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			dom.window.fetch = fetchMock;

			// Load prompts first
			dom.window.loadPrompts();
			await waitForAsync(100);

			// Enter insert mode
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Click discard button (inside editor)
			const discardBtn = dom.window.document.getElementById("btn-discard");
			if (!discardBtn) throw new Error("Discard button not found");
			click(discardBtn);
			await waitForAsync(50);

			// Editor should be hidden
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("none");

			// No POST calls should have been made (only GET for list refresh is OK)
			const postCalls = fetchMock.mock.calls.filter(
				(call: unknown[]) =>
					(call[1] as { method?: string })?.method === "POST",
			);
			expect(postCalls.length).toBe(0);
		});
	});

	describe("TC-6.2: Insert Mode - New Prompt Reset", () => {
		test("second +New click resets to single staging entry", async () => {
			// Click +New twice (second click tears down clean first, starts fresh)
			await dom.window.enterInsertMode();
			await waitForAsync(50);
			await dom.window.enterInsertMode();
			await waitForAsync(100);

			// Should have only 1 staging entry, not 2
			const stagingItems = dom.window.document.querySelectorAll(
				".prompt-item.staging",
			);
			expect(stagingItems.length).toBe(1);
		});

		test("second +New click shows editor for fresh prompt", async () => {
			// First click
			await dom.window.enterInsertMode();
			await waitForAsync(50);

			// Second click tears down first, creates fresh single entry
			await dom.window.enterInsertMode();
			await waitForAsync(100);

			// Editor should still be visible with a fresh prompt
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");
		});

		test("+New after filling form shows fresh empty editor", async () => {
			// Create first prompt and fill it
			await dom.window.enterInsertMode();
			await waitForAsync(50);

			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			input(nameInput, "First Prompt");
			await waitForAsync(50);

			// Click +New again — dirty state triggers confirm
			const insertPromise = dom.window.enterInsertMode();
			await waitForAsync(50);
			resolveConfirmDialog(dom, true);
			await insertPromise;
			await waitForAsync(100);

			// Editor should show fresh empty form
			const nameInput2 = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			expect(nameInput2?.value).toBe("New Prompt");
		});
	});

	describe("TC-6.3: Edit Mode", () => {
		test("edit button enters edit mode with form pre-populated", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			// Load prompts and select one
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Click edit button
			const editBtn = dom.window.document.getElementById("edit-btn");
			if (!editBtn) throw new Error("Edit button not found");
			click(editBtn);
			await waitForAsync(50);

			// Form should be visible
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");

			// Form should have existing data
			const slugInput = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement;
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			expect(slugInput?.value).toBe("code-review");
			expect(nameInput?.value).toBe("Code Review");
		});

		test("valid save calls PUT /api/prompts/:slug", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review": { data: { prompt: mockPrompts[0] } },
			});
			dom.window.fetch = fetchMock;

			// Load prompts and select one
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Enter edit mode
			const editBtn = dom.window.document.getElementById("edit-btn");
			if (!editBtn) throw new Error("Edit button not found");
			click(editBtn);
			await waitForAsync(50);

			// Modify content
			const contentInput = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;
			input(contentInput, "Updated content");

			fetchMock.mockClear();

			// Save
			const saveBtn = dom.window.document.getElementById("btn-save");
			if (!saveBtn) throw new Error("Save button not found");
			click(saveBtn);
			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review"),
				expect.objectContaining({
					method: "PUT",
				}),
			);
		});

		test("discard returns to view mode without save", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			dom.window.fetch = fetchMock;

			// Load prompts and select one
			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Enter edit mode
			const editBtn = dom.window.document.getElementById("edit-btn");
			if (!editBtn) throw new Error("Edit button not found");
			click(editBtn);
			await waitForAsync(50);

			// Click discard (inside editor)
			const discardBtn = dom.window.document.getElementById("btn-discard");
			if (!discardBtn) throw new Error("Discard button not found");
			click(discardBtn);
			await waitForAsync(50);

			// Should be back in view mode
			const promptView = dom.window.document.getElementById("prompt-view");
			expect(promptView?.style.display).toBe("block");

			// No PUT calls should have been made (only GET for refresh is OK)
			const putCalls = fetchMock.mock.calls.filter(
				(call: unknown[]) => (call[1] as { method?: string })?.method === "PUT",
			);
			expect(putCalls.length).toBe(0);
		});
	});

	describe("TC-6.4: Unsaved Changes Warning", () => {
		test("no confirmation when navigating without edits", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});

			// Load prompts
			dom.window.loadPrompts();
			await waitForAsync(100);

			// Enter insert mode
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			// Discard via button (not by clicking prompt)
			const discardBtn = dom.window.document.getElementById("btn-discard");
			if (!discardBtn) throw new Error("Discard button not found");
			click(discardBtn);
			await waitForAsync(50);

			// Modal should NOT be visible (no edits were made)
			const confirmModal = dom.window.document.getElementById("confirm-modal");
			expect(confirmModal?.style.display).toBe("none");

			// Editor should be hidden (exited insert mode)
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("none");
		});
	});

	/**
	 * TC-6.7: Editor Toolbar
	 *
	 * Tests for the toolbar that appears on text selection in the content textarea.
	 */
	describe("TC-6.7: Editor Toolbar", () => {
		beforeEach(async () => {
			// Enter insert mode for each test
			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);
		});

		test("toolbar is hidden by default", async () => {
			const toolbar = dom.window.document.getElementById("editor-toolbar");
			expect(toolbar?.style.visibility).toBe("hidden");
		});

		test("toolbar becomes visible on text selection in content", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content
			contentTextarea.value = "Test content for selection";

			// Simulate selection
			contentTextarea.setSelectionRange(0, 4); // Select "Test"
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			const toolbar = dom.window.document.getElementById("editor-toolbar");
			expect(toolbar?.style.visibility).toBe("visible");
		});

		test("toolbar hides when selection is cleared", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content and select
			contentTextarea.value = "Test content for selection";
			contentTextarea.setSelectionRange(0, 4);
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			// Clear selection
			contentTextarea.setSelectionRange(0, 0);
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			const toolbar = dom.window.document.getElementById("editor-toolbar");
			expect(toolbar?.style.visibility).toBe("hidden");
		});

		test("wrap tag button shows tag modal", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content and select
			contentTextarea.value = "Test content for selection";
			contentTextarea.setSelectionRange(0, 4);
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			// Click wrap tag button
			const wrapTagBtn = dom.window.document.getElementById("btn-wrap-tag");
			if (!wrapTagBtn) throw new Error("Wrap tag button not found");
			click(wrapTagBtn);
			await waitForAsync(50);

			// Tag modal should be visible
			const tagModal = dom.window.document.getElementById("tag-modal");
			expect(tagModal?.style.display).toBe("flex");
		});

		test("confirming tag modal wraps selection with tag", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content and select
			contentTextarea.value = "Test content for selection";
			contentTextarea.setSelectionRange(0, 4); // Select "Test"
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			// Open tag modal
			const wrapTagBtn = dom.window.document.getElementById("btn-wrap-tag");
			if (!wrapTagBtn) throw new Error("Wrap tag button not found");
			click(wrapTagBtn);
			await waitForAsync(50);

			// Enter tag name
			const tagInput = dom.window.document.getElementById(
				"tag-name-input",
			) as HTMLInputElement;
			tagInput.value = "example";

			// Click wrap button
			const wrapBtn = dom.window.document.getElementById("tag-modal-wrap");
			if (!wrapBtn) throw new Error("Tag modal wrap button not found");
			click(wrapBtn);
			await waitForAsync(50);

			// Content should have wrapped text
			expect(contentTextarea.value).toBe(
				"<example>Test</example> content for selection",
			);
		});

		test("insert variable button wraps selection with braces", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content and select
			contentTextarea.value = "Hello name placeholder";
			contentTextarea.setSelectionRange(6, 10); // Select "name"
			contentTextarea.dispatchEvent(new dom.window.Event("select"));
			await waitForAsync(50);

			// Click insert variable button
			const insertVarBtn = dom.window.document.getElementById("btn-insert-var");
			if (!insertVarBtn) throw new Error("Insert variable button not found");
			click(insertVarBtn);
			await waitForAsync(50);

			// Content should have wrapped text
			expect(contentTextarea.value).toBe("Hello {{name}} placeholder");
		});

		test("insert variable with no selection inserts empty placeholder", async () => {
			const contentTextarea = dom.window.document.getElementById(
				"editor-content",
			) as HTMLTextAreaElement;

			// Add content without selection
			contentTextarea.value = "Hello world";
			contentTextarea.setSelectionRange(6, 6); // Cursor after "Hello "

			// Click insert variable button
			const insertVarBtn = dom.window.document.getElementById("btn-insert-var");
			if (!insertVarBtn) throw new Error("Insert variable button not found");
			click(insertVarBtn);
			await waitForAsync(50);

			// Content should have empty placeholder
			expect(contentTextarea.value).toBe("Hello {{}}world");
		});
	});

	describe("UI Search & Pin/Favorite", () => {
		test("TC-1: typing in search filters prompts", async () => {
			// mockFetch data becomes response body - API returns array
			const fetchMock = mockFetch({ "/api/prompts": { data: mockPrompts } });
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);
			fetchMock.mockClear();

			postMessage(dom, { type: "shell:filter", query: "sql", tags: [] });
			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts?q=sql"),
				expect.any(Object),
			);
		});

		test("TC-3: empty search shows all prompts", async () => {
			const fetchMock = mockFetch({ "/api/prompts": { data: mockPrompts } });
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);
			fetchMock.mockClear();

			postMessage(dom, { type: "shell:filter", query: "", tags: [] });
			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				"/api/prompts",
				expect.any(Object),
			);
		});

		test("TC-4: no matches shows empty state message", async () => {
			const fetchMock = mockFetch({ "/api/prompts": { data: [] } });
			dom.window.fetch = fetchMock;

			postMessage(dom, { type: "shell:filter", query: "xyz", tags: [] });
			await waitForAsync(100);

			const empty = dom.window.document.getElementById("empty-state");
			expect(empty?.textContent?.toLowerCase()).toContain("no prompts match");
		});

		test("TC-14: zero prompts shows create CTA", async () => {
			const fetchMock = mockFetch({ "/api/prompts": { data: [] } });
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const empty = dom.window.document.getElementById("empty-state");
			expect(empty?.textContent?.toLowerCase()).toContain("create your first");
		});

		test("TC-20: clicking pin icon pins prompt", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review/flags": { data: { updated: true } },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			firstItem.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			await waitForAsync(50);

			const pinToggle = dom.window.document.getElementById("pin-toggle");
			if (!pinToggle) throw new Error("Pin toggle not found");
			pinToggle.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review/flags"),
				expect.objectContaining({ method: "PATCH" }),
			);
			expect(pinToggle.getAttribute("aria-pressed")).toBe("true");
		});

		test("TC-21: clicking pin on pinned prompt unpins", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": {
					data: [{ ...mockPrompts[0], pinned: true }, mockPrompts[1]],
				},
				"/api/prompts/code-review/flags": { data: { updated: true } },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			firstItem.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			await waitForAsync(50);

			const pinToggle = dom.window.document.getElementById("pin-toggle");
			if (!pinToggle) throw new Error("Pin toggle not found");
			pinToggle.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review/flags"),
				expect.objectContaining({ method: "PATCH" }),
			);
			expect(pinToggle.getAttribute("aria-pressed")).toBe("false");
		});

		test("TC-24: pin changes reflect immediately", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review/flags": { data: { updated: true } },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			firstItem.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			await waitForAsync(50);

			const pinToggle = dom.window.document.getElementById("pin-toggle");
			if (!pinToggle) throw new Error("Pin toggle not found");

			// Simulate optimistic UI update: aria-pressed should flip immediately
			pinToggle.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			expect(pinToggle.getAttribute("aria-pressed")).toBe("true");
		});

		test("TC-25: pinned prompt shows pin icon in list", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": {
					data: [{ ...mockPrompts[0], pinned: true }, mockPrompts[1]],
				},
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const pinnedItem = dom.window.document.querySelector(".prompt-item");
			if (!pinnedItem) throw new Error("Prompt item not found");
			expect(pinnedItem.querySelector(".prompt-pin")).not.toBeNull();
		});
	});

	describe("UI Delete Prompt", () => {
		test("TC-D1: clicking delete shows confirmation and sends DELETE on confirm", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review": { data: { deleted: true } },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select a prompt
			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Click delete
			const deleteBtn = dom.window.document.getElementById("delete-btn");
			if (!deleteBtn) throw new Error("Delete button not found");
			click(deleteBtn);
			await waitForAsync(50);

			// Confirm modal should be visible
			const confirmModal = dom.window.document.getElementById("confirm-modal");
			expect(confirmModal?.style.display).toBe("flex");

			// Confirm the deletion
			resolveConfirmDialog(dom, true);
			await waitForAsync(100);

			// Should have called DELETE
			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review"),
				expect.objectContaining({ method: "DELETE" }),
			);
		});

		test("TC-D2: canceling delete confirmation does not call API", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			const deleteBtn = dom.window.document.getElementById("delete-btn");
			if (!deleteBtn) throw new Error("Delete button not found");
			click(deleteBtn);
			await waitForAsync(50);

			// Cancel
			resolveConfirmDialog(dom, false);
			await waitForAsync(50);

			// Should NOT have called DELETE
			const deleteCalls = (
				fetchMock as ReturnType<typeof vi.fn>
			).mock.calls.filter(
				(args: unknown[]) =>
					(args[1] as RequestInit | undefined)?.method === "DELETE",
			);
			expect(deleteCalls).toHaveLength(0);
		});

		test("TC-D3: after delete, next prompt in list is selected", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review": { data: { deleted: true } },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select first prompt
			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Delete it
			const deleteBtn = dom.window.document.getElementById("delete-btn");
			if (!deleteBtn) throw new Error("Delete button not found");
			click(deleteBtn);
			await waitForAsync(50);

			// After confirm, loadPrompts re-fetches — mock returns only the second prompt
			fetchMock.mockClear();
			const postDeleteMock = mockFetch({
				"/api/prompts": { data: [mockPrompts[1]] },
			});
			dom.window.fetch = postDeleteMock;

			resolveConfirmDialog(dom, true);
			await waitForAsync(200);

			// The remaining prompt should be selected
			const slugEl = dom.window.document.getElementById("prompt-slug");
			expect(slugEl?.textContent).toBe("meeting-notes");
		});
	});

	describe("UI Durable Drafts", () => {
		test("TC-27: edit mode change saves to draft", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/drafts/edit:code-review": {
					data: { draftId: "edit:code-review" },
				},
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			const editBtn = dom.window.document.getElementById("edit-btn");
			if (!editBtn) throw new Error("Edit button not found");
			click(editBtn);
			await waitForAsync(50);

			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (!nameInput) throw new Error("Editor name input not found");
			vi.useFakeTimers();
			input(nameInput, "Updated Name");
			vi.advanceTimersByTime(600);

			const fetchCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls;
			expect(
				fetchCalls.some(
					([url, opts]) =>
						typeof url === "string" &&
						url.includes("/api/drafts/edit:code-review") &&
						(opts as RequestInit | undefined)?.method === "PUT",
				),
			).toBe(true);
			vi.useRealTimers();
		});

		test("TC-28: line edit saves to draft", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/code-review": { data: mockPrompts[0] }, // Mock the PUT endpoint
				"/api/drafts/edit:code-review": {
					data: { draftId: "edit:code-review" },
				},
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Enable line edit (already in semantic view by default)
			const toggle = dom.window.document.getElementById("line-edit-toggle");
			if (!toggle) throw new Error("Line edit toggle not found");
			click(toggle);
			await waitForAsync(50);

			const editable = dom.window.document.querySelector(".editable-line");
			if (!editable) throw new Error("Editable line not found");
			click(editable);
			await waitForAsync(50);

			const inputEl = dom.window.document.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement | null;
			if (!inputEl) throw new Error("Line edit input not found");
			input(inputEl, "Updated line");
			blur(inputEl);
			// Wait for async saveLineEdit to complete (it makes a fetch call)
			await waitForAsync(200);

			const fetchCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls;
			expect(
				fetchCalls.some(
					([url, opts]) =>
						typeof url === "string" &&
						url.includes("/api/drafts/edit:code-review") &&
						(opts as RequestInit | undefined)?.method === "PUT",
				),
			).toBe(true);
		});

		test("TC-29: multiple line edits accumulate in same draft", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": {
					data: [
						{ ...mockPrompts[0], content: "line one\nline two" },
						mockPrompts[1],
					],
				},
				"/api/prompts/code-review": { data: mockPrompts[0] }, // Mock the PUT endpoint
				"/api/drafts/edit:code-review": {
					data: { draftId: "edit:code-review" },
				},
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Enable line edit (already in semantic view by default)
			const toggle = dom.window.document.getElementById("line-edit-toggle");
			if (!toggle) throw new Error("Line edit toggle not found");
			click(toggle);
			await waitForAsync(50);

			const editableLines =
				dom.window.document.querySelectorAll(".editable-line");
			if (editableLines.length < 2)
				throw new Error("Not enough editable lines");

			click(editableLines[0] as Element);
			await waitForAsync(50);
			const input1 = dom.window.document.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement | null;
			if (!input1) throw new Error("Line edit input not found");
			input(input1, "Line one");
			blur(input1);
			await waitForAsync(200);

			click(editableLines[1] as Element);
			await waitForAsync(50);
			const input2 = dom.window.document.querySelector(
				".line-edit-input",
			) as HTMLTextAreaElement | null;
			if (!input2) throw new Error("Line edit input not found");
			input(input2, "Line two");
			blur(input2);
			await waitForAsync(200);

			const draftCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls.filter(
				([url]) => typeof url === "string" && url.includes("/api/drafts/"),
			);
			const draftUrls = draftCalls.map(([url]) => url as string);
			expect(new Set(draftUrls).size).toBe(1);
		});

		test("TC-30: new prompt creates draft", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/drafts/new:abc123": { data: { draftId: "new:abc123" } },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);

			const slugInput = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement | null;
			if (!slugInput) throw new Error("Editor slug input not found");
			vi.useFakeTimers();
			input(slugInput, "new-draft");
			vi.advanceTimersByTime(600);

			const fetchCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls;
			expect(
				fetchCalls.some(
					([url, opts]) =>
						typeof url === "string" &&
						url.includes("/api/drafts/new:") &&
						(opts as RequestInit | undefined)?.method === "PUT",
				),
			).toBe(true);
			vi.useRealTimers();
		});

		test("TC-31: multiple +New creates multiple drafts", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/drafts/new:abc123": { data: { draftId: "new:abc123" } },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Trigger new prompt via exposed function (button moved to shell footer)
			dom.window.enterInsertMode();
			await waitForAsync(50);
			dom.window.enterInsertMode();
			await waitForAsync(50);

			const draftCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls.filter(
				([url]) => typeof url === "string" && url.includes("/api/drafts/new:"),
			);
			expect(draftCalls.length).toBeGreaterThanOrEqual(2);
		});

		test("TC-38: save failure preserves draft", async () => {
			dom.window.fetch = mockFetch({
				// Order matters: mockFetch picks the first matching substring.
				"/api/prompts/code-review": {
					ok: false,
					status: 500,
					data: { error: "fail" },
				},
				"/api/prompts": { data: mockPrompts },
				"/api/drafts/edit:code-review": {
					data: { draftId: "edit:code-review" },
				},
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			const editBtn = dom.window.document.getElementById("edit-btn");
			if (!editBtn) throw new Error("Edit button not found");
			click(editBtn);
			await waitForAsync(50);

			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (!nameInput) throw new Error("Editor name input not found");
			input(nameInput, "Updated Name");

			const saveBtn = dom.window.document.getElementById("btn-save");
			if (!saveBtn) throw new Error("Save button not found");
			click(saveBtn);
			await waitForAsync(100);

			const fetchCalls = (
				dom.window.fetch as unknown as ReturnType<typeof vi.fn>
			).mock.calls;
			const deleteDraftCalls = fetchCalls.filter(
				([url, opts]) =>
					typeof url === "string" &&
					url.includes("/api/drafts/") &&
					(opts as RequestInit | undefined)?.method === "DELETE",
			);
			expect(deleteDraftCalls.length).toBe(0);
		});
	});

	describe("Theme Handling", () => {
		test("TC-15: shell:theme message updates portlet CSS", async () => {
			// RED: applyTheme throws NotImplementedError, CSS stays dark-1
			// GREEN: CSS link updates to match theme
			postMessage(dom, { type: "shell:theme", theme: "light-1" });

			await waitForAsync(50);

			const themeStylesheet =
				dom.window.document.getElementById("theme-stylesheet");
			expect(themeStylesheet?.getAttribute("href")).toBe(
				"/shared/themes/light-1.css",
			);
		});
	});

	describe("Tag Selector in Editor", () => {
		const mockTagsResponse = {
			purpose: ["instruction", "reference", "persona", "workflow", "snippet"],
			domain: [
				"code",
				"writing",
				"analysis",
				"planning",
				"design",
				"data",
				"communication",
			],
			task: [
				"review",
				"summarize",
				"explain",
				"debug",
				"transform",
				"extract",
				"translate",
			],
		};

		test("editor fetches tags from /api/prompts/tags on init", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": { data: mockTagsResponse },
			});
			dom.window.fetch = fetchMock;

			// Load prompts and enter new mode
			dom.window.loadPrompts();
			await waitForAsync(100);

			// Call enterInsertMode directly and await it
			await dom.window.enterInsertMode();

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/tags"),
				expect.any(Object),
			);
		});

		test("editor renders tag selector with 3 sections", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": { data: mockTagsResponse },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			await dom.window.enterInsertMode();

			const tagSections = dom.window.document.querySelectorAll(".tag-section");
			expect(tagSections.length).toBe(3);
		});

		test("tag selector renders all 19 tag chips", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": { data: mockTagsResponse },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			await dom.window.enterInsertMode();

			const tagChips = dom.window.document.querySelectorAll(".tag-chip");
			expect(tagChips.length).toBe(19);
		});

		test("clicking tag chip toggles selection", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": { data: mockTagsResponse },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			await dom.window.enterInsertMode();

			const codeChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="code"]',
			);
			if (!codeChip) throw new Error("Code tag chip not found");

			expect(codeChip.classList.contains("selected")).toBe(false);
			click(codeChip);
			expect(codeChip.classList.contains("selected")).toBe(true);
		});

		test("selected tags included in form submission", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": { data: mockTagsResponse },
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			await dom.window.enterInsertMode();

			// Fill required fields
			input(
				dom.window.document.getElementById("editor-slug") as HTMLInputElement,
				"test-prompt",
			);
			input(
				dom.window.document.getElementById("editor-name") as HTMLInputElement,
				"Test Prompt",
			);
			input(
				dom.window.document.getElementById(
					"editor-description",
				) as HTMLInputElement,
				"Test description",
			);
			input(
				dom.window.document.getElementById(
					"editor-content",
				) as HTMLTextAreaElement,
				"Test content",
			);

			// Select tags
			const codeChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="code"]',
			);
			const reviewChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="review"]',
			);
			if (!codeChip || !reviewChip) throw new Error("Tag chips not found");
			click(codeChip);
			click(reviewChip);

			fetchMock.mockClear();

			// Save
			const saveBtn = dom.window.document.getElementById("btn-save");
			if (!saveBtn) throw new Error("Save button not found");
			click(saveBtn);
			await waitForAsync(100);

			// Check that tags were included in the POST body
			const postCall = fetchMock.mock.calls.find((call) => {
				const [url, opts] = call as [string, RequestInit | undefined];
				return (
					url.includes("/api/prompts") &&
					opts?.method === "POST" &&
					!url.includes("/tags")
				);
			});
			expect(postCall).toBeDefined();
			const body = JSON.parse(
				(postCall as [string, RequestInit])[1].body as string,
			);
			expect(body.prompts[0].tags).toContain("code");
			expect(body.prompts[0].tags).toContain("review");
		});

		test("edit mode pre-selects existing tags", async () => {
			// Mock prompt with tags
			const promptWithTags = [
				{
					...mockPrompts[0],
					tags: ["code", "review"],
				},
			];

			dom.window.fetch = mockFetch({
				"/api/prompts": { data: promptWithTags },
				"/api/prompts/tags": { data: mockTagsResponse },
			});

			dom.window.loadPrompts();
			await waitForAsync(100);

			// Select prompt first
			const firstItem = dom.window.document.querySelector(".prompt-item");
			if (!firstItem) throw new Error("Prompt item not found");
			click(firstItem);
			await waitForAsync(50);

			// Call enterEditMode directly and await it
			await dom.window.enterEditMode();

			const codeChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="code"]',
			);
			const reviewChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="review"]',
			);
			const debugChip = dom.window.document.querySelector(
				'.tag-chip[data-tag="debug"]',
			);

			expect(codeChip?.classList.contains("selected")).toBe(true);
			expect(reviewChip?.classList.contains("selected")).toBe(true);
			expect(debugChip?.classList.contains("selected")).toBe(false);
		});

		describe("tag response validation edge cases", () => {
			test("handles null response gracefully", async () => {
				dom.window.fetch = mockFetch({
					"/api/prompts": { data: mockPrompts },
					"/api/prompts/tags": { data: null },
				});

				dom.window.loadPrompts();
				await waitForAsync(100);
				await dom.window.enterInsertMode();

				// Should render 0 chips when response is null
				const tagChips = dom.window.document.querySelectorAll(".tag-chip");
				expect(tagChips.length).toBe(0);
			});

			test("handles malformed response (wrong type)", async () => {
				dom.window.fetch = mockFetch({
					"/api/prompts": { data: mockPrompts },
					"/api/prompts/tags": { data: "not an object" },
				});

				dom.window.loadPrompts();
				await waitForAsync(100);
				await dom.window.enterInsertMode();

				const tagChips = dom.window.document.querySelectorAll(".tag-chip");
				expect(tagChips.length).toBe(0);
			});

			test("handles partial response (missing dimensions)", async () => {
				dom.window.fetch = mockFetch({
					"/api/prompts": { data: mockPrompts },
					"/api/prompts/tags": { data: { purpose: ["instruction"] } },
				});

				dom.window.loadPrompts();
				await waitForAsync(100);
				await dom.window.enterInsertMode();

				// Should render only the provided tags
				const tagChips = dom.window.document.querySelectorAll(".tag-chip");
				expect(tagChips.length).toBe(1);

				// Only non-empty sections are rendered
				const sections = dom.window.document.querySelectorAll(".tag-section");
				expect(sections.length).toBe(1);
			});

			test("filters non-string values from tag arrays", async () => {
				dom.window.fetch = mockFetch({
					"/api/prompts": { data: mockPrompts },
					"/api/prompts/tags": {
						data: {
							purpose: ["instruction", 123, null, "reference"],
							domain: [{ invalid: true }, "code"],
							task: ["review"],
						},
					},
				});

				dom.window.loadPrompts();
				await waitForAsync(100);
				await dom.window.enterInsertMode();

				// Should only render valid string tags
				const tagChips = dom.window.document.querySelectorAll(".tag-chip");
				expect(tagChips.length).toBe(4); // instruction, reference, code, review
			});

			test("handles empty arrays gracefully", async () => {
				dom.window.fetch = mockFetch({
					"/api/prompts": { data: mockPrompts },
					"/api/prompts/tags": {
						data: { purpose: [], domain: [], task: [] },
					},
				});

				dom.window.loadPrompts();
				await waitForAsync(100);
				await dom.window.enterInsertMode();

				const tagChips = dom.window.document.querySelectorAll(".tag-chip");
				expect(tagChips.length).toBe(0);

				// Empty sections are not rendered (better UX)
				const sections = dom.window.document.querySelectorAll(".tag-section");
				expect(sections.length).toBe(0);
			});
		});
	});

	describe("Edit mode teardown on prompt selection", () => {
		async function setupWithPrompts() {
			const fetchMock = mockFetch({
				"/api/prompts": { data: mockPrompts },
				"/api/prompts/tags": {
					data: { purpose: [], domain: [], task: [] },
				},
				"/api/drafts/": { data: {} },
			});
			dom.window.fetch = fetchMock;
			dom.window.loadPrompts();
			await waitForAsync(100);
			return fetchMock;
		}

		test("TC-1.1a: selecting prompt B while editing A (clean) shows B in view mode", async () => {
			await setupWithPrompts();

			// Enter edit mode for code-review
			await enterEditModeForPrompt(dom, "code-review");
			expect(assertSinglePanel(dom)).toBe("edit");

			// Select meeting-notes (no dirty state)
			await dom.window.selectPrompt("meeting-notes");
			await waitForAsync(100);

			// Should show view mode for meeting-notes
			expect(assertSinglePanel(dom)).toBe("view");
			const slugEl = dom.window.document.getElementById("prompt-slug");
			expect(slugEl?.textContent).toBe("meeting-notes");
		});

		test("TC-1.1b: edit form is fully removed after teardown", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");

			// Select another prompt (clean state)
			await dom.window.selectPrompt("meeting-notes");
			await waitForAsync(100);

			expect(promptEdit?.style.display).toBe("none");
		});

		test("TC-1.2a: confirmation dialog appears when navigating with dirty state", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make editor dirty by typing in name field
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified Name");
			await waitForAsync(50);

			// Start navigating — this will show the confirm dialog
			const selectPromise = dom.window.selectPrompt("meeting-notes");

			// Wait for dialog to appear
			await waitForAsync(50);
			const confirmModal = dom.window.document.getElementById("confirm-modal");
			expect(confirmModal?.style.display).not.toBe("none");

			// Resolve dialog to unblock
			resolveConfirmDialog(dom, true);
			await selectPromise;
			await waitForAsync(100);
		});

		test("TC-1.2b: confirming discard tears down edit and shows new prompt", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Navigate away
			const selectPromise = dom.window.selectPrompt("meeting-notes");
			await waitForAsync(50);

			// Confirm discard
			resolveConfirmDialog(dom, true);
			await selectPromise;
			await waitForAsync(100);

			expect(assertSinglePanel(dom)).toBe("view");
			const slugEl = dom.window.document.getElementById("prompt-slug");
			expect(slugEl?.textContent).toBe("meeting-notes");
		});

		test("TC-1.2c: canceling keeps user in edit mode", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Navigate away
			const selectPromise = dom.window.selectPrompt("meeting-notes");
			await waitForAsync(50);

			// Cancel
			resolveConfirmDialog(dom, false);
			await selectPromise;
			await waitForAsync(100);

			// Should still be in edit mode
			expect(assertSinglePanel(dom)).toBe("edit");
		});

		test("TC-1.4a: at most one panel visible after edit→select sequence", async () => {
			await setupWithPrompts();

			// Start in view
			await dom.window.selectPrompt("code-review");
			await waitForAsync(50);
			expect(assertSinglePanel(dom)).toBe("view");

			// Enter edit
			await dom.window.enterEditMode();
			await waitForAsync(100);
			expect(assertSinglePanel(dom)).toBe("edit");

			// Select another prompt
			await dom.window.selectPrompt("meeting-notes");
			await waitForAsync(100);
			expect(assertSinglePanel(dom)).toBe("view");
		});

		test("TC-1.5a: draft cleared on discard via navigation", async () => {
			const fetchMock = await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty so we trigger discard
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Navigate away
			const selectPromise = dom.window.selectPrompt("meeting-notes");
			await waitForAsync(50);

			// Confirm discard
			resolveConfirmDialog(dom, true);
			await selectPromise;
			await waitForAsync(100);

			// Verify DELETE /api/drafts/ was called
			const deleteCalls = fetchMock.mock.calls.filter((call: unknown[]) => {
				const url = String(call[0]);
				const opts = call[1] as { method?: string } | undefined;
				return url.includes("/api/drafts/") && opts?.method === "DELETE";
			});
			expect(deleteCalls.length).toBeGreaterThan(0);
		});

		test("TC-6.1a: rapid clicks during confirm dialog are ignored", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Rapid fire multiple selections
			const p1 = dom.window.selectPrompt("meeting-notes");
			const p2 = dom.window.selectPrompt("code-review");
			await waitForAsync(50);

			// Only one dialog should be visible
			const confirmModals =
				dom.window.document.querySelectorAll("#confirm-modal");
			expect(confirmModals.length).toBe(1);

			// Resolve to unblock
			resolveConfirmDialog(dom, true);
			await Promise.all([p1, p2]);
			await waitForAsync(100);
		});

		test("TC-1.3a: clicking New while editing (clean) tears down edit and enters insert mode", async () => {
			await setupWithPrompts();

			// Enter edit mode for code-review
			await enterEditModeForPrompt(dom, "code-review");
			expect(assertSinglePanel(dom)).toBe("edit");

			// Click New (no dirty state)
			await dom.window.enterInsertMode();
			await waitForAsync(100);

			// Should be in new/edit mode with editor visible
			expect(assertSinglePanel(dom)).toBe("edit");
		});

		test("TC-1.3b: clicking New while editing (dirty) shows confirm dialog", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified Name");
			await waitForAsync(50);

			// Start entering insert mode — should show confirm
			const insertPromise = dom.window.enterInsertMode();
			await waitForAsync(50);

			const confirmModal = dom.window.document.getElementById("confirm-modal");
			expect(confirmModal?.style.display).not.toBe("none");

			// Confirm discard to unblock
			resolveConfirmDialog(dom, true);
			await insertPromise;
			await waitForAsync(100);
		});

		test("TC-1.3c: canceling confirm from New keeps user in edit mode", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Start entering insert mode
			const insertPromise = dom.window.enterInsertMode();
			await waitForAsync(50);

			// Cancel
			resolveConfirmDialog(dom, false);
			await insertPromise;
			await waitForAsync(100);

			// Should still be in edit mode
			expect(assertSinglePanel(dom)).toBe("edit");
		});

		test("TC-1.3e: clicking New while already in new mode (dirty) shows confirm", async () => {
			await setupWithPrompts();

			// Enter insert mode
			await dom.window.enterInsertMode();
			await waitForAsync(100);

			// Make dirty by typing in the editor
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "My New Prompt");
			await waitForAsync(50);

			// Click New again
			const insertPromise = dom.window.enterInsertMode();
			await waitForAsync(50);

			// Confirm dialog should appear
			const confirmModal = dom.window.document.getElementById("confirm-modal");
			expect(confirmModal?.style.display).not.toBe("none");

			// Confirm discard
			resolveConfirmDialog(dom, true);
			await insertPromise;
			await waitForAsync(100);

			// Should be in new mode with a fresh editor
			expect(assertSinglePanel(dom)).toBe("edit");
		});

		test("TC-1.3f: clicking New while in new mode (clean) tears down silently", async () => {
			await setupWithPrompts();

			// Enter insert mode
			await dom.window.enterInsertMode();
			await waitForAsync(100);
			expect(assertSinglePanel(dom)).toBe("edit");

			// Click New again without making any changes
			await dom.window.enterInsertMode();
			await waitForAsync(100);

			// Should still be in edit panel (fresh new prompt), no dialog shown
			expect(assertSinglePanel(dom)).toBe("edit");
		});

		test("TC-1.3d: confirming discard from New enters insert mode", async () => {
			await setupWithPrompts();

			await enterEditModeForPrompt(dom, "code-review");

			// Make dirty
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement | null;
			if (nameInput) input(nameInput, "Modified");
			await waitForAsync(50);

			// Start entering insert mode
			const insertPromise = dom.window.enterInsertMode();
			await waitForAsync(50);

			// Confirm discard
			resolveConfirmDialog(dom, true);
			await insertPromise;
			await waitForAsync(100);

			// Should be in edit panel (new prompt editor)
			expect(assertSinglePanel(dom)).toBe("edit");
		});
	});
});
