export class NotImplementedError extends Error {
	constructor(fn: string) {
		super(`${fn} not implemented`);
		this.name = "NotImplementedError";
	}
}
