# UI TDD Testing Approach

## Purpose

This document defines how we approach Test-Driven Development (TDD) for React UI components within the Spec-Driven Development (SDD) methodology. It addresses the unique challenges of UI testing and establishes patterns that provide high confidence when tests transition from TDD Red to TDD Green.

**Audience:**
- Developers implementing SDD features
- AI coding agents executing phase prompts
- Reviewers validating test coverage

**Referenced by:** All tech designs for UI features in this project.

---

## Problem Space

### Why React UI Testing is Challenging for TDD

Traditional TDD works well when inputs and outputs are clear: call a function, assert on the return value. React UIs introduce complexity:

| Challenge | Description |
|-----------|-------------|
| **Asynchronous data flow** | Components fetch data, show loading states, then render. Timing varies. |
| **State management layers** | Data flows through hooks → React Query → components. Many seams to test. |
| **DOM as output** | The "output" is a rendered DOM tree, not a return value. |
| **User interaction sequences** | Behavior depends on click → state update → re-render chains. |
| **Third-party components** | TDS (Travelers Design System) components have internal behavior we don't control. |
| **Integration boundaries** | Real confidence requires testing multiple layers together, not just units. |

### The False Confidence Problem

A naive approach creates tests that pass but don't verify the feature works:

```typescript
// BAD: Tests that pass but prove nothing
it('renders without crashing', () => {
  render(<LocationList />)  // ✓ Passes, but what does it prove?
})

it('hook returns expected shape', () => {
  const { result } = renderHook(() => useAddLocationFlow())
  expect(result.current).toHaveProperty('flowState')  // ✓ Passes, but is the logic correct?
})
```

### The Over-Mocking Problem

Mocking too much isolates units but hides integration bugs:

```typescript
// RISKY: Over-mocking hides real bugs
jest.mock('@/hooks/useAddLocationFlow')  // ← Mocking the hook

it('renders list when hook says list', () => {
  (useAddLocationFlow as jest.Mock).mockReturnValue({ flowState: 'list', locations: [] })
  render(<AddLocation />)
  // Passes, but we never tested that the hook actually transitions to 'list' state
})
```

**The danger:** Hook tests pass. Component tests pass. But the component never actually wires to the hook correctly in production.

---

## Our Approach: Layered Confidence

We build confidence by testing at multiple layers, with strategic mock boundaries that preserve integration testing where it matters most.

### The Testing Chain

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 1: API Function Tests                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  Files: fetchLocationsXapi.test.ts, addLocationApi.test.ts          │
│  Mocks: authorizedFetch (HTTP boundary)                             │
│  Verifies: Request shapes, response parsing, error handling         │
│  Speed: Fast                                                        │
└─────────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 2: Hook Tests (pure logic hooks only)                        │
│  ─────────────────────────────────────────────────────────────────  │
│  Files: useLocationSelection.test.ts, useLocationForm.test.ts       │
│  Mocks: None (pure logic) or API functions (for data hooks)         │
│  Verifies: State machine transitions, selection logic, validation   │
│  Speed: Fast                                                        │
└─────────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 3: Component Tests                                           │
│  ─────────────────────────────────────────────────────────────────  │
│  Files: LocationList.test.tsx, LocationForm.test.tsx                │
│  Mocks: API functions, useQueryParams (config injection)            │
│  Real: Components, hooks, React Query, state transitions            │
│  Verifies: Props → render, user interactions → callbacks            │
│  Speed: Medium                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 4: Page Tests                                                │
│  ─────────────────────────────────────────────────────────────────  │
│  Files: AddLocation.test.tsx                                        │
│  Mocks: API functions, useQueryParams                               │
│  Real: Full page, all hooks, React Query, routing, redirects        │
│  Verifies: Entry points, exit points, critical user flows           │
│  Speed: Slower                                                      │
└─────────────────────────────────────────────────────────────────────┘
                              +
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 5: Manual Verification                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  Tool: launcher.html + MSW dev server                               │
│  Mocks: MSW handlers (realistic API simulation)                     │
│  Verifies: Full visual/UX, edge cases, real browser behavior        │
│  Speed: Manual                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### The Critical Mocking Rule

**Mock at the API function level, never at the hook level.**

