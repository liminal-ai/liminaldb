/**
 * Prompt Viewer - Parser and Renderer
 * Dependencies: markdown-it (load from CDN or npm)
 */

// Initialize markdown-it (assumes it's loaded globally or import it)
if (typeof window.markdownit !== "function") {
	console.warn("markdown-it not loaded. Rendered view will not work.");
}
const md = window.markdownit
	? window.markdownit({
			html: false,
			xhtmlOut: false,
			breaks: true,
			linkify: true,
			typographer: false,
		})
	: null;

/**
 * Semantic Parser - shows syntax but muted, content prominent
 */
class SemanticParser {
	constructor(input) {
		this.input = input;
		this.pos = 0;
		this.stats = { tags: 0, vars: 0 };
	}

	parse() {
		const result = this.parseAll();
		return { html: result, stats: this.stats };
	}

	parseAll() {
		let result = "";

		while (this.pos < this.input.length) {
			if (this.lookingAt("<") && this.isValidTagStart()) {
				result += this.parseXmlTag();
			} else if (this.lookingAt("{{")) {
				result += this.parseVariable();
			} else if (this.lookingAt("```")) {
				result += this.parseCodeBlock();
			} else if (this.isAtLineStart() && this.input[this.pos] === "#") {
				result += this.parseHeader();
			} else if (
				this.isAtLineStart() &&
				/^[-*]\s/.test(this.input.slice(this.pos, this.pos + 2))
			) {
				result += this.parseListItem();
			} else if (
				this.isAtLineStart() &&
				/^\d+\.\s/.test(this.input.slice(this.pos, this.pos + 4))
			) {
				result += this.parseNumberedListItem();
			} else if (this.lookingAt("**")) {
				result += this.parseBold();
			} else if (
				this.input[this.pos] === "*" &&
				!this.lookingAt("**") &&
				this.canStartEmphasis()
			) {
				result += this.parseItalic("*");
			} else if (
				this.input[this.pos] === "_" &&
				!this.lookingAt("__") &&
				this.canStartEmphasis()
			) {
				result += this.parseItalic("_");
			} else if (this.input[this.pos] === "`" && !this.lookingAt("```")) {
				result += this.parseInlineCode();
			} else {
				result += escapeHtml(this.input[this.pos]);
				this.pos++;
			}
		}

		return result;
	}

	isValidTagStart() {
		const rest = this.input.slice(this.pos + 1);
		return /^[a-zA-Z_\/]/.test(rest);
	}

	isAtLineStart() {
		if (this.pos === 0) return true;
		return this.input[this.pos - 1] === "\n";
	}

	canStartEmphasis() {
		if (this.pos > 0 && /\w/.test(this.input[this.pos - 1])) return false;
		return true;
	}

	parseXmlTag() {
		let tag = "";
		while (this.pos < this.input.length && this.input[this.pos] !== ">") {
			tag += this.input[this.pos];
			this.pos++;
		}
		if (this.pos < this.input.length) {
			tag += this.input[this.pos];
			this.pos++;
		}

		const isClosing = tag[1] === "/";
		const nameMatch = tag.match(/<\/?([a-zA-Z_][a-zA-Z0-9_-]*)/);
		const tagName = nameMatch ? nameMatch[1] : "";

		if (!isClosing) this.stats.tags++;

		if (isClosing) {
			return `<span class="xml-bracket">&lt;/</span><span class="xml-name">${escapeHtml(tagName)}</span><span class="xml-bracket">&gt;</span>`;
		} else {
			const rest = tag.slice(1 + tagName.length, -1);
			return `<span class="xml-bracket">&lt;</span><span class="xml-name">${escapeHtml(tagName)}</span><span class="xml-bracket">${escapeHtml(rest)}&gt;</span>`;
		}
	}

	parseVariable() {
		this.pos += 2;
		let varName = "";
		while (this.pos < this.input.length && !this.lookingAt("}}")) {
			varName += this.input[this.pos];
			this.pos++;
		}
		const closeBraces = this.lookingAt("}}");
		if (closeBraces) this.pos += 2;
		this.stats.vars++;
		return `<span class="var-brace">{{</span><span class="var-name">${escapeHtml(varName.trim())}</span><span class="var-brace">${closeBraces ? "}}" : ""}</span>`;
	}

	parseCodeBlock() {
		let result = '<span class="md-codeblock-fence">```</span>';
		this.pos += 3;

		let lang = "";
		while (this.pos < this.input.length && this.input[this.pos] !== "\n") {
			lang += this.input[this.pos];
			this.pos++;
		}
		if (lang)
			result += `<span class="md-codeblock-lang">${escapeHtml(lang)}</span>`;
		if (this.input[this.pos] === "\n") {
			result += "\n";
			this.pos++;
		}

		let content = "";
		while (this.pos < this.input.length && !this.lookingAt("```")) {
			content += this.input[this.pos];
			this.pos++;
		}
		result += `<span class="md-codeblock-content">${escapeHtml(content)}</span>`;

		if (this.lookingAt("```")) {
			result += '<span class="md-codeblock-fence">```</span>';
			this.pos += 3;
		}
		return result;
	}

