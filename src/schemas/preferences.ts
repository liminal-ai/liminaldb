import { z } from "zod";

/**
 * Cache version for preferences.
 * Bump this when theme IDs change (rename, add, remove) to invalidate stale cache.
 */
export const PREFERENCES_CACHE_VERSION = 1;

/**
 * Valid theme identifiers.
 * Change DEFAULT_THEME to set the default for new users.
 * IMPORTANT: When renaming/adding/removing themes, bump PREFERENCES_CACHE_VERSION.
 */
export const VALID_THEMES = [
	"light-1",
	"light-2",
	"light-3",
	"dark-1",
	"dark-2",
	"dark-3",
] as const;

export const DEFAULT_THEME = "dark-1" satisfies ThemeId;

export const ThemeSchema = z.enum(VALID_THEMES);
export type ThemeId = z.infer<typeof ThemeSchema>;

/**
 * Valid surface identifiers for per-surface theme persistence.
 */
export const VALID_SURFACES = ["webapp", "chatgpt", "vscode"] as const;

export const SurfaceSchema = z.enum(VALID_SURFACES);
export type SurfaceId = z.infer<typeof SurfaceSchema>;

/**
 * GET /api/preferences query params
 */
export const GetPreferencesQuerySchema = z.object({
	surface: SurfaceSchema.optional().default("webapp"),
});

export type GetPreferencesQuery = z.infer<typeof GetPreferencesQuerySchema>;

/**
 * PUT /api/preferences request body
 */
export const UpdatePreferencesRequestSchema = z.object({
	surface: SurfaceSchema,
	theme: ThemeSchema,
});

export type UpdatePreferencesRequest = z.infer<
	typeof UpdatePreferencesRequestSchema
>;

/**
 * GET /api/preferences response
 */
export const PreferencesResponseSchema = z.object({
	theme: ThemeSchema,
});

export type PreferencesResponse = z.infer<typeof PreferencesResponseSchema>;

/**
 * PUT /api/preferences response
 */
export const UpdatePreferencesResponseSchema = z.object({
	updated: z.literal(true),
});

export type UpdatePreferencesResponse = z.infer<
	typeof UpdatePreferencesResponseSchema
>;
