/**
 * Thrown by skeleton implementations during TDD Red phase.
 * Indicates the function is not yet implemented.
 */
export class NotImplementedError extends Error {
	constructor(fn: string) {
		super(`${fn} not implemented`);
		this.name = "NotImplementedError";
	}
}
