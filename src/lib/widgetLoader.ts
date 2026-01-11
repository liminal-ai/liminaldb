import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config";

/**
 * Cache for loaded widget HTML to avoid repeated file reads
 */
const widgetCache = new Map<string, string>();

/**
 * Get base directories for resolving paths.
 * Computed lazily to avoid issues in test environments.
 */
function getBaseDirs() {
	const baseDir = import.meta.dir ?? process.cwd();
	return {
		widgetDir: join(baseDir, "../ui/templates/widgets"),
		publicDir: join(baseDir, "../../public"),
	};
}

/**
 * Inline local scripts into HTML.
 * Replaces <script src="/path/to/file.js"></script> with inline <script> tags.
 * Skips external scripts (http://, https://, //).
 *
 * @param html - The HTML string to process
 * @returns HTML with local scripts inlined
 */
async function inlineLocalScripts(html: string): Promise<string> {
	// Match local script tags (paths starting with /)
	const scriptRegex = /<script\s+src="(\/[^"]+\.js)"[^>]*><\/script>/g;
	const matches = [...html.matchAll(scriptRegex)];

	for (const match of matches) {
		const [fullMatch, srcPath] = match;

		// Skip if no path captured or looks like an external URL
		if (!srcPath || srcPath.startsWith("//")) continue;

		const filePath = join(getBaseDirs().publicDir, srcPath);

		try {
			let content = await readFile(filePath, "utf-8");

			// Escape </script> in content to prevent breaking HTML parser
			content = content.replace(/<\/script>/gi, "<\\/script>");

			html = html.replace(fullMatch, `<script>\n${content}\n</script>`);
		} catch {
			// Fail hard - leaving original <script src="..."> tag will break in ChatGPT sandbox
			throw new Error(
				`Failed to inline script "${srcPath}": file not found at ${filePath}. ` +
					`Widget cannot load with missing scripts.`,
			);
		}
	}

	return html;
}

/**
 * Inline local CSS into HTML.
 * Replaces <link rel="stylesheet" href="/path/to/file.css"> with inline <style> tags.
 * Skips external stylesheets and theme files (which are loaded dynamically).
 *
 * @param html - The HTML string to process
 * @returns HTML with local CSS inlined
 */
async function inlineLocalCss(html: string): Promise<string> {
	// Match local stylesheet links (paths starting with /)
	// Skip theme files - they're loaded dynamically based on user preference
	const cssRegex = /<link[^>]+href="(\/[^"]+\.css)"[^>]*>/g;
	const matches = [...html.matchAll(cssRegex)];

	for (const match of matches) {
		const [fullMatch, hrefPath] = match;

		// Skip if no path captured
		if (!hrefPath) continue;

		// Must be a stylesheet link
		if (!fullMatch.includes('rel="stylesheet"')) continue;

		// Skip external URLs
		if (hrefPath.startsWith("//")) continue;

		// Skip theme CSS files - they're loaded dynamically
		if (hrefPath.includes("/themes/") && !hrefPath.includes("base.css")) {
			continue;
		}

		const filePath = join(getBaseDirs().publicDir, hrefPath);

		try {
			let content = await readFile(filePath, "utf-8");

			// Escape </style> in content (rare but possible)
			content = content.replace(/<\/style>/gi, "<\\/style>");

			html = html.replace(fullMatch, `<style>\n${content}\n</style>`);
		} catch {
			// Fail hard - leaving original <link> tag will break in ChatGPT sandbox
			throw new Error(
				`Failed to inline CSS "${hrefPath}": file not found at ${filePath}. ` +
					`Widget cannot load with missing stylesheets.`,
			);
		}
	}

	return html;
}

/**
 * Convert relative theme CSS paths to absolute URLs.
 * This is needed because the widget runs in ChatGPT's sandbox
 * where relative paths don't resolve to our server.
 *
 * @param html - The HTML string to process
 * @returns HTML with absolute theme URLs
 */
function absolutifyThemePaths(html: string): string {
	const baseUrl = config.publicApiUrl;
	if (!baseUrl) return html;

	// Match theme CSS paths like /shared/themes/dark-1.css
	const themeRegex = /href="(\/shared\/themes\/(?!base\.css)[^"]+\.css)"/g;

	return html.replace(themeRegex, (_match, path) => {
		return `href="${baseUrl}${path}"`;
	});
}

/**
 * Inline all local assets (scripts, CSS) into HTML.
 *
 * @param html - The HTML string to process
 * @returns HTML with assets inlined
 */
async function inlineAssets(html: string): Promise<string> {
	html = await inlineLocalScripts(html);
	html = await inlineLocalCss(html);
	html = absolutifyThemePaths(html);
	return html;
}

/**
 * Load a widget HTML file and prepare it for MCP serving.
 * Inlines local scripts and CSS, then caches the result.
 *
 * @param widgetName - Name of the widget file (without path)
 * @returns The widget HTML string with assets inlined
 */
export async function loadWidgetHtml(widgetName: string): Promise<string> {
	// Check cache first (skip cache in development for easier iteration)
	const useCache = config.isProduction;
	if (useCache) {
		const cached = widgetCache.get(widgetName);
		if (cached) {
			return cached;
		}
	}

	const widgetPath = join(getBaseDirs().widgetDir, widgetName);

	try {
		let html = await readFile(widgetPath, "utf-8");

		// Inline local assets
		html = await inlineAssets(html);

		if (useCache) {
			widgetCache.set(widgetName, html);
		}

		return html;
	} catch (error) {
		console.error(`Failed to load widget: ${widgetName}`, error);
		throw new Error(`Widget not found: ${widgetName}`);
	}
}

/**
 * Load the prompt library widget HTML.
 * This is the main widget for browsing and managing prompts.
 *
 * @returns The prompt library widget HTML string
 */
export async function loadPromptWidgetHtml(): Promise<string> {
	return loadWidgetHtml("prompts-chatgpt.html");
}

/**
 * Clear the widget cache.
 * Useful for development when widget HTML changes.
 */
export function clearWidgetCache(): void {
	widgetCache.clear();
}
