/**
 * UI tests for theme picker dropdown.
 * Tests DOM behavior and user interactions.
 *
 * Skeleton-Red Phase: Tests assert real behavior and will ERROR
 * because JS handlers throw NotImplementedError.
 */

import { describe, test, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { VALID_THEMES, VALID_SURFACES } from "./setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadShell(): Promise<JSDOM> {
	const templatePath = resolve(
		__dirname,
		"../../../src/ui/templates/shell.html",
	);
	let html = await readFile(templatePath, "utf8");

	// Replace template variables (same as server-side rendering)
	html = html
		.replace("{{validThemes}}", JSON.stringify(VALID_THEMES))
		.replace("{{validSurfaces}}", JSON.stringify(VALID_SURFACES));

	const dom = new JSDOM(html, {
		runScripts: "outside-only",
		url: "http://localhost:5001/prompts",
		pretendToBeVisual: true,
	});

	const utilsPath = resolve(__dirname, "../../../public/js/utils.js");
	const utilsContent = await readFile(utilsPath, "utf8");
	dom.window.eval(utilsContent);

	// Inject tag-selector (used by shell for tag filtering)
	const tagSelectorPath = resolve(
		__dirname,
		"../../../public/js/components/tag-selector.js",
	);
	const tagSelectorContent = await readFile(tagSelectorPath, "utf8");
	dom.window.eval(tagSelectorContent);

	dom.window.fetch = vi.fn(() =>
		Promise.resolve({
			ok: true,
			json: () => Promise.resolve([]),
		}),
	) as unknown as typeof fetch;

	const scripts = dom.window.document.querySelectorAll("script:not([src])");
	for (const script of scripts) {
		if (script.textContent) {
			dom.window.eval(script.textContent);
		}
	}

	return dom;
}

describe("Theme Picker UI", () => {
	describe("Dropdown behavior", () => {
		test("TC-7: theme picker dropdown opens on click", async () => {
			const dom = await loadShell();

			const themeBtn = dom.window.document.getElementById("theme-picker-btn");
			const themeDropdown = dom.window.document.getElementById(
				"theme-picker-dropdown",
			);

			expect(themeBtn).not.toBeNull();
			expect(themeDropdown).not.toBeNull();
			expect(themeDropdown?.classList.contains("open")).toBe(false);

			themeBtn?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(themeDropdown?.classList.contains("open")).toBe(true);
			expect(themeBtn?.getAttribute("aria-expanded")).toBe("true");
		});

		test("TC-8: theme picker dropdown closes on outside click", async () => {
			const dom = await loadShell();

			const themeBtn = dom.window.document.getElementById("theme-picker-btn");
			const themeDropdown = dom.window.document.getElementById(
				"theme-picker-dropdown",
			);

			// Open dropdown
			themeBtn?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			expect(themeDropdown?.classList.contains("open")).toBe(true);

			// Click outside (on document body)
			dom.window.document.body.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			expect(themeDropdown?.classList.contains("open")).toBe(false);
			expect(themeBtn?.getAttribute("aria-expanded")).toBe("false");
		});

		test("TC-9: dropdown contains all 6 theme options", async () => {
			const dom = await loadShell();

			const themeItems =
				dom.window.document.querySelectorAll(".theme-picker-item");

			expect(themeItems.length).toBe(6);

			const themeIds = Array.from(themeItems).map(
				(item) => (item as HTMLElement).dataset.theme,
			);
			expect(themeIds).toContain("light-1");
			expect(themeIds).toContain("light-2");
			expect(themeIds).toContain("light-3");
			expect(themeIds).toContain("dark-1");
			expect(themeIds).toContain("dark-2");
			expect(themeIds).toContain("dark-3");
		});

		test("TC-10: selected theme shows checkmark", async () => {
			const dom = await loadShell();

			// Wait for async init to complete
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Default theme is dark-1
			const dark1Item = dom.window.document.querySelector(
				'.theme-picker-item[data-theme="dark-1"]',
			);

			expect(dark1Item?.classList.contains("selected")).toBe(true);
		});
	});

	describe("Theme switching", () => {
		test("TC-11: clicking theme item updates CSS link", async () => {
			// RED: CSS link stays dark-1.css (setTheme throws NotImplementedError)
			// GREEN: CSS link updates to light-1.css
			const dom = await loadShell();

			const themeBtn = dom.window.document.getElementById("theme-picker-btn");
			const light1Item = dom.window.document.querySelector(
				'.theme-picker-item[data-theme="light-1"]',
			);

			// Open dropdown
			themeBtn?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			// Click theme item (setTheme will throw but error is caught)
			light1Item?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			// Allow async handler to complete
			await new Promise((r) => setTimeout(r, 10));

			// Expected: CSS link updated to light-1
			const themeStylesheet =
				dom.window.document.getElementById("theme-stylesheet");
			expect(themeStylesheet?.getAttribute("href")).toBe(
				"/shared/themes/light-1.css",
			);
		});

		test("TC-12: clicking theme item closes dropdown", async () => {
			// RED: This should PASS even in red (closeThemeDropdown runs before setTheme)
			// GREEN: Same behavior, just setTheme also works
			const dom = await loadShell();

			const themeBtn = dom.window.document.getElementById("theme-picker-btn");
			const themeDropdown = dom.window.document.getElementById(
				"theme-picker-dropdown",
			);
			const dark2Item = dom.window.document.querySelector(
				'.theme-picker-item[data-theme="dark-2"]',
			);

			// Open dropdown
			themeBtn?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);
			expect(themeDropdown?.classList.contains("open")).toBe(true);

			// Click theme item
			dark2Item?.dispatchEvent(
				new dom.window.MouseEvent("click", { bubbles: true }),
			);

			// Dropdown should be closed (this happens before setTheme throws)
			expect(themeDropdown?.classList.contains("open")).toBe(false);
		});
	});

	describe("Theme broadcast", () => {
		test("TC-14: shell has surface identifier", async () => {
			const dom = await loadShell();

			const surface = dom.window.document.documentElement.dataset.surface;
			expect(surface).toBe("webapp");
		});
	});

	describe("Accessibility", () => {
		test("TC-13: dropdown has proper ARIA attributes", async () => {
			const dom = await loadShell();

			const themeBtn = dom.window.document.getElementById("theme-picker-btn");
			const themeDropdown = dom.window.document.getElementById(
				"theme-picker-dropdown",
			);

			expect(themeBtn?.getAttribute("aria-haspopup")).toBe("true");
			expect(themeBtn?.getAttribute("aria-expanded")).toBe("false");
			expect(themeDropdown?.getAttribute("role")).toBe("menu");

			const items = themeDropdown?.querySelectorAll(".theme-picker-item");
			items?.forEach((item) => {
				expect(item.getAttribute("role")).toBe("menuitem");
			});
		});
	});
});
