import { vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";

type TableName = "users" | "tags" | "promptTags" | "prompts";

interface MockQueryBuilder {
	withIndex: ReturnType<typeof vi.fn>;
	filter: ReturnType<typeof vi.fn>;
	unique: ReturnType<typeof vi.fn>;
	collect: ReturnType<typeof vi.fn>;
	first: ReturnType<typeof vi.fn>;
}

export interface MockDb {
	query: ReturnType<typeof vi.fn> & ((table: TableName) => MockQueryBuilder);
	insert: ReturnType<typeof vi.fn>;
	get: ReturnType<typeof vi.fn>;
	patch: ReturnType<typeof vi.fn>;
	delete: ReturnType<typeof vi.fn>;
}

export interface MockCtx {
	db: MockDb;
}

/**
 * Create a chainable query builder mock.
 */
function createQueryBuilder(): MockQueryBuilder {
	const builder: MockQueryBuilder = {
		withIndex: vi.fn(() => builder),
		filter: vi.fn(() => builder),
		unique: vi.fn(() => Promise.resolve(null)),
		collect: vi.fn(() => Promise.resolve([])),
		first: vi.fn(() => Promise.resolve(null)),
	};
	return builder;
}

/**
 * Create a mock Convex context for testing.
 */
export function createMockCtx(): MockCtx {
	const queryBuilders = new Map<TableName, MockQueryBuilder>();

	const db: MockDb = {
		query: vi.fn((table: TableName) => {
			if (!queryBuilders.has(table)) {
				queryBuilders.set(table, createQueryBuilder());
			}
			return queryBuilders.get(table)!;
		}),
		insert: vi.fn(() => Promise.resolve("mock_id" as Id<"prompts">)),
		get: vi.fn(() => Promise.resolve(null)),
		patch: vi.fn(() => Promise.resolve()),
		delete: vi.fn(() => Promise.resolve()),
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
	mockFn: ReturnType<typeof vi.fn>,
	values: T[],
): void {
	if (values.length === 0) {
		throw new Error("mockSequentialReturns requires at least one value");
	}
	let callIndex = 0;
	mockFn.mockImplementation(() => {
		const value = values[callIndex] ?? values[values.length - 1];
		callIndex++;
		return Promise.resolve(value);
	});
}

type AnyTableName = "users" | "tags" | "promptTags" | "prompts";

/**
 * Helper to set up mock returns for insert, tracking IDs.
 * Use generic type parameter to specify the table type for type-safe IDs.
 */
export function mockInsertSequence<T extends AnyTableName = "prompts">(
	ctx: MockCtx,
	ids: string[],
): void {
	mockSequentialReturns(
		ctx.db.insert,
		ids.map((id) => id as Id<T>),
	);
}
