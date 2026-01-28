/**
 * Database Triggers for LiminalDB
 *
 * This module registers triggers that automatically sync denormalized fields
 * when underlying data changes. Triggers run within the same transaction
 * as the data change, ensuring atomic consistency.
 *
 * IMPORTANT: All mutations that write to tables with triggers MUST use
 * the wrapped mutation from ./functions.ts, not the raw _generated/server.
 *
 * NOTE: The promptTags trigger was removed when tags were moved from
 * junction table to direct storage on prompts.tagNames. The trigger
 * infrastructure is kept for future use.
 */
import type { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";

export const triggers = new Triggers<DataModel>();

// No active triggers. Infrastructure preserved for future use.
