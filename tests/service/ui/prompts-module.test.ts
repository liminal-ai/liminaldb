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
});
