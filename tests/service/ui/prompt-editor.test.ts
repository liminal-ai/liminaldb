import { describe, test, expect, beforeEach, vi } from "vitest";
import {
	loadTemplate,
	mockFetch,
	waitForAsync,
	click,
	input,
	blur,
} from "./setup";
import type { JSDOM } from "jsdom";

describe("Prompt Editor", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await loadTemplate("prompt-editor.html");
	});

	describe("TC-3.3: Submit valid form creates prompt", () => {
		test("submitting valid form calls POST /api/prompts", async () => {
			const fetchMock = mockFetch({
				"/api/prompts": { status: 201, data: { ids: ["new_id"] } },
			});
			dom.window.fetch = fetchMock;

			// Fill form
			input(
				dom.window.document.getElementById("slug") as HTMLInputElement,
				"new-prompt",
			);
			input(
				dom.window.document.getElementById("name") as HTMLInputElement,
				"New Prompt",
			);
			input(
				dom.window.document.getElementById(
					"description",
				) as HTMLTextAreaElement,
				"A new prompt",
			);
			input(
				dom.window.document.getElementById("content") as HTMLTextAreaElement,
				"Prompt content here",
			);
			input(
				dom.window.document.getElementById("tags") as HTMLInputElement,
				"test, example",
			);

			// Submit
			const form = dom.window.document.getElementById("prompt-form");
			form?.dispatchEvent(
				new dom.window.Event("submit", { bubbles: true, cancelable: true }),
			);

			await waitForAsync(100);

			expect(fetchMock).toHaveBeenCalledWith(
				expect.stringContaining("/api/prompts"),
				expect.objectContaining({
					method: "POST",
					body: expect.stringContaining("new-prompt"),
				}),
			);
		});

		test("successful submit navigates back to prompts", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": { status: 201, data: { ids: ["new_id"] } },
			});
			const postMessageSpy = vi.fn();
			dom.window.parent.postMessage = postMessageSpy;

			// Fill required fields
			input(
				dom.window.document.getElementById("slug") as HTMLInputElement,
				"valid-slug",
			);
			input(
				dom.window.document.getElementById("name") as HTMLInputElement,
				"Valid Name",
			);
			input(
				dom.window.document.getElementById("content") as HTMLTextAreaElement,
				"Content",
			);

			// Submit
			const form = dom.window.document.getElementById("prompt-form");
			form?.dispatchEvent(
				new dom.window.Event("submit", { bubbles: true, cancelable: true }),
			);

			await waitForAsync(100);

			expect(postMessageSpy).toHaveBeenCalledWith(
				{ type: "module:navigate", path: "/prompts" },
				"*",
			);
		});
	});

	describe("TC-3.4: Invalid slug shows validation error", () => {
		test("invalid slug format shows error message", async () => {
			const slugInput = dom.window.document.getElementById(
				"slug",
			) as HTMLInputElement;
			input(slugInput, "INVALID SLUG!");
			blur(slugInput);

			await waitForAsync(50);

			const errorEl = dom.window.document.getElementById("slug-error");
			expect(errorEl?.textContent).toContain("lowercase");
		});

		test("empty slug shows required error", async () => {
			const slugInput = dom.window.document.getElementById(
				"slug",
			) as HTMLInputElement;
			input(slugInput, "");
			blur(slugInput);

			await waitForAsync(50);

			const errorEl = dom.window.document.getElementById("slug-error");
			expect(errorEl?.textContent).not.toBe("");
		});

		test("valid slug clears error", async () => {
			const slugInput = dom.window.document.getElementById(
				"slug",
			) as HTMLInputElement;

			// First trigger error
			input(slugInput, "INVALID");
			blur(slugInput);
			await waitForAsync(50);

			// Then fix it
			input(slugInput, "valid-slug");
			blur(slugInput);
			await waitForAsync(50);

			const errorEl = dom.window.document.getElementById("slug-error");
			expect(errorEl?.textContent).toBe("");
		});
	});

	describe("Duplicate slug error (TC-3.5 - UI portion)", () => {
		test("409 response shows duplicate error", async () => {
			dom.window.fetch = mockFetch({
				"/api/prompts": {
					ok: false,
					status: 409,
					data: { error: "Slug already exists" },
				},
			});

			// Fill required fields
			input(
				dom.window.document.getElementById("slug") as HTMLInputElement,
				"existing-slug",
			);
			input(
				dom.window.document.getElementById("name") as HTMLInputElement,
				"Name",
			);
			input(
				dom.window.document.getElementById("content") as HTMLTextAreaElement,
				"Content",
			);

			// Submit
			const form = dom.window.document.getElementById("prompt-form");
			form?.dispatchEvent(
				new dom.window.Event("submit", { bubbles: true, cancelable: true }),
			);

			await waitForAsync(100);

			const formError = dom.window.document.getElementById("form-error");
			expect(formError?.textContent).toContain("exists");
		});
	});

	describe("Cancel button", () => {
		test("cancel navigates back to prompts", async () => {
			const postMessageSpy = vi.fn();
			dom.window.parent.postMessage = postMessageSpy;

			const cancelBtn = dom.window.document.getElementById("cancel-btn");
			if (!cancelBtn) {
				throw new Error("Cancel button not found");
			}
			click(cancelBtn);

			expect(postMessageSpy).toHaveBeenCalledWith(
				{ type: "module:navigate", path: "/prompts" },
				"*",
			);
		});
	});
});