```typescript
// ✅ CORRECT: Mock the API function
jest.mock('@/api/addLocationApi', () => ({
  getAccountLocations: jest.fn(() => Promise.resolve(mockLocationsV2)),
}))
// This allows: Component → Hook → React Query → API function (mocked) → Response
// React Query runs. Hooks run. State transitions happen. Integration is tested.

// ❌ WRONG: Mock the hook
jest.mock('@/hooks/useAddLocationFlow')
// This hides: Does the component wire to the hook correctly?
// Does React Query behave as expected? Does the hook's state machine work?
```

**Exception:** `useQueryParams` can be mocked because it's a configuration/utility hook that injects URL parameters. It doesn't participate in data flow.

```typescript
// ✅ OK: Mock utility hooks for test scenario configuration
jest.mock('@/hooks/useQueryParams', () => ({
  useQueryParams: jest.fn(),
}))

// Use it to simulate different URL parameters:
(useQueryParams as jest.Mock).mockReturnValue({
  queryParams: { sai: '9337M4132', redirectUrl: 'http://example.com' },
  error: null,
})
```

---

## Traceability: Feature TCs → Test Cases

### The Mapping Structure

Every Test Condition (TC) from the feature spec maps to one or more test cases:

```
Feature Spec                    Tech Design                      Test File
─────────────                   ───────────                      ─────────
TC-07: API returns             TC-07 → Hook test                useAddLocationFlow.test.ts:
locations → List state         "transitions to list"            it('TC-07: transitions to list
                                                                   when API returns locations')
```

### TC-to-Test Mapping Table Format

Tech designs include mapping tables that specify:

| TC | Layer | Test File | Test Description | Key Assertions |
|----|-------|-----------|------------------|----------------|
| TC-07 | Hook | `useAddLocationFlow.test.ts` | Transitions to list when API returns locations | `flowState === 'list'`, `locations.length > 0` |
| TC-08 | Hook | `useAddLocationFlow.test.ts` | Transitions to empty when API returns [] | `flowState === 'empty'`, `locations.length === 0` |
| TC-11 | Component | `LocationList.test.tsx` | Renders correct columns | `getByTestId('column-address')`, `getByTestId('column-city')` |

### TC Naming Convention in Tests

Test names include the TC number for traceability:

```typescript
describe('useAddLocationFlow', () => {
  it('TC-07: transitions to list state when API returns locations', async () => {
    // ...
  })

  it('TC-08: transitions to empty state when API returns no locations', async () => {
    // ...
  })
})
```

---

## Test Framework and Patterns

### Framework Stack

| Tool | Purpose |
|------|---------|
| **Jest** | Test runner, assertions, mocking |
| **React Testing Library (RTL)** | Component rendering, DOM queries |
| **@testing-library/user-event** | Realistic user interaction simulation |
| **@tanstack/react-query** | Runs in tests (not mocked) |

### Standard Test Setup

```typescript
import '@testing-library/jest-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create fresh QueryClient per test to avoid cache pollution
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false },
  },
})

const renderWithProviders = (ui: React.ReactElement) => {
  const queryClient = createTestQueryClient()
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}
```

> **Note on existing code:** Some existing tests use a shared `QueryClient` across tests in a file. This can cause flaky tests due to cache pollution. New tests should use `createTestQueryClient()` per test as shown above. Refactoring existing tests is a future improvement.

### Selector Strategy: data-testid Over Text

Prefer `data-testid` attributes over text matching:

```typescript
// ✅ STABLE: Uses test ID
expect(screen.getByTestId('add-to-policy-button')).toBeDisabled()

// ⚠️ BRITTLE: Breaks if label changes
expect(screen.getByText('Add to Policy')).toBeDisabled()

// ⚠️ FRAGILE: TDS components may change internal structure
expect(screen.getByRole('button', { name: 'Add to Policy' })).toBeDisabled()
```

Add `data-testid` attributes to components during implementation:

```tsx
<TdsButton data-testid="add-to-policy-button" onClick={handleAddToPolicy}>
  Add to Policy
</TdsButton>
```

### Async Testing Patterns

Always use `waitFor` for async operations:

```typescript
it('TC-07: transitions to list state when API returns locations', async () => {
  mockGetAccountLocations.mockResolvedValue(mockLocationsV2)

  renderWithProviders(<AddLocation />)

  // Wait for loading to complete and list to appear
  await waitFor(() => {
    expect(screen.getByTestId('location-list')).toBeInTheDocument()
  })

  expect(screen.getByTestId('location-row-0')).toBeInTheDocument()
})
```

### Loading State Testing Pattern

Test both the loading state AND the transition to the loaded state:

