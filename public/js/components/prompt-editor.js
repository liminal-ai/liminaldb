/**
 * Prompt Editor Component
 *
 * Renders an editable form for creating/editing prompts.
 * Features:
 * - Form fields: slug, name, description, content, tags
 * - Toolbar with tag wrap [</>] and variable insert [{{}}] on selection
 * - Keyboard shortcuts: Cmd+T (tag), Cmd+Shift+V (variable)
 * - Dirty state tracking
 * - Save/discard callbacks
 */

// Assumes utils.js and components/tag-selector.js are loaded

const promptEditor = (() => {
	// State
	let containerEl = null;
	let contentTextarea = null;
	let toolbarEl = null;
	let tagModalEl = null;
	let tagSelectorEl = null;
	let currentData = null;
	let allTags = null; // { purpose: [], domain: [], task: [] }
	let isDirty = false;
	let onSave = null;
	let onDiscard = null;
	let onDirtyChange = null;
	let onChange = null;

	/**
	 * Initialize the editor in a container element
	 * @param {HTMLElement} container - Container to render into
	 * @param {Object} options - Configuration options
	 * @param {Object} [options.data] - Initial data (for edit mode)
	 * @param {Function} options.onSave - Called with form data on save
	 * @param {Function} options.onDiscard - Called on discard
	 * @param {Function} [options.onDirtyChange] - Called when dirty state changes
	 * @param {Function} [options.onChange] - Called when field changes (field, value)
	 */
	async function init(container, options = {}) {
		containerEl = container;
		currentData = options.data || {
			slug: "",
			name: "",
			description: "",
			content: "",
			tags: [],
		};
		onSave = options.onSave || (() => {});
		onDiscard = options.onDiscard || (() => {});
		onDirtyChange = options.onDirtyChange || (() => {});
		onChange = options.onChange || (() => {});
		isDirty = false;

		// Fetch available tags
		await fetchTags();

		render();
		attachEventListeners();
		initTagSelector();
	}

	/**
	 * Validate tag response shape. Returns default if invalid.
	 * @param {unknown} data - Response data to validate
	 * @returns {{ purpose: string[], domain: string[], task: string[] }}
	 */
	function validateTagsResponse(data) {
		const defaultTags = { purpose: [], domain: [], task: [] };

		if (!data || typeof data !== "object") {
			console.warn("Tags response invalid: expected object, got", typeof data);
			return defaultTags;
		}

		const result = { ...defaultTags };
		let hadInvalidValues = false;

		for (const dim of ["purpose", "domain", "task"]) {
			if (Array.isArray(data[dim])) {
				const filtered = data[dim].filter(
					(t) => typeof t === "string" && t.trim() !== "",
				);
				if (filtered.length !== data[dim].length) {
					hadInvalidValues = true;
				}
				result[dim] = filtered;
			} else if (data[dim] !== undefined) {
				console.warn(
					`Tags response: "${dim}" should be array, got`,
					typeof data[dim],
				);
			}
		}

		if (hadInvalidValues) {
			console.warn(
				"Tags response contained non-string values that were filtered out",
			);
		}

		return result;
	}

	/**
	 * Fetch available tags from API
	 */
	async function fetchTags() {
		try {
			// Use window.fetch explicitly for test compatibility with JSDOM
			const fetchFn = typeof window !== "undefined" ? window.fetch : fetch;
			const response = await fetchFn("/api/prompts/tags", {
				method: "GET",
				credentials: "include",
			});
			if (response.ok) {
				const data = await response.json();
				allTags = validateTagsResponse(data);
			} else {
				console.error("Failed to fetch tags:", response.status);
				allTags = { purpose: [], domain: [], task: [] };
			}
		} catch (err) {
			console.error("Failed to fetch tags:", err);
			allTags = { purpose: [], domain: [], task: [] };
		}
	}

	/**
	 * Render the editor form
	 */
	function render() {
		containerEl.innerHTML = `
			<div class="prompt-editor">
				<div class="editor-form">
					<div class="form-row" data-field="slug">
						<label for="editor-slug">Slug</label>
						<input type="text" id="editor-slug" name="slug"
							value="${escapeHtml(currentData.slug)}"
							placeholder="my-prompt-slug"
							pattern="[a-z0-9]+(-[a-z0-9]+)*"
							required>
						<span class="field-hint">Lowercase letters, numbers, dashes only</span>
						<span class="field-error" id="error-slug"></span>
					</div>

					<div class="form-row" data-field="name">
						<label for="editor-name">Name</label>
						<input type="text" id="editor-name" name="name"
							value="${escapeHtml(currentData.name)}"
							placeholder="My Prompt Name"
							required>
						<span class="field-error" id="error-name"></span>
					</div>

					<div class="form-row" data-field="description">
						<label for="editor-description">Description</label>
						<input type="text" id="editor-description" name="description"
							value="${escapeHtml(currentData.description)}"
							placeholder="A brief description of this prompt"
							required>
						<span class="field-error" id="error-description"></span>
					</div>

					<div class="form-row content-row" data-field="content">
						<label for="editor-content">
							Content
							<span class="editor-toolbar" id="editor-toolbar" style="visibility: hidden;">
								<button type="button" class="toolbar-btn" id="btn-wrap-tag" title="Wrap in XML tag (Cmd+T)">&lt;/&gt;</button>
								<button type="button" class="toolbar-btn" id="btn-insert-var" title="Insert variable (Cmd+Shift+V)">{{}}</button>
							</span>
						</label>
						<textarea id="editor-content" name="content"
							placeholder="Enter your prompt content here..."
							required>${escapeHtml(currentData.content)}</textarea>
						<span class="field-error" id="error-content"></span>
					</div>

					<div class="form-row" data-field="tags">
						<label>Tags</label>
						<div id="editor-tag-selector" class="tag-selector"></div>
					</div>
				</div>

				<div class="editor-actions">
					<button type="button" class="btn btn-secondary" id="btn-discard">Discard</button>
					<button type="button" class="btn btn-primary" id="btn-save">Save</button>
				</div>
			</div>

			<div class="tag-modal" id="tag-modal" style="display: none;">
				<div class="tag-modal-content">
					<label for="tag-name-input">Tag name:</label>
					<input type="text" id="tag-name-input" placeholder="instructions">
					<div class="tag-modal-actions">
						<button type="button" class="btn btn-secondary btn-sm" id="tag-modal-cancel">Cancel</button>
						<button type="button" class="btn btn-primary btn-sm" id="tag-modal-wrap">Wrap</button>
					</div>
				</div>
			</div>
		`;

		// Cache elements
		contentTextarea = containerEl.querySelector("#editor-content");
		toolbarEl = containerEl.querySelector("#editor-toolbar");
		tagModalEl = containerEl.querySelector("#tag-modal");
		tagSelectorEl = containerEl.querySelector("#editor-tag-selector");
	}

	/**
	 * Initialize the tag selector component
	 */
	function initTagSelector() {
		if (!tagSelectorEl || !window.tagSelector) return;

		const existingTags = currentData.tags || [];
		const tagsToRender = allTags || { purpose: [], domain: [], task: [] };

		// Render the tag selector with grouped tags
		tagSelectorEl.innerHTML = window.tagSelector.renderHtml(
			tagsToRender,
			existingTags,
		);

		// Attach handlers with dirty state callback
		window.tagSelector.attachHandlers(tagSelectorEl, () => {
			setDirty(true);
			const selectedTags = getSelectedTags();
			onChange("tags", selectedTags);
		});
	}

	/**
	 * Get currently selected tags from the tag selector
	 */
	function getSelectedTags() {
		if (!tagSelectorEl) return [];
		const selectedChips = tagSelectorEl.querySelectorAll(".tag-chip.selected");
		return Array.from(selectedChips).map((chip) => chip.dataset.tag);
	}

	/**
	 * Attach event listeners
	 */
	function attachEventListeners() {
		// Track dirty state on all inputs
		const inputs = containerEl.querySelectorAll("input, textarea");
		inputs.forEach((input) => {
			input.addEventListener("input", () => {
				setDirty(true);
				// Call onChange callback with field name and value
				const field = input.name || input.id.replace("editor-", "");
				onChange(field, input.value);
			});
		});

		// Show/hide toolbar on selection
		contentTextarea.addEventListener("select", updateToolbarVisibility);
		contentTextarea.addEventListener("mouseup", updateToolbarVisibility);
		contentTextarea.addEventListener("keyup", updateToolbarVisibility);
		contentTextarea.addEventListener("blur", () => {
			// Delay hide to allow toolbar click
			setTimeout(() => {
				if (!tagModalEl || tagModalEl.style.display === "none") {
					toolbarEl.style.visibility = "hidden";
				}
			}, 200);
		});

		// Toolbar buttons - use mousedown to fire before blur hides toolbar
		containerEl
			.querySelector("#btn-wrap-tag")
			.addEventListener("mousedown", showTagModal);
		containerEl
			.querySelector("#btn-insert-var")
			.addEventListener("mousedown", insertVariable);

		// Tag modal
		containerEl
			.querySelector("#tag-modal-cancel")
			.addEventListener("click", hideTagModal);
		containerEl
			.querySelector("#tag-modal-wrap")
			.addEventListener("click", wrapWithTag);
		containerEl
			.querySelector("#tag-name-input")
			.addEventListener("keydown", (e) => {
				if (e.key === "Enter") {
					e.preventDefault();
					wrapWithTag();
				} else if (e.key === "Escape") {
					hideTagModal();
				}
			});

		// Keyboard shortcuts on textarea
		contentTextarea.addEventListener("keydown", (e) => {
			// Cmd+Shift+T or Ctrl+Shift+T - wrap in tag (avoid Cmd+T browser new tab)
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "t") {
				e.preventDefault();
				if (hasSelection()) {
					showTagModal();
				}
			}
			// Cmd+Shift+V or Ctrl+Shift+V - insert variable
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "v") {
				e.preventDefault();
				insertVariable();
			}
		});

		// Action buttons
		containerEl
			.querySelector("#btn-discard")
			.addEventListener("click", handleDiscard);
		containerEl
			.querySelector("#btn-save")
			.addEventListener("click", handleSave);
	}

	/**
	 * Check if there's a text selection in the content textarea
	 */
	function hasSelection() {
		return contentTextarea.selectionStart !== contentTextarea.selectionEnd;
	}

	/**
	 * Update toolbar visibility based on selection
	 */
	function updateToolbarVisibility() {
		toolbarEl.style.visibility = hasSelection() ? "visible" : "hidden";
	}

	/**
	 * Show the tag name modal
	 */
	function showTagModal() {
		tagModalEl.style.display = "flex";
		const input = tagModalEl.querySelector("#tag-name-input");
		input.value = "";
		input.focus();
	}

	/**
	 * Hide the tag name modal
	 */
	function hideTagModal() {
		tagModalEl.style.display = "none";
		contentTextarea.focus();
	}

	/**
	 * Wrap selected text with XML tag
	 */
	function wrapWithTag() {
		const tagName = tagModalEl.querySelector("#tag-name-input").value.trim();
		if (!tagName) {
			hideTagModal();
			return;
		}

		const start = contentTextarea.selectionStart;
		const end = contentTextarea.selectionEnd;
		const text = contentTextarea.value;
		const selected = text.substring(start, end);

		const wrapped = `<${tagName}>${selected}</${tagName}>`;
		contentTextarea.value =
			text.substring(0, start) + wrapped + text.substring(end);

		// Position cursor after opening tag
		const newPos = start + tagName.length + 2;
		contentTextarea.setSelectionRange(newPos, newPos + selected.length);

		hideTagModal();
		setDirty(true);
	}

	/**
	 * Insert variable placeholder at cursor or wrap selection
	 */
	function insertVariable() {
		const start = contentTextarea.selectionStart;
		const end = contentTextarea.selectionEnd;
		const text = contentTextarea.value;

		if (start === end) {
			// No selection - insert empty placeholder
			const placeholder = "{{}}";
			contentTextarea.value =
				text.substring(0, start) + placeholder + text.substring(end);
			// Position cursor inside braces
			contentTextarea.setSelectionRange(start + 2, start + 2);
		} else {
			// Wrap selection
			const selected = text.substring(start, end);
			const wrapped = `{{${selected}}}`;
			contentTextarea.value =
				text.substring(0, start) + wrapped + text.substring(end);
			contentTextarea.setSelectionRange(start, start + wrapped.length);
		}

		contentTextarea.focus();
		setDirty(true);
	}

	/**
	 * Set dirty state
	 */
	function setDirty(dirty) {
		if (isDirty !== dirty) {
			isDirty = dirty;
			onDirtyChange(isDirty);
		}
	}

	/**
	 * Get current form data
	 */
	function getFormData() {
		return {
			slug: containerEl.querySelector("#editor-slug").value.trim(),
			name: containerEl.querySelector("#editor-name").value.trim(),
			description: containerEl
				.querySelector("#editor-description")
				.value.trim(),
			content: contentTextarea.value,
			tags: getSelectedTags(),
		};
	}

	/**
	 * Clear all field errors
	 */
	function clearErrors() {
		const errorEls = containerEl.querySelectorAll(".field-error");
		errorEls.forEach((el) => {
			el.textContent = "";
			el.classList.remove("visible");
		});
		const rows = containerEl.querySelectorAll(".form-row");
		rows.forEach((row) => {
			row.classList.remove("has-error");
		});
	}

	/**
	 * Show error on a specific field
	 */
	function showFieldError(field, message) {
		const errorEl = containerEl.querySelector(`#error-${field}`);
		const row = containerEl.querySelector(`[data-field="${field}"]`);
		if (errorEl) {
			errorEl.textContent = message;
			errorEl.classList.add("visible");
		}
		if (row) {
			row.classList.add("has-error");
		}
	}

	/**
	 * Validate form data
	 * @returns {Object} Object with errors per field, or empty if valid
	 */
	function validate() {
		const data = getFormData();
		const errors = {};

		if (!data.slug) {
			errors.slug = "Slug is required";
		} else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
			errors.slug = "Lowercase letters, numbers, and dashes only";
		}
		if (!data.name) errors.name = "Name is required";
		if (!data.description) errors.description = "Description is required";
		if (!data.content) errors.content = "Content is required";

		return errors;
	}

	/**
	 * Handle save button click
	 */
	function handleSave() {
		clearErrors();
		const errors = validate();
		const hasErrors = Object.keys(errors).length > 0;

		if (hasErrors) {
			Object.entries(errors).forEach(([field, message]) => {
				showFieldError(field, message);
			});
			return;
		}

		const data = getFormData();
		onSave(data);
	}

	/**
	 * Handle discard button click
	 */
	async function handleDiscard() {
		if (isDirty) {
			if (!(await window.showConfirm("Discard unsaved changes?"))) {
				return;
			}
		}
		onDiscard();
	}

	/**
	 * Check if editor has unsaved changes
	 */
	function checkDirty() {
		return isDirty;
	}

	/**
	 * Destroy the editor
	 */
	function destroy() {
		if (containerEl) {
			containerEl.innerHTML = "";
		}
		containerEl = null;
		contentTextarea = null;
		toolbarEl = null;
		tagModalEl = null;
		tagSelectorEl = null;
		currentData = null;
		allTags = null;
		isDirty = false;
	}

	return {
		init,
		getFormData,
		validate,
		checkDirty,
		destroy,
	};
})();

// Attach to window for browser use
if (typeof window !== "undefined") {
	window.promptEditor = promptEditor;
}

// Export for testing
if (typeof module !== "undefined" && module.exports) {
	module.exports = { promptEditor };
}
