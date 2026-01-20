# How to Write SDD Stories

**Purpose:** This guide explains how to write functional stories for Spec-Driven Development (SDD) that are optimized for AI-assisted implementation using Claude Code or GitHub Copilot.

**Derived from:** Story 0, Story 1, and Story 2 of the Add Location Flow feature (SDD-001).

---

## Table of Contents

1. [What is an SDD Story?](#what-is-an-sdd-story)
2. [Story Types](#story-types)
3. [The Input Documents](#the-input-documents)
4. [Story Derivation Process](#story-derivation-process)
5. [Story Folder Structure](#story-folder-structure)
6. [Writing the Story Overview](#writing-the-story-overview-storymd)
7. [Writing the Skeleton-Red Prompt](#writing-the-skeleton-red-prompt)
8. [Writing the Green Prompt](#writing-the-green-prompt)
9. [Writing the Verify Prompt](#writing-the-verify-prompt)
10. [Test Utilities Reference](#test-utilities-reference)
11. [Mock Patterns](#mock-patterns)
12. [TDS Component Testing](#tds-component-testing)
13. [Modifying Existing Files](#modifying-existing-files)
14. [Key Principles](#key-principles)
15. [Do's and Don'ts](#dos-and-donts)
16. [Worked Example: Deriving Story 2](#worked-example-deriving-story-2)
17. [Checklist for Story Authors](#checklist-for-story-authors)

---

## What is an SDD Story?

An SDD Story is a **self-contained unit of work** that:
- Delivers testable user-facing functionality (or foundational infrastructure)
- Maps directly to Acceptance Criteria (ACs) and Test Conditions (TCs) from the feature spec
- Can be executed by an AI agent without prior conversation context
- Follows the TDD Red → Green cycle with explicit verification gates

**The confidence chain:**
```
AC (requirement) → TC (testable condition) → Test (code) → Implementation (code) → Verification (proof)
```

Stories are the **execution layer** that translates feature specs and tech designs into working code.

---

## Story Types

There are two distinct story types with different structures:

### Infrastructure Story (Story 0)

**Purpose:** Sets up shared infrastructure before feature stories begin.

**When to create:**
- First story of a new feature
- When you need types, fixtures, test utilities, or error classes that multiple stories will use
- When you need to archive/rename existing files to make way for new implementation

**Structure:**
```
story-0-infrastructure/
├── story.md
├── prompt-0.1-setup.md      # Creates all infrastructure files
└── prompt-0.R-verify.md     # Verifies setup is complete
```

**Note:** No skeleton-red/green phases. Infrastructure stories create supporting code, not tested feature code.

**Typical deliverables:**
- `src/errors.ts` — `NotImplementedError` class for stubs
- `src/types/{Feature}Types.ts` — TypeScript interfaces
- `src/__fixtures__/*.ts` — Mock data for tests
- `src/__test-utils__/*.ts` — Test helper functions
- Archive/rename legacy files

### Feature Story (Story 1+)

**Purpose:** Delivers user-facing functionality with TDD.

**When to create:**
- Each logical unit of user-facing functionality
- Maps to one or more "chunks" from the tech design

**Structure:**
```
story-N-{description}/
├── story.md
├── prompt-N.1-skeleton-red.md   # Creates stubs + writes tests
├── prompt-N.2-green.md          # Implements to make tests pass
└── prompt-N.R-verify.md         # Verifies story is complete
```

---

## The Input Documents

Stories are derived from three source documents. Understanding what each provides is critical.

### Feature Spec (`01-*.feature.md`)

**What it contains:**
- Acceptance Criteria (ACs) — Requirements in user terms
- Test Conditions (TCs) — Testable assertions for each AC
- Data contracts — Types, API shapes
- Scope boundaries — What's in/out

**How to use it:**
- ACs define WHAT the story delivers
- TCs become your test cases
- Use AC/TC numbers in story documentation for traceability

### Tech Design (`02-*.tech-design.md`)

**What it contains:**
- Architecture decisions
- Module breakdown with AC ownership
- Sequence diagrams per flow
- Interface definitions (types, props, function signatures)
- **Chunks** — Logical groupings of work that map to stories

**How to use it:**
- Chunks become stories (roughly 1:1)
- Interface definitions go in skeleton stubs
- Sequence diagrams inform implementation flow

**Critical insight:** The tech design's "chunks" are your story boundaries. Look for sections like "Chunk 1: Display Account Locations" — that becomes Story 1.

### Test Plan (`03-*.test-plan.md`)

**What it contains:**
- Fixture definitions with complete code
- Test utility implementations
- **Complete test implementations for every TC**
- TC-to-test-file mapping

**How to use it:**
- **Copy test code directly** — Don't write tests from scratch
- Copy fixture definitions for Story 0
- Copy test utility implementations for Story 0
- Reference TC numbers to find the test code you need

**Critical insight:** The test plan is not just documentation — it contains copy-paste ready test code. Your skeleton-red prompts should pull tests directly from this document.

---

## Story Derivation Process

Follow these steps to derive a story from the source documents:

### Step 1: Identify the Chunk

Look in the tech design for chunk definitions:
```markdown
## Chunk 2: Select and Return to Guidewire

**Scope:** Filtering, selection, return data encoding
**ACs:** AC-17 to AC-26, AC-71, AC-73 to AC-78
**Phases:** 2.1 Skeleton + Red, 2.2 Green
```

This chunk becomes Story 2.

### Step 2: List the TCs

From the feature spec, gather all TCs for the ACs in scope:
- AC-17 (filtering) → TC-17 to TC-21
- AC-20 to AC-23 (selection) → TC-22 to TC-27
- AC-71, AC-73-78 (return) → TC-79, TC-81 to TC-87

### Step 3: Pull Tests from Test Plan

For each TC, find the test implementation in the test plan:

```markdown
## Test Plan Section: TC-17 to TC-21

### `src/components/LocationList/LocationList.test.tsx`

```typescript
it('TC-17: filter is case-insensitive', async () => {
  renderLocationList();
  const filterInput = screen.getByTestId('filter-input');
  await userEvent.type(filterInput, 'MAPLE');
  expect(screen.getByText('516 Maple Avenue')).toBeInTheDocument();
  expect(screen.queryByText('125 York Street')).not.toBeInTheDocument();
});
```

Copy this test code into your skeleton-red prompt.

### Step 4: Identify Files to Create/Modify

From the tech design chunk:
- **New files:** Listed in "Skeleton Requirements"
- **Modified files:** Existing files that need new functionality

For Story 2:
- **New:** `src/hooks/useLocationSelection.ts`
- **Modified:** `src/components/LocationList/LocationList.tsx`, `src/pages/add-location/AddLocation.tsx`

### Step 5: Count Tests

Tally the tests per file:
- `useLocationSelection.test.ts`: 6 tests (new file)
- `LocationList.test.tsx`: 10 additional tests (modified file)
- `AddLocation.test.tsx`: 9 additional tests (modified file)
- **Total new tests:** 25

**Running total:** Story 1 had 26 tests. After Story 2: 26 + 25 = 51 tests.

### Step 6: Write the Story Documents

Now you have everything needed to write:
1. `story.md` — Overview with AC list and test counts
2. `prompt-N.1-skeleton-red.md` — Stubs + copied tests
3. `prompt-N.2-green.md` — Implementation guidance
4. `prompt-N.R-verify.md` — Verification checklist

---

## Story Folder Structure

```
sdd-features/
└── 001-{feature-name}/
    ├── 01-{feature}.feature.md      # Feature spec
    ├── 02-{feature}.tech-design.md  # Tech design
    ├── 03-{feature}.test-plan.md    # Test plan
    └── stories/
        ├── story-0-infrastructure/
        │   ├── story.md
        │   ├── prompt-0.1-setup.md
        │   └── prompt-0.R-verify.md
        ├── story-1-{description}/
        │   ├── story.md
        │   ├── prompt-1.1-skeleton-red.md
        │   ├── prompt-1.2-green.md
        │   └── prompt-1.R-verify.md
        └── story-2-{description}/
            ├── story.md
            ├── prompt-2.1-skeleton-red.md
            ├── prompt-2.2-green.md
            └── prompt-2.R-verify.md
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Story folder | `story-{N}-{short-description}` | `story-2-select-and-return` |
| Story overview | `story.md` | Always this name |
| Skeleton+Red prompt | `prompt-{N}.1-skeleton-red.md` | `prompt-2.1-skeleton-red.md` |
| Green prompt | `prompt-{N}.2-green.md` | `prompt-2.2-green.md` |
| Verify prompt | `prompt-{N}.R-verify.md` | `prompt-2.R-verify.md` |

---

## Writing the Story Overview (story.md)

The `story.md` file provides context and tracks completion criteria.

### Template

```markdown
# Story {N}: {Title}

**Feature:** {Feature Name} ({Feature ID})

**Working Directory:** `/absolute/path/to/project/frontend`

**Reference Documents:**
- Feature Spec: `docs/pre-26A-planning/sdd-features/{feature}/01-*.feature.md`
- Tech Design: `docs/pre-26A-planning/sdd-features/{feature}/02-*.tech-design.md`
- Test Plan: `docs/pre-26A-planning/sdd-features/{feature}/03-*.test-plan.md`

## User Story

**As a** {persona},
**I want** {capability},
**So that** {benefit}.

---

## Context

{2-3 paragraphs explaining:}
- What this story builds on (which previous stories must be complete)
- What user-facing functionality it delivers
- Key architectural decisions for this story
- What the user can do after this story ships

---

## Acceptance Criteria

{Copy the relevant ACs from feature spec, summarized}

- [ ] {AC summary 1}
- [ ] {AC summary 2}

**Related ACs:** AC-{X} to AC-{Y}

---

## Dependencies

- **Story {N-1} must be complete** — {what it provides that this story needs}

---

## Deliverables

**New files:**
- `src/path/to/NewFile.ts`
- `src/path/to/NewFile.test.ts`

**Modified files:**
- `src/path/to/ExistingFile.tsx` (add {functionality})
- `src/path/to/ExistingFile.test.tsx` (add {N} tests)

---

## Prompts

| # | Prompt | Purpose |
|---|--------|---------|
| {N}.1 | [prompt-{N}.1-skeleton-red.md](./prompt-{N}.1-skeleton-red.md) | Create stubs, write tests (TDD Red) |
| {N}.2 | [prompt-{N}.2-green.md](./prompt-{N}.2-green.md) | Implement to make tests pass (TDD Green) |
| {N}.R | [prompt-{N}.R-verify.md](./prompt-{N}.R-verify.md) | Verify story is complete |

---

## Definition of Done

**After Prompt {N}.1 (Skeleton + TDD Red):**
- All stub files created
- All {X} tests written asserting real behavior
- Tests ERROR (not fail) because stubs throw `NotImplementedError`
- TypeScript compiles
- Story {N-1} tests still PASS

**Test Breakdown for Story {N}:**
- `{file1}.test.tsx`: {X} tests ({TC-A to TC-B})
- `{file2}.test.ts`: {Y} tests ({TC-C to TC-D})
- **Total: {Z} new tests**

**Running Total:** {Previous} + {Z} = {New Total} tests

**After Prompt {N}.2 (TDD Green):**
- All {New Total} tests PASS
- Page/feature works via launcher
- TypeScript compiles without errors
- No console errors in browser

**Story Complete when all above verified via Prompt {N}.R**

---

## Manual Verification Scenarios

After Story {N} is complete, verify via launcher:

1. **{Scenario 1}** — {what to do} → {expected result}
2. **{Scenario 2}** — {what to do} → {expected result}
```

---

## Writing the Skeleton-Red Prompt

The skeleton-red prompt creates stubs and tests. Tests will ERROR because stubs throw `NotImplementedError`.

### Template

```markdown
# Prompt {N}.1: Skeleton + TDD Red

**Target Model:** Claude Opus 4.5

**Story:** {Story Title} (Story {N})

**Working Directory:** `/absolute/path/to/project/frontend`

## Objective

Create component/hook stubs and write tests that assert real behavior. Tests will ERROR (not pass) because stubs throw `NotImplementedError`.

## Prerequisites

Story {N-1} must be complete — these files exist and tests pass:
- `src/path/to/file1.tsx` (implemented)
- `src/path/to/file2.ts` (implemented)
- All Story {N-1} tests PASS ({X} tests)

**Test utilities from Story {N-1} (reuse these):**
- `renderComponentName` helper in `ComponentName.test.tsx`
- `mockFunctionName` setup pattern
- `extractRedirectData` utility in `src/__test-utils__/`

## Reference Documents

All paths relative to `/absolute/path/to/project/frontend/docs/pre-26A-planning/sdd-features/`:

- Tech Design: `{feature}/02-*.tech-design.md` — "Chunk {N}" section
- Test Plan: `{feature}/03-*.test-plan.md` — TC-{X} to TC-{Y}
- UI TDD Approach: `ui-tdd-test-approach.md` — Testing patterns

**Note:** All `src/` paths below are relative to the working directory.

---

## Deliverables

### Stubs to Create

**{Description}** — `src/path/to/NewComponent.tsx`:
```typescript
import React from 'react';
import { NotImplementedError } from '@/errors';
import type { NewComponentProps } from '@/types/FeatureTypes';

export const NewComponent: React.FC<NewComponentProps> = () => {
  throw new NotImplementedError('NewComponent not implemented');
};
```

**{Description}** — `src/hooks/useNewHook.ts`:
```typescript
import { NotImplementedError } from '@/errors';
import type { UseNewHookReturn } from '@/types/FeatureTypes';

export const useNewHook = (): UseNewHookReturn => {
  throw new NotImplementedError('useNewHook not implemented');
};
```

### Type Additions

Add to `src/types/FeatureTypes.ts` (if not already present):
```typescript
export interface UseNewHookReturn {
  // ... interface definition from tech design
}
```

---

## Tests to Write

### `src/hooks/useNewHook.test.ts` — {N} tests (NEW FILE)

**TC-{X} to TC-{Y}**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useNewHook } from './useNewHook';
import { mockFixtureData } from '@/__fixtures__';

describe('useNewHook', () => {
  it('TC-{X}: {description from test plan}', () => {
    const { result } = renderHook(() => useNewHook());

    expect(result.current.someValue).toBe(expectedValue);
  });

  it('TC-{X+1}: {description from test plan}', () => {
    const { result } = renderHook(() => useNewHook());

    act(() => {
      result.current.someAction();
    });

    expect(result.current.someValue).toBe(newExpectedValue);
  });
});
```

### `src/components/ExistingComponent/ExistingComponent.test.tsx` — {N} additional tests (MODIFY)

**TC-{A} to TC-{B}**

Add to existing imports:
```typescript
import userEvent from '@testing-library/user-event';
```

Add new describe blocks to existing file:
```typescript
describe('New Functionality', () => {
  it('TC-{A}: {description from test plan}', async () => {
    renderExistingComponent();

    const element = screen.getByTestId('element-id');
    await userEvent.click(element);

    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('TC-{A+1}: {description from test plan}', async () => {
    renderExistingComponent({ propOverride: value });

    expect(screen.getByTestId('other-element')).toBeDisabled();
  });
});
```

---

## Standardized Test IDs

Use these `data-testid` values consistently:
- `{feature}-container` — Main container for the feature
- `{element}-input` — Input elements
- `{element}-button` — Button elements
- `{action}-{entityId}` — Action elements with entity reference (e.g., `checkbox-{locRefId}`)
- `{state}-indicator` — State indicators (loading, error, empty)

---

## Constraints

- Do not create files not listed in Deliverables
- Do not modify Story {N-1} implementation files (only add to test files if specified)
- Mock at API function level, never at hook level
- Tests assert real behavior, not that `NotImplementedError` is thrown
- Use `data-testid` for reliable element selection with TDS components
- Story {N-1} tests must continue to PASS

## Verification

```bash
npm run typecheck  # Should pass
npm test           # Story {N-1} tests ({X}) PASS, Story {N} tests ({Y}) ERROR
```

## Done When

- [ ] All stub files created
- [ ] All test files created/modified
- [ ] New tests ERROR with NotImplementedError (not FAIL, not PASS)
- [ ] Story {N-1} tests still PASS ({X} tests)
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (X PASS, Y ERROR).
```

---

## Writing the Green Prompt

The green prompt implements code to make tests pass.

### Template

```markdown
# Prompt {N}.2: TDD Green

**Target Model:** Claude Opus 4.5

**Story:** {Story Title} (Story {N})

**Working Directory:** `/absolute/path/to/project/frontend`

## Objective

Implement the components/hooks to make all Story {N} tests pass.

## Prerequisites

Prompt {N}.1 must be complete — stubs and tests in place:
- `src/path/to/NewComponent.tsx` (stub)
- `src/path/to/NewComponent.test.tsx` ({X} tests, currently ERROR)
- `src/hooks/useNewHook.ts` (stub)
- `src/hooks/useNewHook.test.ts` ({Y} tests, currently ERROR)

## Reference Documents

All paths relative to `/absolute/path/to/project/frontend/docs/pre-26A-planning/sdd-features/`:

- Tech Design: `{feature}/02-*.tech-design.md` — Flow {N} sequence diagram, interface definitions
- Test Plan: `{feature}/03-*.test-plan.md` — Expected behaviors for each TC

**Note:** All `src/` paths below are relative to the working directory.

---

## Deliverables

### 1. Implement `src/hooks/useNewHook.ts`

{Brief description of what this hook does}

```typescript
import { useState, useCallback } from 'react';
import type { UseNewHookReturn } from '@/types/FeatureTypes';

export const useNewHook = (): UseNewHookReturn => {
  const [state, setState] = useState<Type>(initialValue);

  const action = useCallback(() => {
    // Implementation
  }, []);

  return {
    state,
    action,
  };
};
```

### 2. Update `src/components/ExistingComponent/ExistingComponent.tsx`

**Changes needed:**

1. Add state for new functionality:
```typescript
const [newState, setNewState] = useState('');
```

2. Add handler function:
```typescript
const handleNewAction = () => {
  // Implementation
};
```

3. Wire to JSX:
```typescript
<TdsInput
  data-testid="new-input"
  value={newState}
  onChange={(e) => setNewState(e.target.value)}
/>
```

### 3. Update `src/pages/feature/FeaturePage.tsx`

**Changes needed:**

1. Import and use new hook:
```typescript
import { useNewHook } from '@/hooks/useNewHook';

// Inside component:
const { state, action } = useNewHook();
```

2. Pass props to child component:
```typescript
<ExistingComponent
  newProp={state}
  onNewAction={action}
/>
```

---

## Constraints

- Do not create files not listed in Deliverables
- Do NOT implement {future story scope} (Story {N+1})
- Use TDS components where available
- Follow existing code patterns in the repository

## Verification

```bash
npm run typecheck  # Should pass
npm test           # All {Total} tests should PASS
```

### Manual Verification

1. Start dev server: `npm run dev:start`
2. Navigate to: `http://localhost:5001/path/to/launcher.html` (5001 is PromptDB default port)
3. {Specific test scenario 1}
4. {Specific test scenario 2}
5. Verify: {Expected outcome}

## Done When

- [ ] All {Total} tests PASS ({Previous} from Story {N-1} + {New} from Story {N})
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] No console errors

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
```

---

## Writing the Verify Prompt

The verify prompt is a checklist-driven audit.

### Template

```markdown
# Prompt {N}.R: Verify {Story Title}

**Target Model:** Claude Opus 4.5

**Story:** {Story Title} (Story {N})

**Working Directory:** `/absolute/path/to/project/frontend`

## Reference Documents

All paths relative to `/absolute/path/to/project/frontend/docs/pre-26A-planning/sdd-features/`:

- Feature Spec: `{feature}/01-*.feature.md` — AC definitions
- Tech Design: `{feature}/02-*.tech-design.md` — Architecture
- Test Plan: `{feature}/03-*.test-plan.md` — TC definitions
- Skeleton Prompt: `{feature}/stories/story-{N}-*/prompt-{N}.1-skeleton-red.md`
- Green Prompt: `{feature}/stories/story-{N}-*/prompt-{N}.2-green.md`

**Note:** All `src/` paths below are relative to the working directory.

## Objective

Verify Story {N} is complete and meets all acceptance criteria.

---

## AC Coverage

| AC | Description | Verification Method |
|----|-------------|---------------------|
| AC-{X} | {Description} | Manual Test {M}, Automated TC-{Y} |
| AC-{X+1} | {Description} | Automated TC-{Y+1} |

---

## Verification Commands

```bash
npm run typecheck
npm test -- --testPathPattern="{pattern matching story files}"
npm run dev:start
```

---

## Automated Tests

All of these should PASS:

| Test File | TCs | Expected |
|-----------|-----|----------|
| `NewHook.test.ts` | TC-{X} to TC-{Y} | {N} tests pass |
| `ExistingComponent.test.tsx` | TC-{A} to TC-{B} | {M} tests pass |
| **Story {N} Total** | | **{Z} tests pass** |
| **Running Total** | | **{Total} tests pass** |

---

## Manual Verification

Using the launcher at `http://localhost:5001/path/to/launcher.html`:

**Test 1: {Scenario Name} (TC-{X}, TC-{Y} / AC-{A}, AC-{B})**
- {Precondition/setup}
- [ ] {Expected outcome 1}
- [ ] {Expected outcome 2}
- [ ] {Expected outcome 3}

**Test 2: {Scenario Name} (TC-{Z} / AC-{C})**
- {Precondition/setup}
- [ ] {Expected outcome 1}
- [ ] {Expected outcome 2}

---

## Checklist

### Automated
- [ ] All {Total} tests pass
- [ ] TypeScript compiles without errors

### Manual Verification
- [ ] Test 1: {Scenario} works correctly
- [ ] Test 2: {Scenario} works correctly

### Code Quality
- [ ] No console errors in browser
- [ ] Story {N-1} functionality still works
- [ ] Existing routes still work

### Implementation Details
- [ ] {Component/Hook name} uses correct type definitions
- [ ] {API function name} calls correct endpoint with correct parameters
- [ ] All components have required `data-testid` attributes
- [ ] MSW handlers return correct mock data
- [ ] {Story-specific implementation detail 1}
- [ ] {Story-specific implementation detail 2}

---

## Output

Report pass/fail for each item. If any fail, describe what's wrong and suggest a fix.

---

## Story {N} Complete When

All checklist items pass. Story {N+1} can then begin.
```

### Why Implementation Details?

The Implementation Details section verifies that the code is not just correct, but also follows the architectural contracts established in the tech design. Tests can pass with wrong implementations (e.g., correct behavior but wrong API endpoint, correct render but wrong test IDs).

**Implementation Details should check:**
- Correct type definitions used
- Correct API endpoints called
- Correct test IDs on elements
- Correct MSW handlers configured
- Story-specific architectural requirements (e.g., origin tracking, debounce, validation mode)

**Example items:**
```markdown
### Implementation Details
- [ ] `useMyHook` hook uses correct type (`UseMyHookReturn`)
- [ ] `myApiFunction` calls POST /api/correct-endpoint (not GET)
- [ ] Component uses `data-testid="my-component"` (not `my-component-container`)
- [ ] MSW handler returns mockMyData (not stale fixture)
- [ ] Debounce delay is 300ms (per tech design)
- [ ] Form validation mode is 'onChange' (ensures immediate validation)
```

This section evolved during Add Location Flow story development and is now a best practice for all verify prompts.

---

## Test Utilities Reference

These utilities are created in Story 0 and used throughout feature stories.

### `renderWithProviders`

**Location:** `src/__test-utils__/renderWithProviders.tsx`

**Purpose:** Wraps components with required providers (QueryClient, Router) for testing.

**When to use:** Testing page components or components that use React Query or routing.

```typescript
import { renderWithProviders } from '@/__test-utils__';

// Basic usage
renderWithProviders(<AddLocation />);

// With route parameters
renderWithProviders(<AddLocation />, {
  initialEntries: ['/locations/add?sai=123&redirectUrl=http://example.com'],
});
```

### `createHookWrapper`

**Location:** `src/__test-utils__/renderWithProviders.tsx`

**Purpose:** Creates a wrapper for testing hooks that need providers.

**When to use:** Testing custom hooks that use React Query.

```typescript
import { createHookWrapper } from '@/__test-utils__';
import { renderHook } from '@testing-library/react';

const { Wrapper } = createHookWrapper();
const { result } = renderHook(() => useMyHook(), { wrapper: Wrapper });
```

### `setupRedirectMock`

**Location:** `src/__test-utils__/mockRedirect.ts`

**Purpose:** Mocks `window.location.assign` for testing redirects.

**When to use:** Testing flows that redirect to external URLs.

```typescript
import { setupRedirectMock } from '@/__test-utils__';

describe('MyComponent', () => {
  const mockAssign = setupRedirectMock();

  it('redirects on cancel', async () => {
    // ... trigger redirect
    expect(mockAssign).toHaveBeenCalledWith('http://expected-url.com');
  });
});
```

### `extractRedirectData`

**Location:** `src/__test-utils__/mockRedirect.ts`

**Purpose:** Extracts and decodes base64 data from redirect URLs.

**When to use:** Testing that return data is correctly encoded.

```typescript
import { extractRedirectData } from '@/__test-utils__';

const redirectUrl = mockAssign.mock.calls[0][0];
const data = extractRedirectData(redirectUrl);

expect(data[0].locRefId).toBe('expected-id');
```

---

## Mock Patterns

### Mocking API Functions

**Always mock at the API function level, never at the hook level.**

```typescript
import { getAccountLocations } from '@/api/addLocationApi';

// Mock the module
jest.mock('@/api/addLocationApi', () => ({
  getAccountLocations: jest.fn(),
}));

// Create typed reference
const mockGetAccountLocations = getAccountLocations as jest.Mock;

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles successful response', async () => {
    mockGetAccountLocations.mockResolvedValue(mockLocationsV2);
    // ... test
  });

  it('handles error response', async () => {
    mockGetAccountLocations.mockRejectedValue(mockNetworkError);
    // ... test
  });

  it('handles loading state', async () => {
    mockGetAccountLocations.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockLocationsV2), 100))
    );
    // ... test loading indicator appears
  });
});
```

### Mocking Hooks (Query Params Only)

**Exception:** Mock `useQueryParams` to configure test scenarios.

```typescript
import { useQueryParams } from '@/hooks/useQueryParams';

jest.mock('@/hooks/useQueryParams', () => ({
  useQueryParams: jest.fn(),
}));

const mockUseQueryParams = useQueryParams as jest.Mock;

beforeEach(() => {
  mockUseQueryParams.mockReturnValue({
    queryParams: mockValidParams,
    redirectQueryParams: { paramName: 'data' },
    error: null,
  });
});
```

**Why this exception?** `useQueryParams` parses URL parameters. Mocking it lets us test different parameter scenarios without manipulating URLs.

---

## TDS Component Testing

Travis Design System (TDS) components have quirks in Jest/jsdom.

### Known Issues

**TdsCheck (Checkbox):**
- Internal state doesn't update reliably in tests
- Checkbox may appear unchecked even after click

**Solution:** Test that callbacks fire, not visual state:

```typescript
// DON'T rely on visual state
it('checkbox shows checked state', async () => {
  renderComponent();
  await userEvent.click(screen.getByTestId('checkbox-123'));
  // This may fail even if code is correct:
  expect(screen.getByTestId('checkbox-123')).toBeChecked(); // UNRELIABLE
});

// DO test callbacks
it('checkbox click calls onToggleSelection', async () => {
  const mockToggle = jest.fn();
  renderComponent({ onToggleSelection: mockToggle });

  await userEvent.click(screen.getByTestId('checkbox-123'));

  expect(mockToggle).toHaveBeenCalledWith('123'); // RELIABLE
});
```

### Using data-testid with TDS

TDS components have complex DOM structures. Always use `data-testid`:

```typescript
// Component
<TdsButton data-testid="submit-button" onClick={handleSubmit}>
  Submit
</TdsButton>

// Test
await userEvent.click(screen.getByTestId('submit-button'));
```

### Testing Disabled State

```typescript
expect(screen.getByTestId('add-to-policy-button')).toBeDisabled();
expect(screen.getByTestId('add-to-policy-button')).toBeEnabled();
```

---

## Modifying Existing Files

Stories after Story 1 often modify existing files rather than creating new ones.

### Pattern: Adding Tests to Existing Test File

In the skeleton-red prompt, clearly separate new tests from existing structure:

```markdown
### `src/components/LocationList/LocationList.test.tsx` — 10 additional tests (MODIFY)

**TC-17 to TC-21 (Filtering) + TC-25 to TC-27 (Selection UI)**

Add to existing imports:
```typescript
import userEvent from '@testing-library/user-event';
```

Add new describe blocks to existing file (do not modify existing tests):
```typescript
describe('Filtering', () => {
  it('TC-17: filter is case-insensitive', async () => {
    // ... test implementation
  });
});

describe('Selection UI', () => {
  it('TC-25: Add to Policy button disabled when nothing selected', () => {
    // ... test implementation
  });
});
```

**Existing tests to preserve:**
- TC-10 to TC-16 from Story 1 (7 tests)

**After modification:** 7 existing + 10 new = 17 total tests in this file
```

### Pattern: Reusing Existing Test Helpers

Reference helpers from previous stories:

```markdown
**Test utilities from Story 1 (these exist and should be reused):**
- `renderLocationList` helper in `LocationList.test.tsx` — use for all LocationList tests
- `defaultProps` object — override specific props as needed

Example usage in new tests:
```typescript
// Reuse existing helper with prop overrides
renderLocationList({ selectedIds: new Set(['123']) });
```
```

### Pattern: Extending Implementation Files

In the green prompt, show incremental changes:

```markdown
### 2. Update `src/components/LocationList/LocationList.tsx`

**Changes needed (add to existing implementation):**

1. Add filter state (near other useState calls):
```typescript
const [filterText, setFilterText] = useState('');
```

2. Add filtering logic (before the return statement):
```typescript
const filteredLocations = useMemo(() => {
  if (!filterText.trim()) return locations;
  // ... filtering logic
}, [locations, filterText]);
```

3. Wire filter input (in JSX, add after the title):
```typescript
<TdsInput
  data-testid="filter-input"
  value={filterText}
  onChange={(e) => setFilterText(e.target.value)}
/>
```

4. Update table to use filteredLocations:
```typescript
// Change: locations.map(...)
// To: filteredLocations.map(...)
```
```

---

## Key Principles

### 1. Pull Tests from the Test Plan

**Don't write tests from scratch.** The test plan contains complete, copy-paste ready test implementations.

Process:
1. Find the TC number in the test plan
2. Copy the test code
3. Paste into your prompt
4. Adjust only if story-specific context requires it

### 2. Self-Contained Prompts

Each prompt must be executable without prior conversation context.

Include:
- Absolute paths
- Complete code (not "similar to before")
- All constraints (even if repeated)
- Prerequisites explicitly listed

### 3. Explicit Scope Boundaries

Every prompt states what NOT to implement:
- "Do NOT implement filtering (Story 2)"
- "Do NOT create files not listed in Deliverables"

### 4. Running Test Totals

Track cumulative test counts:
- Story 1: 26 tests
- Story 2: 26 + 25 = 51 tests
- Story 3: 51 + X = Y tests

Previous story tests must continue passing.

### 5. Completion Summaries

End every prompt with:
```
After completion, summarize: which files were created/modified,
how many tests were added, and confirm the expected test state.
```

This creates a feedback loop for verification.

---

## Do's and Don'ts

### DO

- **DO** copy test code directly from the test plan
- **DO** provide absolute paths for the working directory
- **DO** list explicit constraints and scope boundaries
- **DO** reference specific TCs and ACs in tests and verification
- **DO** track running test totals across stories
- **DO** specify which files are NEW vs MODIFY
- **DO** include the "After completion, summarize" instruction
- **DO** document test utilities and when to use them
- **DO** explain TDS component quirks and workarounds

### DON'T

- **DON'T** write tests from scratch when the test plan has them
- **DON'T** assume AI remembers previous conversations
- **DON'T** mock hooks (except useQueryParams for scenario configuration)
- **DON'T** write tests that assert `NotImplementedError` throws
- **DON'T** leave scope boundaries implicit
- **DON'T** skip the verify prompt
- **DON'T** forget to update running test totals
- **DON'T** rely on TDS component visual state in tests

---

## Worked Example: Deriving Story 2

This section shows the complete process of deriving Story 2 from the source documents.

### Step 1: Identify the Chunk (Tech Design)

From `02-add-location-flow.tech-design.md`:

```markdown
## Chunk 2: Select and Return to Guidewire

**Scope:** Location filtering, selection management, return data encoding
**ACs Covered:** AC-17 to AC-26, AC-71, AC-73 to AC-78
**Dependencies:** Chunk 1 complete (LocationList displays)
```

This becomes **Story 2: Select and Return to Guidewire**.

### Step 2: List the TCs (Feature Spec)

From `01-add-location-flow.feature.md`, gather TCs for these ACs:

**Filtering (AC-17 to AC-19):**
- TC-17: Filter is case-insensitive
- TC-18: Filter matches address field
- TC-19: Filter matches location number
- TC-20: Filter matches description
- TC-21: Clearing filter restores all locations

**Selection (AC-20 to AC-23):**
- TC-22: Toggle adds unselected location
- TC-23: Toggle removes selected location
- TC-24: Multiple locations can be selected
- TC-25: Add to Policy disabled when none selected
- TC-26: Add to Policy enabled when selected
- TC-27: Add New link visible

**Navigation (AC-24, AC-25):**
- TC-28: Add New from list navigates to typeahead
- TC-29: Cancel from list redirects without data

**Return Data (AC-71, AC-73 to AC-78):**
- TC-79: Add to Policy redirects with base64 data
- TC-81: Return data is always array (single)
- TC-82: Return data is always array (multiple)
- TC-83: Return data includes locRefId
- TC-84: Return data includes address fields
- TC-85: Uses default query param "data"
- TC-86: Uses custom redirectQueryParamName
- TC-87: Cancel redirects without data

**Total: 25 TCs**

### Step 3: Pull Tests from Test Plan

From `03-add-location-flow.test-plan.md`:

```typescript
// TC-17 test (copy this exactly)
it('TC-17: filter is case-insensitive', async () => {
  renderLocationList();

  const filterInput = screen.getByTestId('filter-input');
  await userEvent.type(filterInput, 'MAPLE');

  expect(screen.getByText('516 Maple Avenue')).toBeInTheDocument();
  expect(screen.queryByText('125 York Street')).not.toBeInTheDocument();
  expect(screen.queryByText('200 Main Street')).not.toBeInTheDocument();
});
```

Copy each test for TC-17 through TC-87 (excluding TC-80 which is Story 4).

### Step 4: Identify Files (Tech Design)

From the chunk definition:

**New files:**
- `src/hooks/useLocationSelection.ts` — Selection state management
- `src/hooks/useLocationSelection.test.ts` — 6 tests

**Modified files:**
- `src/components/LocationList/LocationList.tsx` — Add filtering, selection UI
- `src/components/LocationList/LocationList.test.tsx` — Add 10 tests
- `src/pages/add-location/AddLocation.tsx` — Add return encoding, navigation
- `src/pages/add-location/AddLocation.test.tsx` — Add 9 tests

### Step 5: Count and Track Tests

**Story 2 test breakdown:**
- `useLocationSelection.test.ts`: 6 tests (NEW)
- `LocationList.test.tsx`: 10 additional tests (MODIFY: was 7, now 17)
- `AddLocation.test.tsx`: 9 additional tests (MODIFY: was 11, now 20)
- **Story 2 new tests: 25**

**Running total:**
- After Story 1: 26 tests
- After Story 2: 26 + 25 = 51 tests

### Step 6: Write the Documents

**story.md excerpt:**
```markdown
## Definition of Done

**Test Breakdown for Story 2:**
- `useLocationSelection.test.ts`: 6 tests (TC-22 to TC-24 + utilities)
- `LocationList.test.tsx`: 10 additional tests (TC-17 to TC-21, TC-25 to TC-27)
- `AddLocation.test.tsx`: 9 additional tests (TC-28, TC-29, TC-79, TC-81 to TC-87)
- **Total: 25 new tests**

**Running Total:** 26 + 25 = 51 tests
```

**prompt-2.1-skeleton-red.md excerpt:**
```markdown
## Tests to Write

### `src/hooks/useLocationSelection.test.ts` — 6 tests (NEW FILE)

**TC-22 to TC-24 + utility tests**

```typescript
import { renderHook, act } from '@testing-library/react';
import { useLocationSelection } from './useLocationSelection';
import { mockLocationsV2 } from '@/__fixtures__';

describe('useLocationSelection', () => {
  it('TC-22: toggleSelection adds unselected location to selection', () => {
    const { result } = renderHook(() => useLocationSelection());

    expect(result.current.selectedIds.size).toBe(0);

    act(() => {
      result.current.toggleSelection('69033210-d339-4cd4-a976-ed313cf70a75');
    });

    expect(result.current.selectedIds.has('69033210-d339-4cd4-a976-ed313cf70a75')).toBe(true);
    expect(result.current.selectedIds.size).toBe(1);
  });

  // ... remaining tests copied from test plan
});
```

### `src/components/LocationList/LocationList.test.tsx` — 10 additional tests (MODIFY)

**TC-17 to TC-21 (Filtering) + TC-25 to TC-27 (Selection UI)**

Add to existing imports:
```typescript
import userEvent from '@testing-library/user-event';
```

Add new describe blocks (preserve existing TC-10 to TC-16 tests):
```typescript
describe('Filtering', () => {
  it('TC-17: filter is case-insensitive', async () => {
    renderLocationList();

    const filterInput = screen.getByTestId('filter-input');
    await userEvent.type(filterInput, 'MAPLE');

    expect(screen.getByText('516 Maple Avenue')).toBeInTheDocument();
    expect(screen.queryByText('125 York Street')).not.toBeInTheDocument();
  });

  // ... remaining filter tests
});

describe('Selection UI', () => {
  it('TC-25: Add to Policy button disabled when nothing selected', () => {
    renderLocationList({ selectedIds: new Set() });

    expect(screen.getByTestId('add-to-policy-button')).toBeDisabled();
  });

  // ... remaining selection tests
});
```
```

---

## Checklist for Story Authors

Before considering a story ready for execution:

### Source Document Review
- [ ] Identified the correct chunk from tech design
- [ ] Listed all TCs for the story's ACs
- [ ] Located test implementations in test plan
- [ ] Identified new vs modified files

### Story Overview (story.md)
- [ ] User story follows As/Want/So format
- [ ] Context explains dependencies and what ships
- [ ] All ACs listed with references to feature spec
- [ ] Dependencies section lists prerequisite stories
- [ ] Deliverables section lists new and modified files
- [ ] Test breakdown has counts per file with TC references
- [ ] Running total calculated correctly
- [ ] Manual verification scenarios included

### Skeleton-Red Prompt
- [ ] Prerequisites list specific files and test counts
- [ ] Test utilities from previous stories documented
- [ ] All stub files have complete code with `NotImplementedError`
- [ ] All tests copied from test plan (not written from scratch)
- [ ] Tests clearly marked as NEW FILE or MODIFY
- [ ] For modified files: existing tests to preserve noted
- [ ] Test names include TC numbers
- [ ] Standardized test IDs listed
- [ ] Constraints include explicit scope boundaries
- [ ] "After completion, summarize" instruction included

### Green Prompt
- [ ] Prerequisites reference skeleton-red completion with test counts
- [ ] Implementation guidance shows incremental changes for modified files
- [ ] Complete code provided for new files
- [ ] Constraints prevent scope creep to future stories
- [ ] Manual verification steps are specific
- [ ] "After completion, summarize" instruction included

### Verify Prompt
- [ ] AC coverage table maps every AC to verification method
- [ ] Automated test table has correct counts per file
- [ ] Running total matches expected
- [ ] Manual verification references TCs and ACs
- [ ] Checklist organized into 4 sections: Automated, Manual Verification, Code Quality, Implementation Details
- [ ] Implementation Details section has 6+ items checking types, endpoints, test IDs, MSW handlers
- [ ] If final story, includes Feature Completion Summary

### Final Review
- [ ] Test count math is correct across all documents
- [ ] All TC references are accurate
- [ ] No implicit assumptions about AI context
- [ ] Absolute paths used consistently
- [ ] Could a fresh agent execute this without prior context?
