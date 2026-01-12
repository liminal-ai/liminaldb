/**
 * ChatGPT Widget Platform Adapter
 *
 * Provides the platform abstraction for the prompts widget running in ChatGPT.
 * Implements data fetching via direct API calls and host communication via window.openai.
 *
 * This adapter is loaded BEFORE the main widget script and sets up window.__PROMPT_PLATFORM__.
 */
(() => {
	// Check if running in widget context - warn early if not
	const isWidgetContext = typeof window.openai !== "undefined";
	if (!isWidgetContext) {
		console.warn(
			"[ChatGPT Adapter] window.openai not found. " +
				"This adapter requires the ChatGPT widget environment. " +
				"API calls will fail without proper configuration.",
		);
	}

	// Get configuration from widget context
	// API URL and token are passed via window.openai.toolResponseMetadata
	const getConfig = () => ({
		apiUrl:
			window.openai?.toolResponseMetadata?.apiUrl ||
			window.__WIDGET_CONFIG__?.apiUrl ||
			"",
		token: window.openai?.toolResponseMetadata?.widgetToken || "",
	});

	/**
	 * Decode JWT payload without verification (for reading expiry time).
	 * @param {string} token - JWT token
	 * @returns {object|null} Decoded payload or null if invalid
	 */
	function decodeJwtPayload(token) {
		try {
			const parts = token.split(".");
			if (parts.length !== 3) return null;
			// Normalize base64url to base64 and add padding
			let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
			while (base64.length % 4) {
				base64 += "=";
			}
			const payload = atob(base64);
			return JSON.parse(payload);
		} catch {
			return null;
		}
	}

	/**
	 * Check if token is expired or expiring soon.
	 * @param {string} token - JWT token
	 * @param {number} bufferSeconds - Seconds before expiry to consider "expiring soon"
	 * @returns {{ expired: boolean, expiringSoon: boolean, expiresAt: Date|null }}
	 */
	function checkTokenExpiry(token, bufferSeconds = 300) {
		const payload = decodeJwtPayload(token);
		if (!payload?.exp) {
			return { expired: false, expiringSoon: false, expiresAt: null };
		}

		const expiresAt = new Date(payload.exp * 1000);
		const now = Date.now();
		const expired = now >= expiresAt.getTime();
		const expiringSoon =
			!expired && now >= expiresAt.getTime() - bufferSeconds * 1000;

		return { expired, expiringSoon, expiresAt };
	}

	// Track if we've shown the expiry warning
	let expiryWarningShown = false;

	/**
	 * Make an authenticated API request
	 */
	async function apiRequest(path, options = {}) {
		const config = getConfig();

		// Fail fast if API URL not configured
		if (!config.apiUrl) {
			throw new Error(
				"API URL not configured. Ensure widget is loaded via MCP tool response.",
			);
		}

		// Check token expiry before making request
		if (config.token) {
			const { expired, expiringSoon, expiresAt } = checkTokenExpiry(
				config.token,
			);

			if (expired) {
				throw new Error(
					"Your session has expired. Please close this widget and reopen it to continue.",
				);
			}

			if (expiringSoon && !expiryWarningShown) {
				expiryWarningShown = true;
				console.warn(
					`[ChatGPT Adapter] Session expires at ${expiresAt?.toLocaleTimeString()}. ` +
						"Save your work and reopen the widget to continue.",
				);
			}
		}

		const url = `${config.apiUrl}${path}`;

		const headers = {
			"Content-Type": "application/json",
			...(config.token && { Authorization: `Bearer ${config.token}` }),
			...options.headers,
		};

		const response = await fetch(url, {
			...options,
			headers,
		});

		if (!response.ok) {
			// Handle 401 specifically - likely token expired
			if (response.status === 401) {
				throw new Error(
					"Your session has expired. Please close this widget and reopen it to continue.",
				);
			}

			// Provide specific error messages for common HTTP status codes
			if (response.status === 403) {
				throw new Error(
					"Access denied. You don't have permission for this action.",
				);
			}
			if (response.status === 404) {
				throw new Error("Not found. The requested resource doesn't exist.");
			}
			if (response.status >= 500) {
				throw new Error("Server error. Please try again in a moment.");
			}

			const error = await response
				.json()
				.catch(() => ({ error: "Request failed" }));
			throw new Error(error.error || `HTTP ${response.status}`);
		}

		return response.json();
	}

	/**
	 * Platform adapter for ChatGPT widget context
	 */
	window.__PROMPT_PLATFORM__ = {
		/**
		 * Host communication methods
		 * In ChatGPT, we use window.openai APIs instead of postMessage
		 */
		host: {
			/**
			 * Notify host of state change (navigation, selection, etc.)
			 */
			notifyStateChange(state) {
				if (window.openai?.setWidgetState) {
					window.openai.setWidgetState({
						...window.openai.widgetState,
						portletState: state,
					});
				}
			},

			/**
			 * Notify host that widget is ready
			 * No-op in ChatGPT - widget is ready when mounted
			 */
			notifyReady() {
				// No-op in widget context
			},

			/**
			 * Notify host of dirty state (unsaved changes)
			 */
			notifyDirty(dirty) {
				if (window.openai?.setWidgetState) {
					window.openai.setWidgetState({
						...window.openai.widgetState,
						dirty,
					});
				}
			},

			/**
			 * Notify host of draft summary
			 */
			notifyDrafts(summary) {
				if (window.openai?.setWidgetState) {
					window.openai.setWidgetState({
						...window.openai.widgetState,
						draftSummary: summary,
					});
				}
			},

			/**
			 * Subscribe to messages from host
			 * In ChatGPT, we listen for openai:set_globals events
			 */
			onShellMessage(handler) {
				window.addEventListener("openai:set_globals", () => {
					const output = window.openai?.toolOutput;
					if (output) {
						handler({ type: "chatgpt:data", data: output });
					}
				});
			},
		},

		/**
		 * Data operations via direct API calls
		 */
		data: {
			/**
			 * List prompts with optional query and tag filters
			 */
			async listPrompts(query, tags) {
				const params = new URLSearchParams();
				if (query) params.set("q", query);
				if (tags?.length) params.set("tags", tags.join(","));
				const queryString = params.toString();
				const path = queryString
					? `/api/prompts?${queryString}`
					: "/api/prompts";
				return apiRequest(path);
			},

			/**
			 * Get a single prompt by slug
			 */
			async getPrompt(slug) {
				return apiRequest(`/api/prompts/${encodeURIComponent(slug)}`);
			},

			/**
			 * Create one or more prompts
			 */
			async createPrompts(prompts) {
				return apiRequest("/api/prompts", {
					method: "POST",
					body: JSON.stringify({ prompts }),
				});
			},

			/**
			 * Update an existing prompt
			 */
			async updatePrompt(slug, data) {
				return apiRequest(`/api/prompts/${encodeURIComponent(slug)}`, {
					method: "PUT",
					body: JSON.stringify(data),
				});
			},

			/**
			 * Delete a prompt
			 */
			async deletePrompt(slug) {
				return apiRequest(`/api/prompts/${encodeURIComponent(slug)}`, {
					method: "DELETE",
				});
			},

			/**
			 * Update prompt flags (pinned, favorited)
			 */
			async updateFlags(slug, flags) {
				return apiRequest(`/api/prompts/${encodeURIComponent(slug)}/flags`, {
					method: "PATCH",
					body: JSON.stringify(flags),
				});
			},

			/**
			 * Track prompt usage
			 */
			async trackUsage(slug) {
				return apiRequest(`/api/prompts/${encodeURIComponent(slug)}/usage`, {
					method: "POST",
				});
			},

			/**
			 * List all drafts
			 */
			async listDrafts() {
				return apiRequest("/api/drafts");
			},

			/**
			 * Get draft summary (count, expiring soon, etc.)
			 */
			async getDraftSummary() {
				return apiRequest("/api/drafts/summary");
			},

			/**
			 * Save a draft
			 */
			async saveDraft(id, data) {
				return apiRequest(`/api/drafts/${encodeURIComponent(id)}`, {
					method: "PUT",
					body: JSON.stringify(data),
				});
			},

			/**
			 * Delete a draft
			 */
			async deleteDraft(id) {
				return apiRequest(`/api/drafts/${encodeURIComponent(id)}`, {
					method: "DELETE",
				});
			},

			/**
			 * List all tags
			 */
			async listTags() {
				return apiRequest("/api/prompts/tags");
			},
		},

		/**
		 * Environment methods
		 */
		env: {
			/**
			 * Get the current theme
			 * Respects ChatGPT base theme and user preference
			 */
			getTheme() {
				const chatgptTheme = window.openai?.theme || "dark";
				const userTheme = window.openai?.toolOutput?.userTheme;

				// If user has a preference that matches ChatGPT's base theme, use it
				if (userTheme?.startsWith(chatgptTheme)) {
					return userTheme;
				}

				// Default to base theme variant
				return chatgptTheme === "dark" ? "dark-1" : "light-1";
			},

			/**
			 * Subscribe to theme changes
			 */
			onThemeChange(handler) {
				window.addEventListener("openai:set_globals", () => {
					handler(this.getTheme());
				});
			},

			/**
			 * Get auth info
			 */
			getAuth() {
				return {
					userId: window.openai?.toolOutput?.userId,
				};
			},
		},

		/**
		 * Widget-specific methods
		 */
		widget: {
			/**
			 * Request fullscreen mode
			 */
			async requestFullscreen() {
				if (window.openai?.requestDisplayMode) {
					await window.openai.requestDisplayMode({ mode: "fullscreen" });
				}
			},

			/**
			 * Get initial data from tool output
			 */
			getInitialData() {
				return window.openai?.toolOutput || null;
			},

			/**
			 * Check if running in widget context
			 */
			isWidgetContext() {
				return typeof window.openai !== "undefined";
			},
		},
	};

	// Log initialization for debugging
	if (isWidgetContext) {
		console.log("[ChatGPT Adapter] Initialized in widget context");
		const config = getConfig();
		if (!config.apiUrl) {
			console.warn(
				"[ChatGPT Adapter] apiUrl not yet available in toolResponseMetadata",
			);
		}
		if (!config.token) {
			console.warn(
				"[ChatGPT Adapter] widgetToken not yet available in toolResponseMetadata",
			);
		}
	}
})();
