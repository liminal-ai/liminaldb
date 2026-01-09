# Prompt 5.1: Skeleton + TDD Red

**Story:** UI Durable Drafts (Story 5)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Add draft indicator to shell, draft management to portlet, and write UI tests that assert real behavior. Tests will ERROR (not pass) because UI handlers are stubs.

## Prerequisites

Story 3 and Story 4 must be complete:
- Draft API endpoints exist (`/api/drafts/*`)
- Search/pin UI exists in shell and portlet
- All 323 tests pass (278 + 20 + 9 + 4 + 12 from Stories 0-4)

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-29..33, AC-35..37, AC-40, AC-42
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 4 UI sections
- UI Architecture: `docs/ui-arch-patterns-design.md` — Shell/portlet messaging

---

## Deliverables

### Shell Modifications — `src/ui/templates/shell.html`

Add draft indicator with polling:

```html
<!-- Add to shell header area -->
<div id="draft-indicator" class="draft-indicator hidden">
  <span class="draft-icon"></span>
  <span id="draft-count">0</span> unsaved
</div>
```

```javascript
// Add to shell JavaScript

let draftPollingInterval = null;

// Start polling for drafts
function startDraftPolling() {
  draftPollingInterval = setInterval(async () => {
    try {
      const response = await fetch('/api/drafts/summary');
      const data = await response.json();
      updateDraftIndicator(data);
    } catch (e) {
      console.error('Draft polling failed:', e);
    }
  }, 15000); // 15 second polling
}

function updateDraftIndicator(summary) {
  throw new Error("NotImplementedError: updateDraftIndicator not implemented");
}

// Handle click on draft indicator
document.getElementById('draft-indicator').addEventListener('click', () => {
  throw new Error("NotImplementedError: handleDraftIndicatorClick not implemented");
});

// Message handler for draft updates from portlet
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'portlet:drafts') {
    updateDraftIndicator(event.data);
  }
});

// Start polling on load
startDraftPolling();
```

### Portlet Modifications — `src/ui/templates/prompts.html`

Add draft state management:

```javascript
// Add to prompts portlet JavaScript

// Draft state
let currentDraft = null;
let draftDebounceTimer = null;

// Auto-save to draft on edit mode changes
function handleEditModeChange(field, value) {
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(() => {
    saveToDraft();
  }, 500); // 500ms debounce
}

function saveToDraft() {
  throw new Error("NotImplementedError: saveToDraft not implemented");
}

// Line edit → draft (not immediate save)
function handleLineEdit(field, value) {
  throw new Error("NotImplementedError: handleLineEdit not implemented");
}

// +New creates draft entry
function handleNewPrompt() {
  throw new Error("NotImplementedError: handleNewPrompt not implemented");
}

// Save button commits draft to Convex
function handleSave() {
  throw new Error("NotImplementedError: handleSave not implemented");
}

// Discard button clears draft from Redis
function handleDiscard() {
  throw new Error("NotImplementedError: handleDiscard not implemented");
}

// Save failure preserves draft
function handleSaveFailure(error) {
  throw new Error("NotImplementedError: handleSaveFailure not implemented");
}

// Expiration warning
function checkDraftExpiration(draft) {
  throw new Error("NotImplementedError: checkDraftExpiration not implemented");
}

// Notify shell of draft changes
function notifyShellOfDrafts(summary) {
  window.parent.postMessage({
    type: 'portlet:drafts',
    count: summary.count,
    latestDraftId: summary.latestDraftId,
    hasExpiringSoon: summary.hasExpiringSoon
  }, window.location.origin);
}

// Handle shell request to open draft
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'shell:drafts:open') {
    openDraft(event.data.draftId);
  }
});

function openDraft(draftId) {
  throw new Error("NotImplementedError: openDraft not implemented");
}
```

**UI testing hooks (for deterministic tests):**
- Render an element with class `.draft-expiry-warning` when `hasExpiringSoon` is true or when a draft is within the warning window.

### Notes

Keep draft wiring inside `src/ui/templates/prompts.html` using existing `promptEditor` callbacks and the line-edit handlers already defined there. Do not add new global handlers in `public/js/prompt-editor.js` or `public/js/prompt-viewer.js` for this story.

---

## Tests to Write

### `tests/service/ui/prompts-module.test.ts` — 8 tests (MODIFY)

**TC-27..31, TC-35, TC-38, TC-40**

