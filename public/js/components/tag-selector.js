/**
 * Tag Selector Component
 *
 * Renders grouped tag chips (Purpose, Domain, Task) with multi-select.
 * Supports two styles:
 * - 'chip' (default): Button chips for inline selection (editor)
 * - 'list': List items with checkmarks for dropdown (shell)
 *
 * Dependencies: Requires utils.js (for escapeHtml function)
 *
 * @example
 * // Chip style (editor)
 * const html = tagSelector.renderHtml(tags, selectedTags);
 * container.innerHTML = html;
 * tagSelector.attachHandlers(container, (tag, isSelected) => { ... });
 *
 * // List style (shell dropdown)
 * const html = tagSelector.renderHtml(tags, selectedTags, { style: 'list' });
 * container.innerHTML = html;
 * tagSelector.attachHandlers(container, onToggle, { style: 'list' });
 */

// Guard: escapeHtml must be available (from utils.js)
if (typeof escapeHtml !== "function") {
	throw new Error("tag-selector.js requires escapeHtml from utils.js");
}

const tagSelector = (() => {
	const dimensionLabels = {
		purpose: "Purpose",
		domain: "Domain",
		task: "Task",
	};

	/**
	 * Render tag selector HTML
	 * @param {Object} tags - { purpose: string[], domain: string[], task: string[] }
	 * @param {string[]} selectedTags - Currently selected tag names
	 * @param {Object} [options] - Render options
	 * @param {string} [options.style='chip'] - 'chip' for buttons, 'list' for dropdown items
	 * @returns {string} HTML string
	 */
	function renderHtml(tags, selectedTags = [], options = {}) {
		const style = options.style || "chip";
		const dimensions = ["purpose", "domain", "task"];

		return dimensions
			.map((dim) => {
				const dimTags = tags[dim] || [];
				if (dimTags.length === 0) return "";

				const itemsHtml = dimTags
					.map((tag) => {
						const isSelected = selectedTags.includes(tag);
						if (style === "list") {
							return `
							<div class="tag-picker-item ${isSelected ? "selected" : ""}"
								data-tag="${escapeHtml(tag)}">
								<span class="check">✓</span>
								<span>${escapeHtml(tag)}</span>
							</div>
						`;
						}
						// Default chip style
						return `
						<button type="button"
							class="tag-chip ${isSelected ? "selected" : ""}"
							data-tag="${escapeHtml(tag)}"
							aria-pressed="${isSelected}">
							${escapeHtml(tag)}
						</button>
					`;
					})
					.join("");

				if (style === "list") {
					return `
					<div class="tag-picker-section">
						<div class="tag-picker-section-header">${dimensionLabels[dim]}</div>
						${itemsHtml}
					</div>
				`;
				}
				// Default chip style
				return `
				<div class="tag-section" data-dimension="${dim}">
					<div class="tag-section-header">${dimensionLabels[dim]}</div>
					<div class="tag-chips">
						${itemsHtml}
					</div>
				</div>
			`;
			})
			.join("");
	}

	/**
	 * Attach click handlers to tag items
	 * @param {HTMLElement} container - Container element with rendered items
	 * @param {Function} onToggle - Called with (tagName, isSelected) when item clicked
	 * @param {Object} [options] - Handler options
	 * @param {string} [options.style='chip'] - 'chip' for buttons, 'list' for dropdown items
	 */
	function attachHandlers(container, onToggle, options = {}) {
		const style = options.style || "chip";
		const selector = style === "list" ? ".tag-picker-item" : ".tag-chip";

		container.querySelectorAll(selector).forEach((item) => {
			item.addEventListener("click", () => {
				const tag = item.dataset.tag;
				const isSelected = item.classList.toggle("selected");
				if (style === "chip") {
					item.setAttribute("aria-pressed", String(isSelected));
				}
				onToggle(tag, isSelected);
			});
		});
	}

	return { renderHtml, attachHandlers };
})();

// Attach to window for browser use
if (typeof window !== "undefined") {
	window.tagSelector = tagSelector;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
	module.exports = { tagSelector };
}