```typescript
it('TC-06: shows loading state then transitions to list', async () => {
  // Delay the mock to ensure loading state is visible
  mockGetAccountLocations.mockImplementation(
    () => new Promise(resolve => setTimeout(() => resolve(mockLocationsV2), 100))
  )

  renderWithProviders(<AddLocation />)

  // Assert loading state appears first
  expect(screen.getByTestId('loading-indicator')).toBeInTheDocument()
  expect(screen.getByText('Gathering locations/buildings associated with the account')).toBeInTheDocument()

  // Wait for transition to loaded state
  await waitFor(() => {
    expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument()
  })

  // Assert final state
  expect(screen.getByTestId('location-list')).toBeInTheDocument()
})
```

**Why this matters:** Users see loading states. If AC says "user sees loading message," the test should verify it appears, not just that the final state renders.

### Error State Testing Pattern

Test error handling for API failures:

```typescript
it('TC-09: displays error message when API fails', async () => {
  mockGetAccountLocations.mockRejectedValue(new Error('Network error'))

  renderWithProviders(<AddLocation />)

  await waitFor(() => {
    expect(screen.getByTestId('error-message')).toBeInTheDocument()
  })

  expect(screen.getByText(/unable to load locations/i)).toBeInTheDocument()
})

it('TC-09a: displays API error message from response', async () => {
  mockGetAccountLocations.mockResolvedValue({
    status: 'ERROR',
    messages: [{ message: 'Account not found' }],
  })

  renderWithProviders(<AddLocation />)

  await waitFor(() => {
    expect(screen.getByText('Account not found')).toBeInTheDocument()
  })
})
```

**Test different error types:**

| Error Type | How to Mock | What to Assert |
|------------|-------------|----------------|
| Network error | `mockRejectedValue(new Error(...))` | Generic error message shown |
| API validation error | `mockResolvedValue({ status: 'ERROR', messages: [...] })` | Specific message shown |
| 500 server error | `mockRejectedValue({ response: { status: 500 } })` | Retry option shown |

### Mutation Testing Pattern

Test user actions that modify data (form submissions, selections):

```typescript
it('TC-77: submitting form calls API with correct data', async () => {
  mockSubmitLocation.mockResolvedValue({ locRefId: 'new-loc-123', locRefVerNbr: 1 })

  renderWithProviders(<LocationForm address={mockSelectedAddress} onSubmit={jest.fn()} />)

  // Fill in additional fields
  await userEvent.type(screen.getByTestId('description-input'), 'Main office')
  await userEvent.click(screen.getByTestId('submit-button'))

  // Assert API called with correct shape
  expect(mockSubmitLocation).toHaveBeenCalledWith(
    expect.objectContaining({
      address: expect.objectContaining({
        addressLine1: '516 Maple Avenue',
        city: 'Litchfield',
      }),
      description: 'Main office',
    })
  )
})

it('TC-70: shows error and stays on form when submission fails', async () => {
  mockSubmitLocation.mockRejectedValue(new Error('Submission failed'))

  renderWithProviders(<LocationForm address={mockSelectedAddress} onSubmit={jest.fn()} />)

  await userEvent.click(screen.getByTestId('submit-button'))

  await waitFor(() => {
    expect(screen.getByTestId('submission-error')).toBeInTheDocument()
  })

  // Form should still be visible (not redirected)
  expect(screen.getByTestId('location-form')).toBeInTheDocument()
})

it('TC-78: successful submission triggers redirect', async () => {
  const mockOnSuccess = jest.fn()
  mockSubmitLocation.mockResolvedValue({ locRefId: 'new-loc-123', locRefVerNbr: 1 })

  renderWithProviders(<LocationForm address={mockSelectedAddress} onSuccess={mockOnSuccess} />)

  await userEvent.click(screen.getByTestId('submit-button'))

  await waitFor(() => {
    expect(mockOnSuccess).toHaveBeenCalledWith(
      expect.objectContaining({ locRefId: 'new-loc-123' })
    )
  })
})
```

**Mutation test checklist:**
1. Assert API called with correct arguments
2. Assert success state (redirect, callback, UI update)
3. Assert error state (error message, form persists)
4. Assert loading state during submission (button disabled, spinner)

### Redirect Testing Pattern

Mock `window.location` for redirect assertions:

```typescript
// In test setup or __test-utils__/mockRedirect.ts
const mockLocationAssign = jest.fn()
const originalLocation = window.location

beforeEach(() => {
  delete (window as any).location
  window.location = { ...originalLocation, assign: mockLocationAssign }
})

afterEach(() => {
  window.location = originalLocation
  mockLocationAssign.mockClear()
})

// In test
it('TC-79: Add to Policy redirects with base64 data', async () => {
  // ... setup and interactions

  await userEvent.click(screen.getByTestId('add-to-policy-button'))

  expect(mockLocationAssign).toHaveBeenCalledWith(
    expect.stringMatching(/^http:\/\/example\.com\?data=/)
  )
})
```

---

## Shared Fixtures

### Location and Structure

```
src/
├── __fixtures__/           # Shared mock data
│   ├── locations.ts        # LocationV2 mock data
│   ├── typeahead.ts        # Typeahead response data
│   └── index.ts            # Re-exports all fixtures
├── __test-utils__/         # Shared test utilities
│   ├── renderWithProviders.tsx
│   ├── mockRedirect.ts
│   └── index.ts
```

### Fixture Design: Factory + Static Instances

Provide both factory functions and pre-built instances:

```typescript
// src/__fixtures__/locations.ts
import { LocationV2 } from '@/types/AddLocation'

// Factory for custom scenarios
export const createLocationV2 = (overrides: Partial<LocationV2> = {}): LocationV2 => ({
  locRefId: 'test-loc-id',
  locRefVerNbr: 1,
  locRefDate: '2025-01-15',
  locationNumber: 'LOC-001',
  description: 'Test Location',
  occupancy: 'Office',
  address: {
    addressLine1: '123 Test Street',
    city: 'Hartford',
    stateCd: 'CT',
    postalCd: '06101',
    country: 'United States',
    latitude: '41.7658',
    longitude: '-72.6734',
    ...overrides.address,
  },
  ...overrides,
})

// Pre-built instances for common scenarios (realistic data from wireframes)
export const mockLocationsV2: LocationV2[] = [
  createLocationV2({
    locRefId: '69033210-d339-4cd4-a976-ed313cf70a75',
    locationNumber: 'LOC-001',
    description: 'Main warehouse',
    occupancy: 'Primary Mailing Address',
    address: {
      addressLine1: '516 Maple Avenue',
      city: 'Litchfield',
      stateCd: 'CT',
      postalCd: '06759',
      country: 'United States',
      latitude: '41.456',
      longitude: '-73.123',
    },
  }),
  createLocationV2({
    locRefId: '7a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d',
    locationNumber: 'LOC-002',
    description: 'Distribution center',
    occupancy: 'Warehouse',
    address: {
      addressLine1: '125 York Street',
      city: 'Hartford',
      stateCd: 'CT',
      postalCd: '06101',
      country: 'United States',
      latitude: '41.7658',
      longitude: '-72.6734',
    },
  }),
]

export const mockEmptyAccount: LocationV2[] = []
```

### Fixture Realism

Fixtures should use realistic data that matches wireframes and production scenarios:

| Field | Realistic Value | Not Realistic |
|-------|-----------------|---------------|
| locRefId | `'69033210-d339-4cd4-a976-ed313cf70a75'` | `'1'`, `'test'` |
| address | `'516 Maple Avenue, Litchfield, CT'` | `'123 Fake St'` |
| coordinates | `'41.456'`, `'-73.123'` | `'0'`, `'999'` |

Realistic data catches edge cases that synthetic data misses (string parsing, coordinate formats, etc.).

---

## TDD Red/Green Flow

### Skeleton Phase

Creates stubs that throw `NotImplementedError`:

```typescript
// src/errors.ts
export class NotImplementedError extends Error {
  constructor(methodName: string) {
    super(`${methodName} is not yet implemented`)
    this.name = 'NotImplementedError'
  }
}

// src/hooks/useAddLocationFlow.ts (skeleton)
export const useAddLocationFlow = (sai: string) => {
  throw new NotImplementedError('useAddLocationFlow')
}
```

### TDD Red Phase

Tests assert **real expected behavior**, not that errors are thrown:

```typescript
// ✅ CORRECT: Asserts actual expected behavior
it('TC-07: transitions to list state when API returns locations', async () => {
  mockGetAccountLocations.mockResolvedValue(mockLocationsV2)

  const { result } = renderHook(() => useAddLocationFlow('9337M4132'))

  await waitFor(() => {
    expect(result.current.flowState).toBe('list')
    expect(result.current.locations).toHaveLength(2)
    expect(result.current.origin).toBe('list')
  })
})

// ❌ WRONG: Asserts that error is thrown (useless test)
it('TC-07: throws not implemented', () => {
  expect(() => useAddLocationFlow('9337M4132')).toThrow(NotImplementedError)
  // This test passes BEFORE and AFTER implementation - proves nothing
})
```

