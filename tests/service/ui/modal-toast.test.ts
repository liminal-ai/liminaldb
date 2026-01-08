import { describe, test, expect, beforeEach } from "vitest";
import { loadTemplate, waitForAsync, click } from "./setup";
import type { JSDOM } from "jsdom";

/**
 * TC-6.5: Modal and Toast
 *
 * Tests for the confirmation modal and toast notification patterns
 * implemented in prompts.html.
 */
describe("TC-6.5: Modal and Toast", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await loadTemplate("prompts.html");
	});

	describe("Confirmation Modal", () => {
		test("showConfirm displays modal with message", async () => {
			// Call showConfirm
			const promise = dom.window.showConfirm("Test confirmation message");

			// Modal should be visible
			const modal = dom.window.document.getElementById("confirm-modal");
			expect(modal?.style.display).toBe("flex");

			// Modal should show message
			const message = dom.window.document.getElementById("confirm-message");
			expect(message?.textContent).toBe("Test confirmation message");

			// Click OK to resolve
			const okBtn = dom.window.document.getElementById("confirm-ok");
			if (okBtn) click(okBtn);
			await promise;
		});

		test("showConfirm Cancel button resolves with false", async () => {
			const promise = dom.window.showConfirm("Cancel test");

			// Click Cancel
			const cancelBtn = dom.window.document.getElementById("confirm-cancel");
			if (!cancelBtn) throw new Error("Cancel button not found");
			click(cancelBtn);

			const result = await promise;
			expect(result).toBe(false);

			// Modal should be hidden
			const modal = dom.window.document.getElementById("confirm-modal");
			expect(modal?.style.display).toBe("none");
		});

		test("showConfirm OK button resolves with true", async () => {
			const promise = dom.window.showConfirm("OK test");

			// Click OK
			const okBtn = dom.window.document.getElementById("confirm-ok");
			if (!okBtn) throw new Error("OK button not found");
			click(okBtn);

			const result = await promise;
			expect(result).toBe(true);

			// Modal should be hidden
			const modal = dom.window.document.getElementById("confirm-modal");
			expect(modal?.style.display).toBe("none");
		});
	});

	describe("Toast Notifications", () => {
		test("showToast displays message", async () => {
			dom.window.showToast("Test toast message");
			await waitForAsync(50);

			// Toast container should have a toast
			const container = dom.window.document.getElementById("toast-container");
			const toasts = container?.querySelectorAll(".toast");
			expect(toasts?.length).toBeGreaterThan(0);

			// Toast should contain message
			const toastText = toasts?.[0]?.textContent;
			expect(toastText).toContain("Test toast message");
		});

		test("showToast applies correct type class", async () => {
			dom.window.showToast("Error message", { type: "error" });
			await waitForAsync(50);

			const container = dom.window.document.getElementById("toast-container");
			const toast = container?.querySelector(".toast");
			expect(toast?.classList.contains("toast-error")).toBe(true);
		});

		test("showToast success type", async () => {
			dom.window.showToast("Success message", { type: "success" });
			await waitForAsync(50);

			const container = dom.window.document.getElementById("toast-container");
			const toast = container?.querySelector(".toast");
			expect(toast?.classList.contains("toast-success")).toBe(true);
		});

		test("showToast info type", async () => {
			dom.window.showToast("Info message", { type: "info" });
			await waitForAsync(50);

			const container = dom.window.document.getElementById("toast-container");
			const toast = container?.querySelector(".toast");
			expect(toast?.classList.contains("toast-info")).toBe(true);
		});
	});
});
