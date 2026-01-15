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

describe("Shell history (popstate)", () => {
	test("popstate sends previous state to portlet", async () => {
		const dom = await loadShell();
		const iframe = dom.window.document.getElementById(
			"main-module",
		) as HTMLIFrameElement;

		let restoredState: unknown = null;
		const portlet = {
			postMessage: vi.fn((message: { state?: unknown }) => {
				restoredState = message.state ?? null;
			}),
		};
		Object.defineProperty(iframe, "contentWindow", {
			value: portlet,
			writable: true,
		});

		dom.window.dispatchEvent(
			new dom.window.MessageEvent("message", {
				data: {
					type: "history:push",
					state: { portlet: "prompts", slug: "code-review", mode: "view" },
				},
				origin: "http://localhost:5001",
			}),
		);

		expect(dom.window.history.state).toMatchObject({
			slug: "code-review",
			mode: "view",
		});

		const previousState = {
			portlet: "prompts",
			slug: null,
			mode: "empty",
		};
		dom.window.dispatchEvent(
			new dom.window.PopStateEvent("popstate", { state: previousState }),
		);

		expect(portlet.postMessage).toHaveBeenCalledWith(
			{ type: "shell:state", state: previousState },
			"http://localhost:5001",
		);
		expect(restoredState).toEqual(previousState);
	});

	describe("Search Performance", () => {
		test("TC-6: rapid typing remains responsive", async () => {
			const dom = await loadShell();
			const iframe = dom.window.document.getElementById(
				"main-module",
			) as HTMLIFrameElement;
			const portlet = { postMessage: vi.fn() };
			Object.defineProperty(iframe, "contentWindow", {
				value: portlet,
				writable: true,
			});

			const searchInput = dom.window.document.getElementById(
				"search-input",
			) as HTMLInputElement;
			vi.useFakeTimers();

			for (const char of "kubernetes") {
				searchInput.value += char;
				searchInput.dispatchEvent(new dom.window.Event("input"));
				vi.advanceTimersByTime(30);
			}

			vi.advanceTimersByTime(200);

			// Assert: debounce collapses rapid typing into a single filter broadcast
			expect(portlet.postMessage).toHaveBeenCalledTimes(1);
			vi.useRealTimers();
		});
	});

	describe("Draft Indicator", () => {
		test("TC-33: draft in other tab shows indicator", async () => {
			// Important: enable fake timers before loading the shell so the polling interval
			// is scheduled on the fake clock.
			vi.useFakeTimers();
			const dom = await loadShell();
			dom.window.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () =>
						Promise.resolve({
							count: 1,
							latestDraftId: "edit:code-review",
							hasExpiringSoon: false,
						}),
				}),
			) as unknown as typeof fetch;

			// Run the interval and await async fetch/JSON resolution.
			await vi.advanceTimersByTimeAsync(15000);

			const indicator = dom.window.document.getElementById("draft-indicator");
			expect(indicator?.classList.contains("hidden")).toBe(false);
			vi.useRealTimers();
		});

		test("TC-34: draft exists shows unsaved indicator", async () => {
			const dom = await loadShell();

			dom.window.dispatchEvent(
				new dom.window.MessageEvent("message", {
					data: {
						type: "portlet:drafts",
						count: 2,
						latestDraftId: "edit:code-review",
						hasExpiringSoon: false,
					},
					origin: "http://localhost:5001",
				}),
			);

			const indicator = dom.window.document.getElementById("draft-indicator");
			expect(indicator?.classList.contains("hidden")).toBe(false);
		});
	});
});
