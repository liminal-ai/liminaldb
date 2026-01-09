import { describe, test, expect, beforeEach } from "vitest";
import {
	loadTemplate,
	mockPrompts,
	mockFetch,
	setupClipboard,
	waitForAsync,
	click,
	input,
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) {
				throw new Error("New prompt button not found");
			}
			click(newBtn);

			// Editor should be visible
			const promptEdit = dom.window.document.getElementById("prompt-edit");
			expect(promptEdit?.style.display).toBe("block");

			// Empty state should be hidden
			const emptyState = dom.window.document.getElementById("empty-state");
			expect(emptyState?.style.display).toBe("none");

			// Staging header should be hidden (only shows for 2+ prompts)
			const stagingHeader =
				dom.window.document.getElementById("staging-header");
			expect(stagingHeader?.style.display).toBe("none");

			// Staging count should show 1
			const stagingCount = dom.window.document.getElementById("staging-count");
			expect(stagingCount?.textContent).toBe("1");
		});
	});

	describe("TC-6.1: Insert Mode - Single Prompt", () => {
		test("form shows empty/default values for new prompt", async () => {
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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

	describe("TC-6.2: Insert Mode - Batch Staging", () => {
		test("multiple +New clicks create multiple staging entries", async () => {
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");

			// Click +New twice
			click(newBtn);
			await waitForAsync(50);
			click(newBtn);
			await waitForAsync(50);

			// Check staging count
			const stagingCount = dom.window.document.getElementById("staging-count");
			expect(stagingCount?.textContent).toBe("2");

			// Check staging list has 2 items (class is prompt-item.staging)
			const stagingItems = dom.window.document.querySelectorAll(
				".prompt-item.staging",
			);
			expect(stagingItems.length).toBe(2);
		});

		test("staging header appears when 2+ prompts staged", async () => {
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");

			// First click - header should be hidden
			click(newBtn);
			await waitForAsync(50);

			let stagingHeader = dom.window.document.getElementById("staging-header");
			expect(stagingHeader?.style.display).toBe("none");

			// Second click - header should be visible
			click(newBtn);
			await waitForAsync(50);

			stagingHeader = dom.window.document.getElementById("staging-header");
			expect(stagingHeader?.style.display).toBe("flex");
		});

		test("switching between staged prompts retains form data", async () => {
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");

			// Create first prompt
			click(newBtn);
			await waitForAsync(50);

			// Fill first prompt via inputs
			const slugInput = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement;
			const nameInput = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			input(slugInput, "first-prompt");
			input(nameInput, "First Prompt");

			// Create second prompt (should capture first)
			click(newBtn);
			await waitForAsync(50);

			// Click back to first prompt (it's now the first in the list)
			const stagingItems = dom.window.document.querySelectorAll(
				".prompt-item.staging",
			);
			if (stagingItems.length < 2) {
				throw new Error(
					`Expected 2 staging items, found ${stagingItems.length}`,
				);
			}
			const firstItem = stagingItems[0] as Element;
			click(firstItem);
			await waitForAsync(50);

			// Check first prompt data is retained
			const slugInput2 = dom.window.document.getElementById(
				"editor-slug",
			) as HTMLInputElement;
			const nameInput2 = dom.window.document.getElementById(
				"editor-name",
			) as HTMLInputElement;
			expect(slugInput2?.value).toBe("first-prompt");
			expect(nameInput2?.value).toBe("First Prompt");
		});

		test("remove button removes individual staging item", async () => {
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");

			// Create two prompts
			click(newBtn);
			await waitForAsync(50);
			click(newBtn);
			await waitForAsync(50);

			// Click remove on first item
			const removeBtn = dom.window.document.querySelector(
				".prompt-item.staging .remove-staging",
			);
			if (!removeBtn) throw new Error("Remove button not found");
			click(removeBtn);
			await waitForAsync(50);

			// Should have 1 staging item left
			const stagingItems = dom.window.document.querySelectorAll(
				".prompt-item.staging",
			);
			expect(stagingItems.length).toBe(1);
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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
			const newBtn = dom.window.document.getElementById("new-prompt-btn");
			if (!newBtn) throw new Error("New prompt button not found");
			click(newBtn);
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

		test("TC-22: clicking star icon favorites prompt", async () => {
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

			const starToggle = dom.window.document.getElementById("favorite-toggle");
			if (!starToggle) throw new Error("Favorite toggle not found");
			starToggle.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review/flags"),
				expect.objectContaining({ method: "PATCH" }),
			);
			expect(starToggle.getAttribute("aria-pressed")).toBe("true");
		});

		test("TC-23: clicking star on favorited prompt unfavorites", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": {
					data: [{ ...mockPrompts[0], favorited: true }, mockPrompts[1]],
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

			const starToggle = dom.window.document.getElementById("favorite-toggle");
			if (!starToggle) throw new Error("Favorite toggle not found");
			starToggle.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts/code-review/flags"),
				expect.objectContaining({ method: "PATCH" }),
			);
			expect(starToggle.getAttribute("aria-pressed")).toBe("false");
		});

		test("TC-24: pin/favorite changes reflect immediately", async () => {
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

		test("TC-26: favorited prompt shows star icon in list", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": {
					data: [{ ...mockPrompts[0], favorited: true }, mockPrompts[1]],
				},
			});
			dom.window.fetch = fetchMock;

			dom.window.loadPrompts();
			await waitForAsync(100);

			const favItem = dom.window.document.querySelector(".prompt-item");
			if (!favItem) throw new Error("Prompt item not found");
			expect(favItem.querySelector(".prompt-star")).not.toBeNull();
		});
	});
});
