/**
 * UI test setup utilities.
 * Provides DOM mocking, event simulation, and async helpers for testing HTML templates.
 */

import { JSDOM } from "jsdom";
import { vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Type for the mock fetch function that includes vitest mock methods.
 */
export type MockFetch = ReturnType<typeof vi.fn> & typeof fetch;

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Template variables for UI tests.
 * Must match src/schemas/preferences.ts - update both when themes change.
 */
export const VALID_THEMES = [
	"light-1",
	"light-2",
	"light-3",
	"dark-1",
	"dark-2",
	"dark-3",
] as const;

export const VALID_SURFACES = ["webapp", "chatgpt", "vscode"] as const;

/**
 * Load shared utilities (escapeHtml, etc.) into jsdom window.
 * Called before template scripts run since external scripts aren't fetched.
 */
async function injectSharedUtils(dom: JSDOM): Promise<void> {
	const utilsPath = resolve(__dirname, "../../../public/js/utils.js");
	const utilsContent = await readFile(utilsPath, "utf8");
	dom.window.eval(utilsContent);
}

/**
 * Load a template file into jsdom for testing.
 * Performs the same template variable replacement as server-side rendering.
 * @param templateName - The template file name (e.g., "prompts.html")
 * @returns A JSDOM instance with the template loaded
 */
export async function loadTemplate(templateName: string): Promise<JSDOM> {
	const templatePath = resolve(
		__dirname,
		`../../../src/ui/templates/${templateName}`,
	);
	let html = await readFile(templatePath, "utf8");

	// Replace template variables (same as server-side rendering in app.ts/modules.ts)
	html = html
		.replace("{{validThemes}}", JSON.stringify(VALID_THEMES))
		.replace("{{validSurfaces}}", JSON.stringify(VALID_SURFACES));

	// Create DOM without running scripts first
	const dom = new JSDOM(html, {
		runScripts: "outside-only",
		url: "http://localhost:5001",
		pretendToBeVisual: true,
	});

	// Mock console.warn to suppress markdown-it warning
	dom.window.console.warn = () => {};

	// Inject shared utilities before scripts run
	await injectSharedUtils(dom);

	// Inject component and module scripts for templates that need them
	if (templateName === "prompts.html") {
		await injectModal(dom);
		await injectToast(dom);
		await injectPromptViewer(dom);
		await injectPromptEditor(dom);
	}

	// Now execute the inline scripts
	const scripts = dom.window.document.querySelectorAll("script:not([src])");
	for (const script of scripts) {
		if (script.textContent) {
			dom.window.eval(script.textContent);
		}
	}

	return dom;
}

/**
 * Mock prompts for testing.
 * Includes v2 fields (pinned, favorited, usageCount, lastUsedAt) for Story 4+ tests.
 */
export const mockPrompts = [
	{
		slug: "code-review",
		name: "Code Review",
		description: "Reviews code for issues",
		content: "You are a code reviewer. Analyze the following code...",
		tags: ["code", "review"],
		parameters: [],
		pinned: false,
		favorited: false,
		usageCount: 0,
		lastUsedAt: undefined,
	},
	{
		slug: "meeting-notes",
		name: "Meeting Notes",
		description: "Summarizes meetings",
		content: "Summarize the following meeting transcript...",
		tags: ["meetings"],
		parameters: [],
		pinned: false,
		favorited: false,
		usageCount: 0,
		lastUsedAt: undefined,
	},
];

/**
 * Mock user for testing.
 */
export const mockUser = {
	id: "user_test123",
	email: "test@example.com",
};

/**
 * Create a mock fetch function.
 * Returns a vi.fn that can be assigned to window.fetch and also has mockClear().
 * @param responses - A map of URL substrings to response configurations
 * @returns A mock fetch function that returns configured responses
 */
export function mockFetch(
	responses: Record<string, { ok?: boolean; status?: number; data: unknown }>,
): MockFetch {
	const fn = vi.fn((url: string | URL | Request, _options?: RequestInit) => {
		const urlString = typeof url === "string" ? url : url.toString();
		// Find matching response
		const matchingUrl = Object.keys(responses).find((key) =>
			urlString.includes(key),
		);

		if (!matchingUrl) {
			return Promise.resolve({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ error: "Not found" }),
			} as Response);
		}

		const response = responses[matchingUrl];
		if (!response) {
			return Promise.resolve({
				ok: false,
				status: 404,
				json: () => Promise.resolve({ error: "Not found" }),
			} as Response);
		}
		return Promise.resolve({
			ok: response.ok ?? true,
			status: response.status ?? 200,
			json: () => Promise.resolve(response.data),
		} as Response);
	});
	return fn as unknown as MockFetch;
}

/**
 * Create a mock clipboard.
 * @returns A mock clipboard object with writeText, readText, and getWritten methods
 */
export function mockClipboard() {
	const written: string[] = [];
	return {
		writeText: vi.fn((text: string) => {
			written.push(text);
			return Promise.resolve();
		}),
		readText: vi.fn(() => Promise.resolve(written[written.length - 1] || "")),
		getWritten: () => written,
	};
}

/**
 * Inject clipboard mock into jsdom window.
 * @param dom - The JSDOM instance to inject the clipboard into
 * @returns The mock clipboard object
 */
