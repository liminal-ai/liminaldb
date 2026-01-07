import { describe, test, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function loadShell(): Promise<JSDOM> {
	const templatePath = resolve(
		__dirname,
		"../../../src/ui/templates/shell.html",
	);
	const html = await readFile(templatePath, "utf8");

	const dom = new JSDOM(html, {
		runScripts: "outside-only",
		url: "http://localhost:5001/prompts",
		pretendToBeVisual: true,
	});

	const utilsPath = resolve(__dirname, "../../../public/js/utils.js");
	const utilsContent = await readFile(utilsPath, "utf8");
	dom.window.eval(utilsContent);

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
});
