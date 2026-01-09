# Prompt 4.1: Skeleton + TDD Red

**Story:** UI Search & Pin/Favorite (Story 4)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Add search input to shell, pin/star controls to portlet, and write UI tests that assert real behavior. Tests will ERROR (not pass) because UI handlers are stubs.

## Prerequisites

Story 1 must be complete — these backend capabilities exist:
- `GET /api/prompts?q=&tags=&limit=` returns ranked, filtered prompts
- `PATCH /api/prompts/:slug/flags` updates pin/favorite
- `POST /api/prompts/:slug/usage` tracks usage
- Baseline tests pass:
  - If only Story 1 has run: 298 (278 + 20)
  - If Stories 0–2 already ran: 307 (278 + 20 + 9)
  - If Stories 0–3 already ran: 311 (278 + 20 + 9 + 4)

## Reference Documents

- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-1, AC-4, AC-5, AC-7, AC-16, AC-22..28
- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 3, Flow 4 UI sections
- UI Architecture: `docs/ui-arch-patterns-design.md` — Shell/portlet messaging

---

## Deliverables

### Shell Modifications — `src/ui/templates/shell.html`

Reuse the existing `#search-input` and `shell:filter` message (do not add a new input or new message type). If you need to adjust debounce or wiring, do it in the existing `searchInput` handler + `broadcastFilters()` block.

### Portlet Modifications — `src/ui/templates/prompts.html`

Add pin/star icons to prompt header and list items:

```html
<!-- Add to prompt header controls -->
<button id="pin-toggle" class="icon-button" title="Pin prompt">
  <span class="pin-icon"></span>
</button>
<button id="favorite-toggle" class="icon-button" title="Favorite prompt">
  <span class="star-icon"></span>
</button>
```

```javascript
// Add to prompts portlet JavaScript

// Handle filter message from shell (query + tags)
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'shell:filter') {
    handleFilter(event.data.query, event.data.tags);
  }
});

function handleFilter(query, tags) {
  throw new Error("NotImplementedError: handleFilter not implemented");
}

// Pin/favorite toggle handlers
function handlePinToggle(slug, currentPinned) {
  throw new Error("NotImplementedError: handlePinToggle not implemented");
}

function handleFavoriteToggle(slug, currentFavorited) {
  throw new Error("NotImplementedError: handleFavoriteToggle not implemented");
}

function handleOptimisticRollback(slug, previousFlags) {
  throw new Error("NotImplementedError: handleOptimisticRollback not implemented");
}

// Render list with pin/star icons
function renderPromptListItem(prompt) {
  throw new Error("NotImplementedError: renderPromptListItem not implemented");
}

// Empty states
function renderEmptyState(type) {
  // type: 'no-prompts' | 'no-matches'
  throw new Error("NotImplementedError: renderEmptyState not implemented");
}
```

**UI testing hooks (for deterministic tests):**
- Set `aria-pressed="true|false"` on `#pin-toggle` and `#favorite-toggle`.
- In list items, render a `.prompt-pin` element when pinned and a `.prompt-star` element when favorited.

### Prompt Copy Tracking — `src/ui/templates/prompts.html`

Add copy → usage tracking in the existing `copyContent()` handler:

```javascript
// After successful clipboard write
fetch(`/api/prompts/${selectedSlug}/usage`, {
  method: "POST",
  keepalive: true,
}).catch(() => {}); // fire-and-forget
```

---

## Tests to Write

### `tests/service/ui/prompts-module.test.ts` — 11 tests (MODIFY)

**TC-1, TC-3, TC-4, TC-14, TC-20..26**

Use the shared UI test helpers (`loadTemplate`, `mockFetch`, `postMessage`, `click`, `waitForAsync`):

