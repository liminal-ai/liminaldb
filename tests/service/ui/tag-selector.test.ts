import { describe, test, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { click, assertElement } from "./setup";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load tag-selector.js component into jsdom.
 */
async function injectTagSelector(dom: JSDOM): Promise<void> {
	// Inject utils first (escapeHtml)
	const utilsPath = resolve(__dirname, "../../../public/js/utils.js");
	const utilsContent = await readFile(utilsPath, "utf8");
	dom.window.eval(utilsContent);

	// Inject tag-selector
	const selectorPath = resolve(
		__dirname,
		"../../../public/js/components/tag-selector.js",
	);
	const selectorContent = await readFile(selectorPath, "utf8");
	dom.window.eval(selectorContent);
}

/**
 * Create a test DOM environment with tag-selector.
 */
async function createTagSelectorTestEnv(): Promise<JSDOM> {
	const dom = new JSDOM(
		`<!DOCTYPE html>
		<html>
		<body>
			<div id="container"></div>
		</body>
		</html>`,
		{
			runScripts: "outside-only",
			url: "http://localhost:5001",
			pretendToBeVisual: true,
		},
	);

	await injectTagSelector(dom);
	return dom;
}

const mockTags = {
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

describe("tagSelector.renderHtml", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await createTagSelectorTestEnv();
	});

	test("renders 3 sections (purpose, domain, task)", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		const sections = container.querySelectorAll(".tag-section");
		expect(sections.length).toBe(3);
	});

	test("each section has header label", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		const headers = container.querySelectorAll(".tag-section-header");
		expect(headers.length).toBe(3);

		const headerTexts = Array.from(headers).map((h) =>
			h.textContent?.toLowerCase(),
		);
		expect(headerTexts).toContain("purpose");
		expect(headerTexts).toContain("domain");
		expect(headerTexts).toContain("task");
	});

	test("renders chips for each tag", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		const chips = container.querySelectorAll(".tag-chip");
		expect(chips.length).toBe(19);
	});

	test("selected tags have .selected class", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, ["code", "review"]);
		container.innerHTML = html;

		const selectedChips = container.querySelectorAll(".tag-chip.selected");
		expect(selectedChips.length).toBe(2);

		const selectedNames = Array.from(selectedChips).map((c) =>
			c.getAttribute("data-tag"),
		);
		expect(selectedNames).toContain("code");
		expect(selectedNames).toContain("review");
	});

	test("chips have data-tag attribute", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		const chips = container.querySelectorAll(".tag-chip");
		for (const chip of chips) {
			expect(chip.hasAttribute("data-tag")).toBe(true);
		}
	});

	test("chips have aria-pressed attribute", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, ["code"]);
		container.innerHTML = html;

		const codeChip = container.querySelector('[data-tag="code"]');
		expect(codeChip?.getAttribute("aria-pressed")).toBe("true");

		const reviewChip = container.querySelector('[data-tag="review"]');
		expect(reviewChip?.getAttribute("aria-pressed")).toBe("false");
	});
});

describe("tagSelector.attachHandlers", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await createTagSelectorTestEnv();
	});

	test("clicking chip calls onToggle with tag name", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		const onToggle = vi.fn();
		dom.window.tagSelector.attachHandlers(container, onToggle);

		const codeChip = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		click(codeChip);

		expect(onToggle).toHaveBeenCalledWith("code", true);
	});

	test("clicking selected chip calls onToggle with isSelected=false", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, ["code"]);
		container.innerHTML = html;

		const onToggle = vi.fn();
		dom.window.tagSelector.attachHandlers(container, onToggle);

		const codeChip = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		click(codeChip);

		expect(onToggle).toHaveBeenCalledWith("code", false);
	});

	test("clicking toggles .selected class", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		dom.window.tagSelector.attachHandlers(container, vi.fn());

		const codeChip = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		expect(codeChip.classList.contains("selected")).toBe(false);

		click(codeChip);
		expect(codeChip.classList.contains("selected")).toBe(true);

		click(codeChip);
		expect(codeChip.classList.contains("selected")).toBe(false);
	});

	test("clicking updates aria-pressed attribute", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, []);
		container.innerHTML = html;

		dom.window.tagSelector.attachHandlers(container, vi.fn());

		const codeChip = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		expect(codeChip.getAttribute("aria-pressed")).toBe("false");

		click(codeChip);
		expect(codeChip.getAttribute("aria-pressed")).toBe("true");

		click(codeChip);
		expect(codeChip.getAttribute("aria-pressed")).toBe("false");
	});
});

describe("tagSelector list style", () => {
	let dom: JSDOM;

	beforeEach(async () => {
		dom = await createTagSelectorTestEnv();
	});

	test("renders list items instead of chips when style is list", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, [], { style: "list" });
		container.innerHTML = html;

		const items = container.querySelectorAll(".tag-picker-item");
		expect(items.length).toBe(19);

		const chips = container.querySelectorAll(".tag-chip");
		expect(chips.length).toBe(0);
	});

	test("renders section headers for list style", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, [], { style: "list" });
		container.innerHTML = html;

		const headers = container.querySelectorAll(".tag-picker-section-header");
		expect(headers.length).toBe(3);

		const headerTexts = Array.from(headers).map((h) =>
			h.textContent?.toLowerCase(),
		);
		expect(headerTexts).toContain("purpose");
		expect(headerTexts).toContain("domain");
		expect(headerTexts).toContain("task");
	});

	test("selected items have .selected class in list style", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, ["code", "review"], {
			style: "list",
		});
		container.innerHTML = html;

		const selectedItems = container.querySelectorAll(
			".tag-picker-item.selected",
		);
		expect(selectedItems.length).toBe(2);
	});

	test("clicking list item calls onToggle", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, [], { style: "list" });
		container.innerHTML = html;

		const onToggle = vi.fn();
		dom.window.tagSelector.attachHandlers(container, onToggle, {
			style: "list",
		});

		const codeItem = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		click(codeItem);

		expect(onToggle).toHaveBeenCalledWith("code", true);
	});

	test("list style does not update aria-pressed (no aria-pressed on list items)", () => {
		const container = assertElement(
			dom.window.document.getElementById("container"),
		);
		const html = dom.window.tagSelector.renderHtml(mockTags, [], { style: "list" });
		container.innerHTML = html;

		dom.window.tagSelector.attachHandlers(container, vi.fn(), {
			style: "list",
		});

		const codeItem = assertElement(
			container.querySelector('[data-tag="code"]'),
		);
		expect(codeItem.hasAttribute("aria-pressed")).toBe(false);

		click(codeItem);
		expect(codeItem.hasAttribute("aria-pressed")).toBe(false);
	});
});