```typescript
import { describe, test, expect, beforeEach, vi } from "vitest";
import { loadTemplate, mockFetch, mockPrompts, postMessage, waitForAsync, click, input, blur } from "./setup";
import type { JSDOM } from "jsdom";

describe("UI Durable Drafts", () => {
  let dom: JSDOM;

  beforeEach(async () => {
    dom = await loadTemplate("prompts.html");
  });

  test("TC-27: edit mode change saves to draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts": { data: { draftId: "edit:code-review" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    click(firstItem);
    await waitForAsync(50);

    const editBtn = dom.window.document.getElementById("edit-btn");
    if (!editBtn) throw new Error("Edit button not found");
    click(editBtn);
    await waitForAsync(50);

    const nameInput = dom.window.document.getElementById("editor-name") as HTMLInputElement | null;
    if (!nameInput) throw new Error("Editor name input not found");
    vi.useFakeTimers();
    input(nameInput, "Updated Name");
    vi.advanceTimersByTime(600);

    const fetchCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls.some(([url, opts]) =>
      typeof url === "string" &&
      url.includes("/api/drafts/edit:code-review") &&
      (opts as RequestInit | undefined)?.method === "PUT"
    )).toBe(true);
    vi.useRealTimers();
  });

  test("TC-28: line edit saves to draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts": { data: { draftId: "edit:code-review" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    click(firstItem);
    await waitForAsync(50);

    // Switch to semantic view and enable line edit
    const semanticBtn = dom.window.document.querySelector('[data-view="semantic"]');
    if (!semanticBtn) throw new Error("Semantic view button not found");
    click(semanticBtn as Element);
    await waitForAsync(50);

    const toggle = dom.window.document.getElementById("line-edit-toggle");
    if (!toggle) throw new Error("Line edit toggle not found");
    click(toggle);
    await waitForAsync(50);

    const editable = dom.window.document.querySelector(".editable-line");
    if (!editable) throw new Error("Editable line not found");
    click(editable);

    const inputEl = dom.window.document.querySelector(".line-edit-input") as HTMLTextAreaElement | null;
    if (!inputEl) throw new Error("Line edit input not found");
    input(inputEl, "Updated line");
    blur(inputEl);

    const fetchCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls.some(([url, opts]) =>
      typeof url === "string" &&
      url.includes("/api/drafts/edit:code-review") &&
      (opts as RequestInit | undefined)?.method === "PUT"
    )).toBe(true);
  });

  test("TC-29: multiple line edits accumulate in same draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": {
        data: [
          { ...mockPrompts[0], content: "line one\nline two" },
          mockPrompts[1],
        ],
      },
      "/api/drafts": { data: { draftId: "edit:code-review" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    click(firstItem);
    await waitForAsync(50);

    const semanticBtn = dom.window.document.querySelector('[data-view="semantic"]');
    if (!semanticBtn) throw new Error("Semantic view button not found");
    click(semanticBtn as Element);
    const toggle = dom.window.document.getElementById("line-edit-toggle");
    if (!toggle) throw new Error("Line edit toggle not found");
    click(toggle);
    await waitForAsync(50);

    const editableLines = dom.window.document.querySelectorAll(".editable-line");
    if (editableLines.length < 2) throw new Error("Not enough editable lines");

    click(editableLines[0] as Element);
    const input1 = dom.window.document.querySelector(".line-edit-input") as HTMLTextAreaElement | null;
    if (!input1) throw new Error("Line edit input not found");
    input(input1, "Line one");
    blur(input1);

    click(editableLines[1] as Element);
    const input2 = dom.window.document.querySelector(".line-edit-input") as HTMLTextAreaElement | null;
    if (!input2) throw new Error("Line edit input not found");
    input(input2, "Line two");
    blur(input2);

    const draftCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => typeof url === "string" && url.includes("/api/drafts/"));
    const draftUrls = draftCalls.map(([url]) => url as string);
    expect(new Set(draftUrls).size).toBe(1);
  });

  test("TC-30: new prompt creates draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts": { data: { draftId: "new:abc123" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const newBtn = dom.window.document.getElementById("new-prompt-btn");
    if (!newBtn) throw new Error("New prompt button not found");
    click(newBtn);
    await waitForAsync(50);

    const slugInput = dom.window.document.getElementById("editor-slug") as HTMLInputElement | null;
    if (!slugInput) throw new Error("Editor slug input not found");
    vi.useFakeTimers();
    input(slugInput, "new-draft");
    vi.advanceTimersByTime(600);

    const fetchCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(fetchCalls.some(([url, opts]) =>
      typeof url === "string" &&
      url.includes("/api/drafts/new:") &&
      (opts as RequestInit | undefined)?.method === "PUT"
    )).toBe(true);
    vi.useRealTimers();
  });

  test("TC-31: multiple +New creates multiple drafts", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts": { data: { draftId: "new:abc123" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const newBtn = dom.window.document.getElementById("new-prompt-btn");
    if (!newBtn) throw new Error("New prompt button not found");
    click(newBtn);
    await waitForAsync(50);
    click(newBtn);
    await waitForAsync(50);

    const draftCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls
      .filter(([url]) => typeof url === "string" && url.includes("/api/drafts/new:"));
    expect(draftCalls.length).toBeGreaterThanOrEqual(2);
  });

  test("TC-35: clicking indicator navigates to draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts/edit:code-review": { data: { draftId: "edit:code-review", data: mockPrompts[0] } },
    });

    // Simulate shell:drafts:open message and assert draft opens in portlet
    postMessage(dom, { type: "shell:drafts:open", draftId: "edit:code-review" });
    await waitForAsync(100);

    const slugEl = dom.window.document.getElementById("prompt-slug");
    expect(slugEl?.textContent).toBe("code-review");
  });

  test("TC-38: save failure preserves draft", async () => {
    dom.window.fetch = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/drafts": { data: { draftId: "edit:code-review" } },
      "/api/prompts/code-review": { ok: false, status: 500, data: { error: "fail" } },
    });

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    click(firstItem);
    await waitForAsync(50);

    const editBtn = dom.window.document.getElementById("edit-btn");
    if (!editBtn) throw new Error("Edit button not found");
    click(editBtn);
    await waitForAsync(50);

    const nameInput = dom.window.document.getElementById("editor-name") as HTMLInputElement | null;
    if (!nameInput) throw new Error("Editor name input not found");
    input(nameInput, "Updated Name");

    const saveBtn = dom.window.document.getElementById("btn-save");
    if (!saveBtn) throw new Error("Save button not found");
    click(saveBtn);
    await waitForAsync(100);

    const fetchCalls = (dom.window.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls;
    const deleteDraftCalls = fetchCalls.filter(([url, opts]) =>
      typeof url === "string" &&
      url.includes("/api/drafts/") &&
      (opts as RequestInit | undefined)?.method === "DELETE"
    );
    expect(deleteDraftCalls.length).toBe(0);
  });

  test("TC-40: warning shown near expiration", async () => {
    dom.window.fetch = mockFetch({
      "/api/drafts/edit:code-review": {
        data: {
          draftId: "edit:code-review",
          data: mockPrompts[0],
          expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
        },
      },
    });

    postMessage(dom, { type: "shell:drafts:open", draftId: "edit:code-review" });
    await waitForAsync(100);

    const warning = dom.window.document.querySelector(".draft-expiry-warning");
    expect(warning).not.toBeNull();
  });
});
```