export function setupClipboard(dom: JSDOM) {
	const clipboard = mockClipboard();
	Object.defineProperty(dom.window.navigator, "clipboard", {
		value: clipboard,
		writable: true,
	});
	return clipboard;
}

/**
 * Wait for async operations (fetch, DOM updates).
 * @param ms - Milliseconds to wait (default: 50)
 * @returns A promise that resolves after the specified time
 */
export function waitForAsync(ms = 50): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for element to appear in DOM.
 * @param dom - The JSDOM instance to search in
 * @param selector - CSS selector for the element
 * @param timeout - Maximum time to wait in ms (default: 1000)
 * @returns The found element
 * @throws Error if element is not found within timeout
 */
export async function waitForElement(
	dom: JSDOM,
	selector: string,
	timeout = 1000,
): Promise<Element> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const el = dom.window.document.querySelector(selector);
		if (el) return el;
		await waitForAsync(10);
	}
	throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Simulate a click event.
 * @param element - The element to click
 */
export function click(element: Element): void {
	const view = element.ownerDocument.defaultView;
	if (!view) throw new Error("No defaultView on document");
	// Dispatch mousedown first (some handlers use mousedown instead of click)
	const mousedownEvent = new view.MouseEvent("mousedown", {
		bubbles: true,
		cancelable: true,
	});
	element.dispatchEvent(mousedownEvent);
	// Then dispatch click
	const clickEvent = new view.MouseEvent("click", {
		bubbles: true,
		cancelable: true,
	});
	element.dispatchEvent(clickEvent);
}

/**
 * Simulate input event.
 * @param element - The input or textarea element
 * @param value - The value to set
 */
export function input(
	element: HTMLInputElement | HTMLTextAreaElement,
	value: string,
): void {
	element.value = value;
	const view = element.ownerDocument.defaultView;
	if (!view) throw new Error("No defaultView on document");
	const event = new view.Event("input", {
		bubbles: true,
	});
	element.dispatchEvent(event);
}

/**
 * Simulate blur event.
 * @param element - The element to blur
 */
export function blur(element: Element): void {
	const view = element.ownerDocument.defaultView;
	if (!view) throw new Error("No defaultView on document");
	const event = new view.FocusEvent("blur", {
		bubbles: true,
	});
	element.dispatchEvent(event);
}

/**
 * Send postMessage to window.
 * @param dom - The JSDOM instance
 * @param data - The message data to send
 */
export function postMessage(dom: JSDOM, data: unknown): void {
	const event = new dom.window.MessageEvent("message", {
		data,
		origin: "http://localhost:5001",
	});
	dom.window.dispatchEvent(event);
}

/**
 * Load modal.js component into jsdom for testing.
 * @param dom - The JSDOM instance
 */
export async function injectModal(dom: JSDOM): Promise<void> {
	const modalPath = resolve(
		__dirname,
		"../../../public/js/components/modal.js",
	);
	const modalContent = await readFile(modalPath, "utf8");
	dom.window.eval(modalContent);
}

/**
 * Load toast.js component into jsdom for testing.
 * @param dom - The JSDOM instance
 */
export async function injectToast(dom: JSDOM): Promise<void> {
	const toastPath = resolve(
		__dirname,
		"../../../public/js/components/toast.js",
	);
	const toastContent = await readFile(toastPath, "utf8");
	dom.window.eval(toastContent);
}

/**
 * Load prompt-viewer.js into jsdom for testing.
 * @param dom - The JSDOM instance
 */
export async function injectPromptViewer(dom: JSDOM): Promise<void> {
	const viewerPath = resolve(__dirname, "../../../public/js/prompt-viewer.js");
	const viewerContent = await readFile(viewerPath, "utf8");
	dom.window.eval(viewerContent);
}

/**
 * Load prompt-editor.js into jsdom for testing.
 * @param dom - The JSDOM instance
 */
export async function injectPromptEditor(dom: JSDOM): Promise<void> {
	const editorPath = resolve(__dirname, "../../../public/js/prompt-editor.js");
	const editorContent = await readFile(editorPath, "utf8");
	dom.window.eval(editorContent);
}

/**
 * Assert an element exists and return it with proper typing.
 * Use this instead of optional chaining in test assertions.
 * @param element - The element that might be null
 * @param message - Optional error message
 * @returns The element (throws if null)
 */
export function assertElement<T extends Element>(
	element: T | null | undefined,
	message = "Expected element to exist",
): T {
	if (!element) {
		throw new Error(message);
	}
	return element;
}

/**
 * Create a minimal DOM for testing prompt-viewer in isolation.
 * @returns A JSDOM instance with utils and prompt-viewer loaded
 */
export async function createPromptViewerTestEnv(): Promise<JSDOM> {
	const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
		runScripts: "outside-only",
		url: "http://localhost:5001",
		pretendToBeVisual: true,
	});

	// Mock console.warn to suppress markdown-it warning
	dom.window.console.warn = () => {};

	// Inject utils (escapeHtml)
	await injectSharedUtils(dom);

	// Inject prompt-viewer
	await injectPromptViewer(dom);

	return dom;
}
