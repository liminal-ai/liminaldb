# Story 4 Implementation Readiness Assessment

**Prepared by**: Claude Opus 4.5
**Date**: 2026-01-09
**Story**: UI Search & Pin/Favorite (Story 4)
**Epic**: Search & Select (Epic 02)

---

## Executive Summary

Story 4 is **READY FOR IMPLEMENTATION** with minor adjustments needed in the prompts. The codebase is well-prepared from Stories 0-3, with most backend infrastructure already in place. The prompts are mostly accurate but contain a few discrepancies with the actual code state.

---

## Current Baseline Verification

| Metric | Expected (per prompts) | Actual | Status |
|--------|------------------------|--------|--------|
| Test count | 311 | **319** | Warning |
| TypeScript | Passes | Passes | Pass |
| Backend APIs | Complete | Complete | Pass |

**Note**: The baseline is 319 tests, not 311 as stated in the prompts. This appears to be a cumulative drift from earlier stories. The prompts should reference 319 as the baseline.

---

## Backend Dependencies (Story 1) — COMPLETE

All required backend APIs are implemented and functional:

### REST API Endpoints

| API Endpoint | File | Line | Status |
|--------------|------|------|--------|
| `GET /api/prompts?q=&tags=&limit=` | `src/routes/prompts.ts` | 88-140 | Implemented |
| `PATCH /api/prompts/:slug/flags` | `src/routes/prompts.ts` | 175-215 | Implemented |
| `POST /api/prompts/:slug/usage` | `src/routes/prompts.ts` | 221-248 | Implemented |
| `GET /api/prompts/tags` | `src/routes/prompts.ts` | 150-169 | Implemented |

### MCP Tools

All MCP tools are implemented in `src/lib/mcp.ts`:

| Tool | Lines | Status |
|------|-------|--------|
| `list_prompts` | 577-634 | Implemented |
| `search_prompts` | 637-699 | Implemented |
| `list_tags` | 702-752 | Implemented |
| `update_prompt` | 755-877 | Implemented |
| `track_prompt_use` | 879-936 | Implemented |

### Convex Schema

Located in `convex/schema.ts` lines 22-61:

| Field/Index | Status |
|-------------|--------|
| `searchText` field | Implemented |
| `pinned` field | Implemented |
| `favorited` field | Implemented |
| `usageCount` field | Implemented |
| `lastUsedAt` field | Implemented |
| Search index `search_prompts` | Implemented |
| `rankingConfig` table | Implemented |

### Convex Queries/Mutations

Located in `convex/prompts.ts`:

| Function | Lines | Status |
|----------|-------|--------|
| `listPromptsRanked` | 192-209 | Implemented |
| `searchPrompts` | 211-232 | Implemented |
| `updatePromptFlags` | 234-247 | Implemented |
| `trackPromptUse` | 249-260 | Implemented |
| `listTags` | 262-272 | Implemented |

---

## Shell Integration — ALREADY IN PLACE

The shell (`src/ui/templates/shell.html`) already has all required features:

| Feature | Location | Status |
|---------|----------|--------|
| `#search-input` element | Line 14 | Exists |
| `shell:filter` message broadcast | Lines 234-241 | Exists |
| 150ms debounce | Lines 262-266 | Exists |
| Tag picker | Lines 170-189 | Exists |
| Tag filter pills | Lines 216-231 | Exists |

**Prompt 4.1 Accuracy**: Correctly states "Reuse the existing `#search-input` and `shell:filter` message"

### Shell Filter Implementation

```javascript
// Already exists at line 234-241
function broadcastFilters() {
  if (!moduleFrame.contentWindow) return;
  moduleFrame.contentWindow.postMessage({
    type: 'shell:filter',
    query: searchInput.value,
    tags: selectedTags
  }, window.location.origin);
}
```

---

## Portlet Integration — PARTIAL

The prompts portlet (`src/ui/templates/prompts.html`) has filter handling but needs UI additions:

### Existing Features

| Feature | Lines | Status |
|---------|-------|--------|
| `shell:filter` message handler | 1008-1030 | Exists |
| `loadPrompts(query, tags)` with URL params | 868-901 | Exists |
| `renderList()` function | 904-931 | Exists |
| Copy button and `copyContent()` | 972-987 | Exists |

### Filter Handler (Already Exists)

```javascript
// Already exists at lines 1020-1022
case 'shell:filter':
  // Search + tag filtering
  loadPrompts(payload.query || '', payload.tags || []);
  break;
```

### loadPrompts Implementation (Already Exists)

```javascript
// Already exists at lines 868-901
async function loadPrompts(query = '', tags = []) {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set('q', trimmed);
  }
  if (tags.length > 0) {
    params.set('tags', tags.join(','));
  }
  // ... fetches and renders
}
```

### Missing UI Elements (To Be Added in Story 4)