### `tests/service/ui/shell-history.test.ts` — 2 tests (MODIFY)

**TC-33, TC-34**

```typescript
describe("Draft Indicator", () => {
  it("TC-33: draft in other tab shows indicator", async () => {
    const dom = await loadShell();
    dom.window.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            count: 1,
            latestDraftId: "edit:code-review",
            hasExpiringSoon: false,
          }),
      }),
    ) as unknown as typeof fetch;

    vi.useFakeTimers();
    vi.advanceTimersByTime(15000);

    const indicator = dom.window.document.getElementById("draft-indicator");
    expect(indicator?.classList.contains("hidden")).toBe(false);
    vi.useRealTimers();
  });

  it("TC-34: draft exists shows unsaved indicator", async () => {
    const dom = await loadShell();

    dom.window.dispatchEvent(
      new dom.window.MessageEvent("message", {
        data: {
          type: "portlet:drafts",
          count: 2,
          latestDraftId: "edit:code-review",
          hasExpiringSoon: false,
        },
        origin: "http://localhost:5001",
      }),
    );

    const indicator = dom.window.document.getElementById("draft-indicator");
    expect(indicator?.classList.contains("hidden")).toBe(false);
  });
});
```

---

## Message Protocol

New messages for shell/portlet communication:

| Message | Direction | Purpose |
|---------|-----------|---------|
| `portlet:drafts` | Portlet → Shell | Notify shell of draft count (`count`, `latestDraftId`, `hasExpiringSoon`) |
| `shell:drafts:open` | Shell → Portlet | Request portlet open specific draft |

---

## Constraints

- Do not implement actual functionality — handlers throw NotImplementedError
- Only modify `src/ui/templates/shell.html`, `src/ui/templates/prompts.html`, and the listed test files
- Tests assert real behavior, not that NotImplementedError is thrown
- Existing 323 tests must continue to pass
- Follow shell/portlet message protocol from UI architecture doc
- Polling interval is 15 seconds (per tech design)
- Debounce interval is 500ms for draft saves

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # 323 existing PASS, 10 new ERROR
```

## Done When

- [ ] Draft indicator added to shell.html
- [ ] Draft polling (15s) implemented
- [ ] Draft state management added to prompts.html (edit + line edit + new)
- [ ] Message handlers stubbed with NotImplementedError
- [ ] 8 tests added to prompts-module.test.ts
- [ ] 2 tests added to shell-history.test.ts
- [ ] New tests ERROR with NotImplementedError
- [ ] Existing 323 tests still PASS
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (323 PASS, 10 ERROR).

---

## Epic Complete

After Story 5 green phase:
- 50 ACs delivered
- 48 TCs verified
- 55 new tests (278 → 333)
- Epic 02: Search & Select complete