	parseHeader() {
		let hashes = "";
		while (this.pos < this.input.length && this.input[this.pos] === "#") {
			hashes += "#";
			this.pos++;
		}
		let space = "";
		while (this.pos < this.input.length && this.input[this.pos] === " ") {
			space += " ";
			this.pos++;
		}
		let text = "";
		while (this.pos < this.input.length && this.input[this.pos] !== "\n") {
			text += this.input[this.pos];
			this.pos++;
		}
		const level = Math.min(hashes.length, 3);
		return `<span class="md-header-${level}"><span class="md-hash">${hashes}${space}</span><span class="md-header-text">${escapeHtml(text)}</span></span>`;
	}

	parseListItem() {
		const marker = this.input[this.pos];
		this.pos++;
		let space = "";
		while (this.pos < this.input.length && this.input[this.pos] === " ") {
			space += " ";
			this.pos++;
		}
		return `<span class="md-list-marker">${marker}${space}</span>`;
	}

	parseNumberedListItem() {
		let marker = "";
		while (this.pos < this.input.length && /[\d.]/.test(this.input[this.pos])) {
			marker += this.input[this.pos];
			this.pos++;
		}
		let space = "";
		while (this.pos < this.input.length && this.input[this.pos] === " ") {
			space += " ";
			this.pos++;
		}
		return `<span class="md-list-marker">${marker}${space}</span>`;
	}

	parseBold() {
		this.pos += 2;
		let text = "";
		while (this.pos < this.input.length && !this.lookingAt("**")) {
			if (this.lookingAt("{{")) {
				text += this.parseVariable();
			} else {
				text += escapeHtml(this.input[this.pos]);
				this.pos++;
			}
		}
		const hasClose = this.lookingAt("**");
		if (hasClose) this.pos += 2;
		return `<span class="md-bold-marker">**</span><span class="md-bold-text">${text}</span>${hasClose ? '<span class="md-bold-marker">**</span>' : ""}`;
	}

	parseItalic(marker) {
		this.pos++;
		let text = "";
		while (this.pos < this.input.length) {
			if (
				this.input[this.pos] === marker &&
				(marker === "*" ? !this.lookingAt("**") : !this.lookingAt("__"))
			)
				break;
			if (this.lookingAt("{{")) {
				text += this.parseVariable();
			} else {
				text += escapeHtml(this.input[this.pos]);
				this.pos++;
			}
		}
		const hasClose = this.input[this.pos] === marker;
		if (hasClose) this.pos++;
		return `<span class="md-italic-marker">${marker}</span><span class="md-italic-text">${text}</span>${hasClose ? '<span class="md-italic-marker">' + marker + "</span>" : ""}`;
	}

	parseInlineCode() {
		this.pos++;
		let text = "";
		while (this.pos < this.input.length && this.input[this.pos] !== "`") {
			text += this.input[this.pos];
			this.pos++;
		}
		const hasClose = this.input[this.pos] === "`";
		if (hasClose) this.pos++;
		return `<span class="md-code-marker">\`</span><span class="md-code-text">${escapeHtml(text)}</span>${hasClose ? '<span class="md-code-marker">\`</span>' : ""}`;
	}

	lookingAt(str) {
		return this.input.slice(this.pos, this.pos + str.length) === str;
	}
}

/**
 * Render markdown with muted XML tags and styled variables
 */
function renderMarkdown(input) {
	if (!md) {
		return {
			html: escapeHtml(input),
			stats: { tags: 0, vars: 0, chars: input.length },
		};
	}

	const tags = (input.match(/<[a-zA-Z_][a-zA-Z0-9_-]*/g) || []).length;
	const vars = (input.match(/\{\{[^}]+\}\}/g) || []).length;

	let preserved = [];
	let protectedInput = input;

	// Protect variables
	protectedInput = protectedInput.replace(
		/\{\{([^}]+)\}\}/g,
		(match, varName) => {
			const idx = preserved.length;
			preserved.push(
				`<span class="rendered-var">${escapeHtml(varName.trim())}</span>`,
			);
			return `%%%PROTECTED_${idx}%%%`;
		},
	);

	// Protect XML tags
	protectedInput = protectedInput.replace(
		/<(\/?[a-zA-Z_][a-zA-Z0-9_-]*)([^>]*)>/g,
		(match, tagName, attrs) => {
			const idx = preserved.length;
			const isClosing = tagName.startsWith("/");
			const name = isClosing ? tagName.slice(1) : tagName;
			const safeAttrs = escapeHtml(attrs);
			const display = isClosing
				? `&lt;/${name}&gt;`
				: `&lt;${name}${safeAttrs}&gt;`;
			preserved.push(`<span class="rendered-xml-tag">${display}</span>`);
			return `%%%PROTECTED_${idx}%%%`;
		},
	);

	let html = md.render(protectedInput);

	preserved.forEach((content, idx) => {
		html = html.replaceAll(`%%%PROTECTED_${idx}%%%`, content);
	});

	return { html, stats: { tags, vars } };
}

/**
 * Main render function - call this to render prompt content
 * @param {string} input - raw prompt text
 * @param {string} view - 'semantic' | 'plain' | 'rendered'
 * @returns {{ html: string, stats: { tags: number, vars: number } }}
 */
function renderPrompt(input, view = "semantic") {
	if (view === "rendered") {
		return renderMarkdown(input);
	} else {
		const parser = new SemanticParser(input);
		return parser.parse();
	}
}

// Export for module usage
if (typeof module !== "undefined" && module.exports) {
	module.exports = { renderPrompt, SemanticParser, renderMarkdown };
}
