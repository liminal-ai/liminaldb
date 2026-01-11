/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth_apiKey from "../auth/apiKey.js";
import type * as auth_rls from "../auth/rls.js";
import type * as auth_types from "../auth/types.js";
import type * as errors from "../errors.js";
import type * as functions from "../functions.js";
import type * as health from "../health.js";
import type * as healthAuth from "../healthAuth.js";
import type * as migrations_backfillSearchText from "../migrations/backfillSearchText.js";
import type * as migrations_migrationStatus from "../migrations/migrationStatus.js";
import type * as migrations_seedRankingConfig from "../migrations/seedRankingConfig.js";
import type * as model_prompts from "../model/prompts.js";
import type * as model_ranking from "../model/ranking.js";
import type * as model_tags from "../model/tags.js";
import type * as prompts from "../prompts.js";
import type * as triggers from "../triggers.js";
import type * as userPreferences from "../userPreferences.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "auth/apiKey": typeof auth_apiKey;
  "auth/rls": typeof auth_rls;
  "auth/types": typeof auth_types;
  errors: typeof errors;
  functions: typeof functions;
  health: typeof health;
  healthAuth: typeof healthAuth;
  "migrations/backfillSearchText": typeof migrations_backfillSearchText;
  "migrations/migrationStatus": typeof migrations_migrationStatus;
  "migrations/seedRankingConfig": typeof migrations_seedRankingConfig;
  "model/prompts": typeof model_prompts;
  "model/ranking": typeof model_ranking;
  "model/tags": typeof model_tags;
  prompts: typeof prompts;
  triggers: typeof triggers;
  userPreferences: typeof userPreferences;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
