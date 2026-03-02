/**
 * Merge Mode component for prompt viewer.
 * Converts strict {{fieldName}} tokens into synchronized inline inputs.
 */
(function () {
	const STRICT_MERGE_FIELD_REGEX = /\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g;

	let currentSlug = null;
	let mergeDirty = false;
	let mergeValues = {};
	let activeFields = [];

	function safeHtml(value) {
		if (typeof escapeHtml === "function") {
			return escapeHtml(value);
		}
		return String(value)
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;")
			.replaceAll("'", "&#39;");
	}

	function inputWrapperHtml(fieldName) {
		const safeFieldName = safeHtml(fieldName);
		return (
			`<span class="merge-input-wrapper">` +
			`<input type="text" data-field="${safeFieldName}" placeholder="${safeFieldName}" class="merge-input" />` +
			`</span>`
		);
	}

	function updateFilledState(inputEl) {
		const wrapper = inputEl.closest(".merge-input-wrapper");
		if (!wrapper) return;
		wrapper.classList.toggle("filled", inputEl.value.length > 0);
	}

	function syncFieldValues(fieldName, value, sourceInput) {
		const contentEl = document.getElementById("promptContent");
		if (!contentEl) return;

		const inputs = contentEl.querySelectorAll("input.merge-input");
		inputs.forEach((inputEl) => {
			if (inputEl.dataset.field !== fieldName) return;
			if (inputEl !== sourceInput) {
				inputEl.value = value;
			}
			updateFilledState(inputEl);
		});
	}

	function bindMergeInputs(contentEl) {
		const inputs = contentEl.querySelectorAll("input.merge-input");
		inputs.forEach((inputEl) => {
			inputEl.addEventListener("input", () => {
				const fieldName = inputEl.dataset.field || "";
				if (!fieldName) return;

				mergeDirty = true;
				mergeValues[fieldName] = inputEl.value;
				syncFieldValues(fieldName, inputEl.value, inputEl);
			});

			updateFilledState(inputEl);
		});
	}

	function updateStats(content, stats) {
		const statTags = document.getElementById("statTags");
		const statVars = document.getElementById("statVars");
		const statChars = document.getElementById("statChars");
		if (statTags) statTags.textContent = String(stats?.tags ?? 0);
		if (statVars) statVars.textContent = String(stats?.vars ?? 0);
		if (statChars) statChars.textContent = String((content || "").length);
	}

	function renderMergeHtml(content, mergeFields, renderMarkdownFn) {
		const fieldSet = new Set(Array.isArray(mergeFields) ? mergeFields : []);
		const placeholders = [];
		const nonce =
			Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
		let index = 0;

		const preprocessed = (content || "").replace(
			STRICT_MERGE_FIELD_REGEX,
			(_match, fieldName) => {
				if (fieldSet.size > 0 && !fieldSet.has(fieldName)) {
					return `{{${fieldName}}}`;
				}
				const placeholder = `%%%MERGE_${nonce}_${index}_${fieldName}%%%`;
				placeholders.push({ placeholder, fieldName });
				index += 1;
				return placeholder;
			},
		);

		const renderResult =
			typeof renderMarkdownFn === "function"
				? renderMarkdownFn(preprocessed)
				: { html: safeHtml(preprocessed), stats: { tags: 0, vars: 0 } };
		let html = renderResult?.html || "";

		placeholders.forEach(({ placeholder, fieldName }) => {
			html = html.replaceAll(placeholder, inputWrapperHtml(fieldName));
		});

		return { html, stats: renderResult?.stats || { tags: 0, vars: 0 } };
	}

	function collectCurrentValues() {
		const values = {};
		const contentEl = document.getElementById("promptContent");
		if (!contentEl) return values;

		const inputs = contentEl.querySelectorAll("input.merge-input");
		inputs.forEach((inputEl) => {
			const fieldName = inputEl.dataset.field || "";
			if (!fieldName) return;
			if (inputEl.value !== "") {
				values[fieldName] = inputEl.value;
			}
		});

		return values;
	}

	function enterMergeMode(slug, content, mergeFields, renderMarkdownFn) {
		currentSlug = slug;
		mergeDirty = false;
		mergeValues = {};
		activeFields = Array.isArray(mergeFields) ? [...mergeFields] : [];

		const contentEl = document.getElementById("promptContent");
		if (!contentEl) return;

		const { html, stats } = renderMergeHtml(
			content,
			mergeFields,
			renderMarkdownFn,
		);
		contentEl.innerHTML =
			html || '<span style="color: var(--text-muted)">No content</span>';
		updateStats(content, stats);
		bindMergeInputs(contentEl);
	}

	function exitMergeMode() {
		currentSlug = null;
		mergeDirty = false;
		mergeValues = {};
		activeFields = [];
	}

	function getMergeValues() {
		const values = collectCurrentValues();

		// Preserve intentionally cleared values for fields that were previously edited.
		Object.keys(mergeValues).forEach((fieldName) => {
			if (!(fieldName in values) && activeFields.includes(fieldName)) {
				if (mergeValues[fieldName] === "") {
					values[fieldName] = "";
				}
			}
		});

		return values;
	}

	function isMergeDirty() {
		return mergeDirty;
	}

	function resetMergeDirty() {
		mergeDirty = false;
	}

	window.mergeMode = {
		enterMergeMode,
		exitMergeMode,
		getMergeValues,
		isMergeDirty,
		resetMergeDirty,
	};
})();
