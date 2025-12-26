import { mock } from "bun:test";
import type { Id } from "../../convex/_generated/dataModel";

type TableName = "users" | "tags" | "promptTags" | "prompts";

interface MockDoc {
	_id: string;
	[key: string]: unknown;
}

interface MockQueryBuilder {
	withIndex: ReturnType<typeof mock>;
	filter: ReturnType<typeof mock>;
	unique: ReturnType<typeof mock>;
	collect: ReturnType<typeof mock>;
	first: ReturnType<typeof mock>;
}

export interface MockDb {
	query: ReturnType<typeof mock>;
	insert: ReturnType<typeof mock>;
	get: ReturnType<typeof mock>;
	patch: ReturnType<typeof mock>;
	delete: ReturnType<typeof mock>;
}

export interface MockCtx {
	db: MockDb;
}

/**
 * Create a chainable query builder mock.
 */
function createQueryBuilder(): MockQueryBuilder {
	const builder: MockQueryBuilder = {
		withIndex: mock(() => builder),
		filter: mock(() => builder),
		unique: mock(() => Promise.resolve(null)),
		collect: mock(() => Promise.resolve([])),
		first: mock(() => Promise.resolve(null)),
	};
	return builder;
}

/**
 * Create a mock Convex context for testing.
 */
export function createMockCtx(): MockCtx {
	const queryBuilders = new Map<TableName, MockQueryBuilder>();

	const db: MockDb = {
		query: mock((table: TableName) => {
			if (!queryBuilders.has(table)) {
				queryBuilders.set(table, createQueryBuilder());
			}
			return queryBuilders.get(table)!;
		}),
		insert: mock(() => Promise.resolve("mock_id" as Id<"prompts">)),
		get: mock(() => Promise.resolve(null)),
		patch: mock(() => Promise.resolve()),
		delete: mock(() => Promise.resolve()),
	};

	return { db };
}

/**
 * Get the query builder for a table to configure mocks.
 */
export function getQueryBuilder(
	ctx: MockCtx,
	table: TableName,
): MockQueryBuilder {
	return ctx.db.query(table) as unknown as MockQueryBuilder;
}

/**
 * Helper to configure sequential return values for a mock.
 * Useful for batch operations where the same query is called multiple times.
 */
export function mockSequentialReturns<T>(
	mockFn: ReturnType<typeof mock>,
	values: T[],
): void {
	let callIndex = 0;
	mockFn.mockImplementation(() => {
		const value = values[callIndex] ?? values[values.length - 1];
		callIndex++;
		return Promise.resolve(value);
	});
}

/**
 * Helper to set up mock returns for insert, tracking IDs.
 */
export function mockInsertSequence(ctx: MockCtx, ids: string[]): void {
	mockSequentialReturns(
		ctx.db.insert,
		ids.map((id) => id as Id<"prompts">),
	);
}
