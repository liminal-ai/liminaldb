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

// Assumes utils.js is loaded (escapeHtml)

const promptEditor = (function () {
	"use strict";

	// State
	let containerEl = null;
	let contentTextarea = null;
	let toolbarEl = null;
	let tagModalEl = null;
	let currentData = null;
	let isDirty = false;
	let onSave = null;
	let onDiscard = null;
	let onDirtyChange = null;

	/**
	 * Initialize the editor in a container element
	 * @param {HTMLElement} container - Container to render into
	 * @param {Object} options - Configuration options
	 * @param {Object} [options.data] - Initial data (for edit mode)
	 * @param {Function} options.onSave - Called with form data on save
	 * @param {Function} options.onDiscard - Called on discard
	 * @param {Function} [options.onDirtyChange] - Called when dirty state changes
	 */
	function init(container, options = {}) {
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
		isDirty = false;

		render();
		attachEventListeners();
	}

	/**
	 * Render the editor form
	 */
	function render() {
		const tagsString = (currentData.tags || []).join(", ");

		containerEl.innerHTML = `
			<div class="prompt-editor">
				<div class="editor-form">
					<div class="form-row">
						<label for="editor-slug">Slug</label>
						<input type="text" id="editor-slug" name="slug"
							value="${escapeHtml(currentData.slug)}"
							placeholder="my-prompt-slug"
							pattern="[a-z0-9]+(-[a-z0-9]+)*"
							required>
						<span class="field-hint">Lowercase letters, numbers, dashes only</span>
					</div>

					<div class="form-row">
						<label for="editor-name">Name</label>
						<input type="text" id="editor-name" name="name"
							value="${escapeHtml(currentData.name)}"
							placeholder="My Prompt Name"
							required>
					</div>

					<div class="form-row">
						<label for="editor-description">Description</label>
						<input type="text" id="editor-description" name="description"
							value="${escapeHtml(currentData.description)}"
							placeholder="A brief description of this prompt"
							required>
					</div>

					<div class="form-row content-row">
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
					</div>

					<div class="form-row">
						<label for="editor-tags">Tags</label>
						<input type="text" id="editor-tags" name="tags"
							value="${escapeHtml(tagsString)}"
							placeholder="tag1, tag2, tag3">
						<span class="field-hint">Comma-separated</span>
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

		// Toolbar buttons
		containerEl
			.querySelector("#btn-wrap-tag")
			.addEventListener("click", showTagModal);
		containerEl
			.querySelector("#btn-insert-var")
			.addEventListener("click", insertVariable);

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
			// Cmd+T or Ctrl+T - wrap in tag
			if ((e.metaKey || e.ctrlKey) && e.key === "t") {
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
		const tagsInput = containerEl.querySelector("#editor-tags").value;
		const tags = tagsInput
			.split(",")
			.map((t) => t.trim())
			.filter((t) => t.length > 0);

		return {
			slug: containerEl.querySelector("#editor-slug").value.trim(),
			name: containerEl.querySelector("#editor-name").value.trim(),
			description: containerEl
				.querySelector("#editor-description")
				.value.trim(),
			content: contentTextarea.value,
			tags,
		};
	}

	/**
	 * Validate form data
	 * @returns {string|null} Error message or null if valid
	 */
	function validate() {
		const data = getFormData();

		if (!data.slug) return "Slug is required";
		if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) {
			return "Slug must be lowercase letters, numbers, and dashes only";
		}
		if (!data.name) return "Name is required";
		if (!data.description) return "Description is required";
		if (!data.content) return "Content is required";

		return null;
	}

	/**
	 * Handle save button click
	 */
	function handleSave() {
		const error = validate();
		if (error) {
			alert(error);
			return;
		}

		const data = getFormData();
		onSave(data);
	}

	/**
	 * Handle discard button click
	 */
	function handleDiscard() {
		if (isDirty) {
			if (!confirm("Discard unsaved changes?")) {
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
		currentData = null;
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
