/**
 * Confirmation Modal Component
 *
 * Provides a reusable confirmation dialog that replaces native window.confirm().
 * Returns a Promise that resolves to true (OK) or false (Cancel).
 *
 * Usage:
 *   const confirmed = await showConfirm('Are you sure?');
 *   if (confirmed) { ... }
 *
 * Requires HTML elements:
 *   - #confirm-modal (overlay container)
 *   - #confirm-message (message display)
 *   - #confirm-ok (OK button)
 *   - #confirm-cancel (Cancel button)
 */

let confirmResolve = null;

/**
 * Show a confirmation modal
 * @param {string} message - The confirmation message
 * @returns {Promise<boolean>} - true if confirmed, false if cancelled
 */
function showConfirm(message) {
	return new Promise((resolve) => {
		confirmResolve = resolve;
		const modal = document.getElementById("confirm-modal");
		const messageEl = document.getElementById("confirm-message");
		messageEl.textContent = message;
		modal.style.display = "flex";

		// Focus OK button for keyboard accessibility
		document.getElementById("confirm-ok").focus();
	});
}

/**
 * Hide the confirmation modal and resolve the promise
 * @param {boolean} result - The result to resolve with
 */
function hideConfirm(result) {
	const modal = document.getElementById("confirm-modal");
	modal.style.display = "none";
	if (confirmResolve) {
		confirmResolve(result);
		confirmResolve = null;
	}
}

/**
 * Initialize modal event listeners
 * Should be called after DOM is ready
 */
function initModal() {
	const cancelBtn = document.getElementById("confirm-cancel");
	const okBtn = document.getElementById("confirm-ok");
	const modal = document.getElementById("confirm-modal");

	if (!cancelBtn || !okBtn || !modal) {
		console.warn("Modal elements not found, skipping initialization");
		return;
	}

	cancelBtn.addEventListener("click", () => hideConfirm(false));
	okBtn.addEventListener("click", () => hideConfirm(true));

	// Click outside to cancel
	modal.addEventListener("click", (e) => {
		if (e.target.id === "confirm-modal") hideConfirm(false);
	});

	// Keyboard shortcuts
	document.addEventListener("keydown", (e) => {
		if (modal.style.display === "flex") {
			if (e.key === "Escape") hideConfirm(false);
			if (e.key === "Enter") hideConfirm(true);
		}
	});
}

// Export for browser use
window.showConfirm = showConfirm;
window.hideConfirm = hideConfirm;
window.initModal = initModal;
