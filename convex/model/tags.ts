import { NotImplementedError } from "../errors";
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Find existing tag or create new one.
 * Returns tag ID.
 */
export async function findOrCreateTag(
	_ctx: MutationCtx,
	_userId: string,
	_name: string,
): Promise<Id<"tags">> {
	throw new NotImplementedError("findOrCreateTag");
}