```typescript
import { describe, test, expect, beforeEach } from "vitest";
import { loadTemplate, mockPrompts, mockFetch, postMessage, waitForAsync } from "./setup";
import type { JSDOM } from "jsdom";

describe("UI Search & Pin/Favorite", () => {
  let dom: JSDOM;

  beforeEach(async () => {
    dom = await loadTemplate("prompts.html");
  });

  test("TC-1: typing in search filters prompts", async () => {
    const fetchMock = mockFetch({ "/api/prompts": { data: mockPrompts } });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);
    fetchMock.mockClear();

    postMessage(dom, { type: "shell:filter", query: "sql", tags: [] });
    await waitForAsync(100);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/prompts?q=sql"),
      expect.any(Object)
    );
  });

  test("TC-3: empty search shows all prompts", async () => {
    const fetchMock = mockFetch({ "/api/prompts": { data: mockPrompts } });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);
    fetchMock.mockClear();

    postMessage(dom, { type: "shell:filter", query: "", tags: [] });
    await waitForAsync(100);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/prompts",
      expect.any(Object)
    );
  });

  test("TC-4: no matches shows empty state message", async () => {
    const fetchMock = mockFetch({ "/api/prompts": { data: [] } });
    dom.window.fetch = fetchMock;

    postMessage(dom, { type: "shell:filter", query: "xyz", tags: [] });
    await waitForAsync(100);

    const empty = dom.window.document.getElementById("empty-state");
    expect(empty?.textContent?.toLowerCase()).toContain("no prompts match");
  });

  test("TC-14: zero prompts shows create CTA", async () => {
    const fetchMock = mockFetch({ "/api/prompts": { data: [] } });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const empty = dom.window.document.getElementById("empty-state");
    expect(empty?.textContent?.toLowerCase()).toContain("create your first");
  });

  test("TC-20: clicking pin icon pins prompt", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/prompts/code-review/flags": { data: { updated: true } },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    firstItem.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await waitForAsync(50);

    const pinToggle = dom.window.document.getElementById("pin-toggle");
    if (!pinToggle) throw new Error("Pin toggle not found");
    pinToggle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/prompts/code-review/flags"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(pinToggle.getAttribute("aria-pressed")).toBe("true");
  });

  test("TC-21: clicking pin on pinned prompt unpins", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: [{ ...mockPrompts[0], pinned: true }, mockPrompts[1]] },
      "/api/prompts/code-review/flags": { data: { updated: true } },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    firstItem.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await waitForAsync(50);

    const pinToggle = dom.window.document.getElementById("pin-toggle");
    if (!pinToggle) throw new Error("Pin toggle not found");
    pinToggle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/prompts/code-review/flags"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(pinToggle.getAttribute("aria-pressed")).toBe("false");
  });

  test("TC-22: clicking star icon favorites prompt", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/prompts/code-review/flags": { data: { updated: true } },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    firstItem.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await waitForAsync(50);

    const starToggle = dom.window.document.getElementById("favorite-toggle");
    if (!starToggle) throw new Error("Favorite toggle not found");
    starToggle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/prompts/code-review/flags"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(starToggle.getAttribute("aria-pressed")).toBe("true");
  });

  test("TC-23: clicking star on favorited prompt unfavorites", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: [{ ...mockPrompts[0], favorited: true }, mockPrompts[1]] },
      "/api/prompts/code-review/flags": { data: { updated: true } },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    firstItem.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await waitForAsync(50);

    const starToggle = dom.window.document.getElementById("favorite-toggle");
    if (!starToggle) throw new Error("Favorite toggle not found");
    starToggle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/prompts/code-review/flags"),
      expect.objectContaining({ method: "PATCH" })
    );
    expect(starToggle.getAttribute("aria-pressed")).toBe("false");
  });

  test("TC-24: pin/favorite changes reflect immediately", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: mockPrompts },
      "/api/prompts/code-review/flags": { data: { updated: true } },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const firstItem = dom.window.document.querySelector(".prompt-item");
    if (!firstItem) throw new Error("Prompt item not found");
    firstItem.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    await waitForAsync(50);

    const pinToggle = dom.window.document.getElementById("pin-toggle");
    if (!pinToggle) throw new Error("Pin toggle not found");

    // Simulate optimistic UI update: aria-pressed should flip immediately
    pinToggle.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
    expect(pinToggle.getAttribute("aria-pressed")).toBe("true");
  });

  test("TC-25: pinned prompt shows pin icon in list", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: [{ ...mockPrompts[0], pinned: true }, mockPrompts[1]] },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const pinnedItem = dom.window.document.querySelector(".prompt-item");
    if (!pinnedItem) throw new Error("Prompt item not found");
    expect(pinnedItem.querySelector(".prompt-pin")).not.toBeNull();
  });

  test("TC-26: favorited prompt shows star icon in list", async () => {
    const fetchMock = mockFetch({
      "/api/prompts": { data: [{ ...mockPrompts[0], favorited: true }, mockPrompts[1]] },
    });
    dom.window.fetch = fetchMock;

    dom.window.loadPrompts();
    await waitForAsync(100);

    const favItem = dom.window.document.querySelector(".prompt-item");
    if (!favItem) throw new Error("Prompt item not found");
    expect(favItem.querySelector(".prompt-star")).not.toBeNull();
  });

});
```

### `tests/service/ui/shell-history.test.ts` — 1 test (MODIFY)

**TC-6**

```typescript
describe("Search Performance", () => {
  it("TC-6: rapid typing remains responsive", async () => {
    const dom = await loadShell();
    const iframe = dom.window.document.getElementById("main-module") as HTMLIFrameElement;
    const portlet = { postMessage: vi.fn() };
    Object.defineProperty(iframe, "contentWindow", { value: portlet, writable: true });

    const searchInput = dom.window.document.getElementById("search-input") as HTMLInputElement;
    vi.useFakeTimers();

    for (const char of "kubernetes") {
      searchInput.value += char;
      searchInput.dispatchEvent(new dom.window.Event("input"));
      vi.advanceTimersByTime(30);
    }

    vi.advanceTimersByTime(200);

    // Assert: debounce collapses rapid typing into a single filter broadcast
    expect(portlet.postMessage).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
```

---

## Constraints

- Do not implement actual functionality — handlers throw NotImplementedError
- Do not modify Story 0-3 files
- Tests assert real behavior, not that NotImplementedError is thrown
- Existing 298 tests must continue to pass
- Follow shell/portlet message protocol from UI architecture doc

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # 311 existing PASS, 12 new ERROR
```

## Done When

- [ ] Search filter wiring verified in shell.html (no new input)
- [ ] Pin/star icons added to prompts.html
- [ ] Copy → usage tracking added to prompts.html
- [ ] Message handlers stubbed with NotImplementedError
- [ ] 11 tests added to prompts-module.test.ts
- [ ] 1 test added to shell-history.test.ts
- [ ] New tests ERROR with NotImplementedError
- [ ] Existing 298 tests still PASS
- [ ] TypeScript compiles

After completion, summarize: which files were created/modified, how many tests were added, and confirm the expected test state (311 PASS, 12 ERROR).