| Feature | Description | Status |
|---------|-------------|--------|
| Pin toggle button | `#pin-toggle` in prompt header | Missing |
| Favorite toggle button | `#favorite-toggle` in prompt header | Missing |
| Pin icon in list items | `.prompt-pin` element | Missing |
| Star icon in list items | `.prompt-star` element | Missing |
| "No prompts match" empty state | For search with no results | Missing |
| "Create your first prompt" CTA | For users with zero prompts | Missing |
| Copy usage tracking | POST to `/api/prompts/:slug/usage` after copy | Missing |

---

## Test Setup Analysis

### Current Test File Status

| File | Current Tests | Story 4 Additions | Expected Total |
|------|--------------|-------------------|----------------|
| `prompts-module.test.ts` | 30 tests | +11 tests | 41 tests |
| `shell-history.test.ts` | 1 test | +1 test | 2 tests |

### mockPrompts in `tests/service/ui/setup.ts` — NEEDS UPDATE

**Current Implementation** (lines 78-95):

```typescript
export const mockPrompts = [
  {
    slug: "code-review",
    name: "Code Review",
    description: "Reviews code for issues",
    content: "You are a code reviewer. Analyze the following code...",
    tags: ["code", "review"],
    parameters: [],
  },
  {
    slug: "meeting-notes",
    name: "Meeting Notes",
    description: "Summarizes meetings",
    content: "Summarize the following meeting transcript...",
    tags: ["meetings"],
    parameters: [],
  },
];
```

**Issue**: Missing `pinned`, `favorited`, `usageCount`, `lastUsedAt` fields required for Story 4 tests.

**Required Update**:

```typescript
export const mockPrompts = [
  {
    slug: "code-review",
    name: "Code Review",
    description: "Reviews code for issues",
    content: "You are a code reviewer. Analyze the following code...",
    tags: ["code", "review"],
    parameters: [],
    pinned: false,
    favorited: false,
    usageCount: 0,
    lastUsedAt: undefined,
  },
  {
    slug: "meeting-notes",
    name: "Meeting Notes",
    description: "Summarizes meetings",
    content: "Summarize the following meeting transcript...",
    tags: ["meetings"],
    parameters: [],
    pinned: false,
    favorited: false,
    usageCount: 0,
    lastUsedAt: undefined,
  },
];
```

---

## Prompt Accuracy Analysis

### Prompt 4.1 (Skeleton + TDD Red)

| Section | Accuracy | Notes |
|---------|----------|-------|
| Prerequisites | Warning | Says "311 tests" but baseline is 319 |
| Shell modifications | Pass | Correctly says reuse existing |
| Portlet HTML additions | Pass | Accurate pin/star button HTML |
| Handler stubs | Pass | Accurate stub signatures |
| Test assertions | Warning | Tests reference `mockPrompts` without v2 fields |
| UI testing hooks | Pass | `aria-pressed`, `.prompt-pin`, `.prompt-star` are correct |

### Prompt 4.2 (TDD Green)

| Section | Accuracy | Notes |
|---------|----------|-------|
| Filter handler impl | Pass | Matches existing pattern |
| Pin/favorite handlers | Pass | Correct optimistic update pattern |
| API calls | Pass | Matches actual endpoints |
| Empty states | Pass | Correct differentiation logic |
| Copy tracking | Pass | Fire-and-forget pattern is correct |

### Prompt 4.R (Verify)

| Section | Accuracy | Notes |
|---------|----------|-------|
| AC coverage table | Pass | Correctly maps ACs to TCs |
| Verification commands | Warning | Uses `--project ui` but tests are in `service` project |
| Test counts | Warning | Says 323 total but should be 331 (319 + 12) |

---

## Identified Issues & Recommendations

### Issue 1: Test Count Discrepancy

**Problem**: Prompts reference 311 baseline tests, but actual baseline is 319.

**Impact**: Low — Documentation mismatch only

**Recommendation**: Update prompt references:
- Baseline: 319 tests (not 311)
- Final count: 331 tests (319 + 12)

### Issue 2: mockPrompts Missing v2 Fields

**Problem**: Test setup doesn't include `pinned`, `favorited`, `usageCount`, `lastUsedAt`.

**Impact**: Medium — Tests will fail to assert v2 field behavior

**Recommendation**: Update `mockPrompts` in `tests/service/ui/setup.ts` before starting 4.1 (see code above).

### Issue 3: Verification Command Project Flag

**Problem**: `prompt-4.R-verify.md` line 52-54 uses:
```bash
bun run test --project ui \
  tests/service/ui/prompts-module.test.ts \
  tests/service/ui/shell-history.test.ts
```

But UI tests are in the `service` project based on vitest configuration.

**Impact**: Low — Verification won't run correct tests

**Recommendation**: Change to:
```bash
bun run test --project service \
  tests/service/ui/prompts-module.test.ts \
  tests/service/ui/shell-history.test.ts
```

Or simply:
```bash
bun run test tests/service/ui/prompts-module.test.ts tests/service/ui/shell-history.test.ts
```

### Issue 4: Empty State Logic Integration