**Expected TDD Red state:** Tests ERROR (throw NotImplementedError during execution), not FAIL (assertion mismatch).

```
FAIL  src/hooks/useAddLocationFlow.test.ts
  ● useAddLocationFlow › TC-07: transitions to list state

    NotImplementedError: useAddLocationFlow is not yet implemented

      at useAddLocationFlow (src/hooks/useAddLocationFlow.ts:5:9)
```

### TDD Green Phase

Implement logic to make tests pass. No test changes allowed.

```
PASS  src/hooks/useAddLocationFlow.test.ts
  ✓ TC-07: transitions to list state when API returns locations (45ms)
  ✓ TC-08: transitions to empty state when API returns no locations (32ms)
```

---

## Convergence with Existing Patterns

This approach aligns with the existing `/location` (v1) test patterns established by the previous Location UI team.

### Pattern Alignment

| Pattern | Existing v1 Tests | Our Approach | Aligned? |
|---------|-------------------|--------------|----------|
| Mock API functions | `jest.mock('@/api/fetchLocationsXapi')` | Same | ✅ |
| Mock useQueryParams | `jest.mock('@/hooks/useQueryParams')` | Same | ✅ |
| Don't mock data hooks | React Query runs in tests | Same | ✅ |
| Inline mock data | Defined at top of test file | Use `__fixtures__/` | Enhanced |
| React Query provider | Wrapped in tests | Same | ✅ |
| RTL for rendering | `render`, `screen`, `waitFor` | Same | ✅ |

### What We Add (Enhancements)

| Enhancement | Benefit |
|-------------|---------|
| Shared fixtures in `__fixtures__/` | Consistent, realistic data across tests |
| `data-testid` preference | More stable selectors |
| TC-prefixed test names | Traceability to requirements |
| Factory + static fixture pattern | Flexible test data creation |
| Standardized redirect mocking | Consistent redirect testing |

### What We Don't Change

- Existing v1 tests remain untouched
- Same Jest configuration
- Same RTL patterns
- Same React Query integration approach

---

## Confidence Assessment

When all tests pass (TDD Green), we have confidence in:

| What Passes | What's Verified | Confidence In |
|-------------|-----------------|---------------|
| API function tests | Request/response contracts | API integration will work |
| Hook tests | State machine logic | Business logic is correct |
| Component tests | Props → UI rendering, user interactions | UI behaves correctly |
| Page tests | Entry, exit, routing, redirects | End-to-end flow works |
| Manual verification | Visual, UX, edge cases | Production readiness |

**The key insight:** By mocking at the API function level (not the hook level), component and page tests exercise the full chain: Component → Hook → React Query → (mocked) API function → Response → State update → Re-render.

This catches integration bugs that isolated unit tests miss, without the complexity of end-to-end browser testing.

---

## Quick Reference

### When to Use Each Test Layer

| Test When... | Use Layer |
|--------------|-----------|
| Testing pure logic (validation, transformation) | Hook test |
| Testing API request/response shapes | API function test |
| Testing component renders correctly from props | Component test |
| Testing user interaction → callback | Component test |
| Testing URL params → behavior | Page test |
| Testing redirect behavior | Page test |
| Testing full user flow | Page test + Manual |

### Mocking Decision Tree

```
Is it an API function? → Mock it
Is it useQueryParams? → Mock it (config injection)
Is it a data-fetching hook? → DON'T mock it
Is it React Query? → DON'T mock it
Is it a UI component? → Usually don't mock (unless complex modal)
```

### Test File Naming

```
src/
├── pages/
│   └── add-location/
│       ├── AddLocation.tsx
│       └── AddLocation.test.tsx      # Co-located page test
├── components/
│   └── LocationList/
│       ├── LocationList.tsx
│       └── LocationList.test.tsx     # Co-located component test
├── hooks/
│   ├── useAddLocationFlow.ts
│   └── useAddLocationFlow.test.ts    # Co-located hook test
└── api/
    ├── addLocationApi.ts
    └── addLocationApi.test.ts        # Co-located API test
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.1 | 2025-01-15 | Added loading state, error state, and mutation testing patterns; added QueryClient note |
| 1.0 | 2025-01-15 | Initial document |
