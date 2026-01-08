/**
 * Toast Notification Component
 *
 * Provides non-blocking toast notifications for success, error, and info messages.
 * Toasts auto-dismiss after a configurable duration.
 *
 * Usage:
 *   showToast('Operation successful', { type: 'success' });
 *   showToast('Something went wrong', { type: 'error', duration: 6000 });
 *
 * Requires HTML element:
 *   - #toast-container (positioned container for toasts)
 *
 * Requires escapeHtml function from utils.js
 */

/**
 * Show a toast notification
 * @param {string} message - The message to display
 * @param {Object} options - Configuration options
 * @param {string} options.type - 'error' | 'success' | 'info' (default: 'info')
 * @param {number} options.duration - Auto-dismiss time in ms (default: 4000, 0 to disable)
 */
function showToast(message, options = {}) {
	const { type = "info", duration = 4000 } = options;
	const container = document.getElementById("toast-container");

	if (!container) {
		console.warn("Toast container not found");
		return;
	}

	const toast = document.createElement("div");
	toast.className = `toast toast-${type}`;
	toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" aria-label="Dismiss">&times;</button>
  `;

	const closeBtn = toast.querySelector(".toast-close");
	const dismiss = () => {
		toast.classList.add("toast-out");
		setTimeout(() => toast.remove(), 200);
	};

	closeBtn.addEventListener("click", dismiss);
	container.appendChild(toast);

	if (duration > 0) {
		setTimeout(dismiss, duration);
	}
}

// Export for browser use
window.showToast = showToast;
