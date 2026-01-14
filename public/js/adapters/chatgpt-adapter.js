/**
 * ChatGPT Widget Platform Adapter
 *
 * Provides the platform abstraction for the prompts widget running in ChatGPT.
 * Implements data fetching via MCP callTool() - ChatGPT handles all auth via OAuth.
 *
 * This adapter is loaded BEFORE the main widget script and sets up window.__PROMPT_PLATFORM__.
 */
(() => {
	// Check if running in widget context - warn early if not
	const isWidgetContext = typeof window.openai !== "undefined";
	if (!isWidgetContext) {
		console.warn(
			"[ChatGPT Adapter] window.openai not found. " +
				"This adapter requires the ChatGPT widget environment.",
		);
	}

	/**
	 * Call an MCP tool via ChatGPT's window.openai.callTool
	 * ChatGPT handles auth automatically via OAuth
	 */
	async function callTool(name, args = {}) {
		if (!window.openai?.callTool) {
			throw new Error("callTool not available. Ensure widget is running in ChatGPT.");
		}

		console.log(`[ChatGPT Adapter] callTool: ${name}`, args);
		const result = await window.openai.callTool(name, args);
		console.log(`[ChatGPT Adapter] callTool result:`, result);
		return result;
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
		 * Data operations via MCP callTool (ChatGPT handles auth)
		 */
		data: {
			/**
			 * List prompts with optional query and tag filters
			 */
			async listPrompts(query, tags) {
				const args = {};
				if (query) args.query = query;
				if (tags?.length) args.tags = tags;
				const result = await callTool("list_prompts", args);
				return result.prompts || [];
			},

			/**
			 * Get a single prompt by slug
			 */
			async getPrompt(slug) {
				const result = await callTool("get_prompt", { slug });
				return result.prompt || result;
			},

			/**
			 * Create one or more prompts
			 */
			async createPrompts(prompts) {
				return callTool("save_prompts", { prompts });
			},

			/**
			 * Update an existing prompt
			 */
			async updatePrompt(slug, data) {
				return callTool("save_prompts", { prompts: [{ ...data, slug }] });
			},

			/**
			 * Delete a prompt
			 */
			async deletePrompt(slug) {
				return callTool("delete_prompt", { slug });
			},

			/**
			 * Update prompt flags (pinned, favorited)
			 */
			async updateFlags(slug, flags) {
				return callTool("update_prompt", { slug, ...flags });
			},

			/**
			 * Track prompt usage - skip for now, not critical
			 */
			async trackUsage(slug) {
				// No-op in widget - usage tracking via MCP not implemented
			},

			/**
			 * List all drafts - disabled (requires Redis)
			 */
			async listDrafts() {
				return [];
			},

			/**
			 * Get draft summary - disabled (requires Redis)
			 */
			async getDraftSummary() {
				return { count: 0, drafts: [] };
			},

			/**
			 * Save a draft - disabled (requires Redis)
			 */
			async saveDraft(id, data) {
				console.warn("[ChatGPT Adapter] Drafts not available in widget");
				return { id };
			},

			/**
			 * Delete a draft - disabled (requires Redis)
			 */
			async deleteDraft(id) {
				console.warn("[ChatGPT Adapter] Drafts not available in widget");
			},

			/**
			 * List all tags
			 */
			async listTags() {
				const result = await callTool("list_tags", {});
				return result.tags || [];
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
			 * @returns {Promise<{mode: string}|undefined>} The granted mode or undefined
			 */
			async requestFullscreen() {
				console.log("[ChatGPT Adapter] Requesting fullscreen mode...");
				console.log("[ChatGPT Adapter] requestDisplayMode available:", !!window.openai?.requestDisplayMode);

				if (window.openai?.requestDisplayMode) {
					try {
						const result = await window.openai.requestDisplayMode({ mode: "fullscreen" });
						console.log("[ChatGPT Adapter] requestDisplayMode result:", result);
						console.log("[ChatGPT Adapter] Current displayMode:", window.openai?.displayMode);
						return result;
					} catch (err) {
						console.error("[ChatGPT Adapter] requestDisplayMode error:", err);
						return { error: err.message };
					}
				} else {
					console.warn("[ChatGPT Adapter] requestDisplayMode not available");
					return { error: "requestDisplayMode not available" };
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