**Problem**: Prompt 4.2 shows empty state logic in a new `handleFilter()` function, but `loadPrompts()` already handles the response rendering.

**Impact**: Low — Implementation detail

**Recommendation**: Integrate empty state rendering into existing `renderList()` function or add a separate check after `loadPrompts()` returns data. The existing pattern in `renderList()` at line 904 should be extended.

---

## Alignment Summary

| Component | Prompt Accuracy | Code Readiness |
|-----------|-----------------|----------------|
| Backend APIs | Pass | Complete |
| Shell search/filter | Pass | Complete |
| Portlet filter handler | Pass | Exists |
| Pin/favorite UI | Pass | Needs implementation |
| Empty states | Pass | Needs implementation |
| Copy tracking | Pass | Needs implementation |
| Test helpers | Warning | Needs v2 fields |
| Test counts | Warning | Off by 8 |

---

## Pre-Implementation Checklist

Before starting Prompt 4.1, ensure the following:

- [ ] Update `tests/service/ui/setup.ts` `mockPrompts` to include v2 fields (`pinned`, `favorited`, `usageCount`, `lastUsedAt`)
- [ ] Note actual baseline: **319 tests** (not 311)
- [ ] Expected final count: **331 tests** (319 + 12)
- [ ] Verify typecheck passes: `bun run typecheck`
- [ ] Verify all tests pass: `bun run test`

---

## Test Coverage Mapping

### Story 4 Test Conditions

| TC | Description | Test File | ACs |
|----|-------------|-----------|-----|
| TC-1 | Typing in search filters prompts | `prompts-module.test.ts` | AC-1 |
| TC-3 | Empty search shows all prompts | `prompts-module.test.ts` | AC-4 |
| TC-4 | No matches shows empty state | `prompts-module.test.ts` | AC-5 |
| TC-6 | Rapid typing remains responsive | `shell-history.test.ts` | AC-7 |
| TC-14 | Zero prompts shows CTA | `prompts-module.test.ts` | AC-16 |
| TC-20 | Click pin icon pins prompt | `prompts-module.test.ts` | AC-22 |
| TC-21 | Click pin on pinned unpins | `prompts-module.test.ts` | AC-23 |
| TC-22 | Click star favorites prompt | `prompts-module.test.ts` | AC-24 |
| TC-23 | Click star on favorited unfavorites | `prompts-module.test.ts` | AC-25 |
| TC-24 | Changes reflect immediately | `prompts-module.test.ts` | AC-26 |
| TC-25 | Pinned shows pin icon in list | `prompts-module.test.ts` | AC-27 |
| TC-26 | Favorited shows star icon in list | `prompts-module.test.ts` | AC-28 |

---

## File Modification Summary

### Files to Modify (Story 4)

| File | Changes |
|------|---------|
| `src/ui/templates/prompts.html` | Add pin/star buttons, list icons, empty states, copy tracking |
| `tests/service/ui/setup.ts` | Update `mockPrompts` with v2 fields |
| `tests/service/ui/prompts-module.test.ts` | Add 11 new tests |
| `tests/service/ui/shell-history.test.ts` | Add 1 new test |

### Files That Should NOT Be Modified

| File | Reason |
|------|--------|
| `src/ui/templates/shell.html` | Search/filter already complete |
| `src/routes/prompts.ts` | Backend APIs complete from Story 1 |
| `convex/prompts.ts` | Convex functions complete from Story 1 |
| `src/lib/mcp.ts` | MCP tools complete from Story 1 |

---

## Final Verdict

**READY FOR IMPLEMENTATION**

The codebase is well-prepared. Story 4 prompts are architecturally sound and align with the existing code patterns. The minor discrepancies (test counts, mock data) are easily fixed during implementation. The backend foundation from Story 1 is solid, and the shell/portlet messaging protocol is already in place.

### Recommended Implementation Order

1. **Pre-work**: Update `mockPrompts` in test setup with v2 fields
2. **Phase 1**: Execute Prompt 4.1 (skeleton + stub handlers + 12 failing tests)
3. **Phase 2**: Execute Prompt 4.2 (implementation to make tests pass)
4. **Phase 3**: Run Prompt 4.R verification (all 331 tests pass)

### Success Criteria

- [ ] All 331 tests pass (319 baseline + 12 new)
- [ ] TypeScript compiles without errors
- [ ] Manual verification: search, pin/favorite, copy tracking all work
- [ ] No console errors in browser

---

## Appendix: Key Code References

### Shell Filter Broadcast
`src/ui/templates/shell.html:234-241`

### Portlet Filter Handler
`src/ui/templates/prompts.html:1020-1022`

### Backend Flags Endpoint
`src/routes/prompts.ts:175-215`

### Backend Usage Endpoint
`src/routes/prompts.ts:221-248`

### Convex Schema v2 Fields
`convex/schema.ts:46-50`

### Test Setup mockPrompts
`tests/service/ui/setup.ts:78-95`
