/**
 * Mock Convex database context for unit testing model functions.
 * Provides chainable query builders and database operation mocks.
 */

import { vi } from "vitest";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Supported table names for the mock database.
 */
type TableName = "users" | "tags" | "promptTags" | "prompts";

/**
 * Type alias for vitest mock functions.
 * Using ReturnType<typeof vi.fn> ensures compatibility with vitest's mock API.
 */
type MockFn = ReturnType<typeof vi.fn>;

interface MockQueryBuilder {
	withIndex: MockFn;
	withSearchIndex: MockFn;
	filter: MockFn;
	unique: MockFn;
	collect: MockFn;
	take: MockFn;
	first: MockFn;
}

export interface MockDb {
	query: MockFn & ((table: TableName) => MockQueryBuilder);
	insert: MockFn;
	get: MockFn;
	patch: MockFn;
	delete: MockFn;
}

export interface MockCtx {
	db: MockDb;
}

/**
 * Type assertion helper to cast MockCtx to the expected Convex context type.
 * This function encapsulates the type assertion needed to use mock contexts
 * with Convex model functions that expect MutationCtx or QueryCtx.
 *
 * @example
 * // For mutation functions
 * const result = await insertMany(asConvexCtx<MutationCtx>(ctx), userId, input);
 *
 * // For query functions
 * const result = await getBySlug(asConvexCtx<QueryCtx>(ctx), userId, slug);
 */
export function asConvexCtx<T>(mock: MockCtx): T {
	return mock as unknown as T;
}

/**
 * Create a chainable query builder mock.
 */
function createQueryBuilder(): MockQueryBuilder {
	const builder: MockQueryBuilder = {
		withIndex: vi.fn(() => builder),
		withSearchIndex: vi.fn(() => builder),
		filter: vi.fn(() => builder),
		unique: vi.fn(() => Promise.resolve(null)),
		collect: vi.fn(() => Promise.resolve([])),
		take: vi.fn(() => Promise.resolve([])),
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
			const existing = queryBuilders.get(table);
			if (existing) {
				return existing;
			}
			const created = createQueryBuilder();
			queryBuilders.set(table, created);
			return created;
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
export function mockSequentialReturns<T>(mockFn: MockFn, values: T[]): void {
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
