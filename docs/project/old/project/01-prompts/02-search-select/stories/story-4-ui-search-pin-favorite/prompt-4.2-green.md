# Prompt 4.2: TDD Green

**Story:** UI Search & Pin/Favorite (Story 4)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the UI handlers to make all Story 4 tests pass.

## Prerequisites

Prompt 4.1 must be complete — stubs and tests in place:
- `src/ui/templates/prompts.html` — stub handlers for filter, pin, favorite
- `tests/service/ui/prompts-module.test.ts` — 11 new tests (ERROR)
- `tests/service/ui/shell-history.test.ts` — 1 new test (ERROR)
- Stories 1-3 backend APIs working

## Reference Documents

- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 3, Flow 4 UI
- UI Architecture: `docs/ui-arch-patterns-design.md` — Shell/portlet messaging
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-1..7, AC-22..28

---

## Deliverables

### 1. Implement Filter Handler — `src/ui/templates/prompts.html`

**Note:** The existing `loadPrompts(query, tags)` function already handles filtering. Story 4 extends it with empty state rendering. The shell:filter → loadPrompts wiring already exists and should not be replaced.

Update the existing `loadPrompts` to handle empty states:

```javascript
// Track current filter state (add if not present)
let currentQuery = '';
let currentTags = [];

async function loadPrompts(query = '', tags = []) {
  currentQuery = query;
  currentTags = tags;

  // Build URL with query params (existing pattern)
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) {
    params.set('q', trimmed);
  }
  if (tags.length > 0) {
    params.set('tags', tags.join(','));
  }

  const queryString = params.toString();
  const url = queryString ? `/api/prompts?${queryString}` : '/api/prompts';

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'content-type': 'application/json' }
    });

    if (!response.ok) throw new Error('Failed to load prompts');

    // API returns array directly (not { data: [...] })
    const prompts = await response.json();

    if (prompts.length === 0) {
      if (currentQuery || currentTags.length > 0) {
        renderEmptyState('no-matches');
      } else {
        renderEmptyState('no-prompts');
      }
    } else {
      renderPromptList(prompts);
    }
  } catch (err) {
    console.error('Filter failed:', err);
    showToast('Failed to filter prompts', { type: 'error' });
  }
}
```

### 2. Implement Pin/Favorite Handlers — `src/ui/templates/prompts.html`

**Note:** Uses cookie auth (no Authorization header needed). Toast API is `showToast(msg, { type })`.

```javascript
// Current prompt state (for optimistic updates)
let currentPromptFlags = { pinned: false, favorited: false };

async function handlePinToggle(slug, currentPinned) {
  const newPinned = !currentPinned;

  // Optimistic UI update
  updatePinUI(slug, newPinned);
  currentPromptFlags.pinned = newPinned;

  try {
    // API call (cookie auth - no Authorization header needed)
    const res = await fetch(`/api/prompts/${slug}/flags`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pinned: newPinned })
    });

    if (!res.ok) throw new Error('Pin update failed');

    // Refresh list to get new order (preserving current filters)
    await loadPrompts(currentQuery, currentTags);
  } catch (err) {
    console.error('Pin toggle failed:', err);
    // Rollback
    handleOptimisticRollback(slug, { pinned: currentPinned, favorited: currentPromptFlags.favorited });
    showToast('Failed to update pin status', { type: 'error' });
  }
}

async function handleFavoriteToggle(slug, currentFavorited) {
  const newFavorited = !currentFavorited;

  // Optimistic UI update
  updateFavoriteUI(slug, newFavorited);
  currentPromptFlags.favorited = newFavorited;

  try {
    // API call (cookie auth - no Authorization header needed)
    const res = await fetch(`/api/prompts/${slug}/flags`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ favorited: newFavorited })
    });

    if (!res.ok) throw new Error('Favorite update failed');

    // Refresh list to get new order (preserving current filters)
    await loadPrompts(currentQuery, currentTags);
  } catch (err) {
    console.error('Favorite toggle failed:', err);
    // Rollback
    handleOptimisticRollback(slug, { pinned: currentPromptFlags.pinned, favorited: currentFavorited });
    showToast('Failed to update favorite status', { type: 'error' });
  }
}

function handleOptimisticRollback(slug, previousFlags) {
  updatePinUI(slug, previousFlags.pinned);
  updateFavoriteUI(slug, previousFlags.favorited);
  currentPromptFlags = previousFlags;
}

function updatePinUI(slug, pinned) {
  const pinButton = document.getElementById('pin-toggle');
  if (pinButton) {
    pinButton.classList.toggle('active', pinned);
    pinButton.setAttribute('aria-pressed', String(pinned));
    pinButton.title = pinned ? 'Unpin prompt' : 'Pin prompt';
  }

  // Update list item (use .prompt-pin class to match test hooks)
  const listItem = document.querySelector(`[data-slug="${slug}"] .prompt-pin`);
  if (listItem) {
    listItem.style.display = pinned ? '' : 'none';
  }
}

function updateFavoriteUI(slug, favorited) {
  const starButton = document.getElementById('favorite-toggle');
  if (starButton) {
    starButton.classList.toggle('active', favorited);
    starButton.setAttribute('aria-pressed', String(favorited));
    starButton.title = favorited ? 'Unfavorite prompt' : 'Favorite prompt';
  }

  // Update list item (use .prompt-star class to match test hooks)
  const listItem = document.querySelector(`[data-slug="${slug}"] .prompt-star`);
  if (listItem) {
    listItem.style.display = favorited ? '' : 'none';
  }
}
```

### 3. Implement List Rendering with Icons — `src/ui/templates/prompts.html`

**Note:** Use `.prompt-pin` and `.prompt-star` classes to match test hooks.

```javascript
function renderPromptListItem(prompt) {
  const item = document.createElement('div');
  item.className = 'prompt-list-item';
  item.dataset.slug = prompt.slug;

  // Use .prompt-pin and .prompt-star classes (test hooks)
  const pinIndicator = prompt.pinned
    ? '<span class="prompt-pin" title="Pinned">📌</span>'
    : '<span class="prompt-pin" style="display:none">📌</span>';

  const favoriteIndicator = prompt.favorited
    ? '<span class="prompt-star" title="Favorited">⭐</span>'
    : '<span class="prompt-star" style="display:none">⭐</span>';

  item.innerHTML = `
    <div class="prompt-item-content">
      <span class="prompt-name">${escapeHtml(prompt.name)}</span>
      <span class="prompt-indicators">
        ${pinIndicator}
        ${favoriteIndicator}
      </span>
    </div>
  `;

  item.addEventListener('click', () => selectPrompt(prompt.slug));

  return item;
}

function renderPromptList(prompts) {
  const list = document.getElementById('prompt-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';
  if (emptyState) emptyState.style.display = 'none';

  for (const prompt of prompts) {
    list.appendChild(renderPromptListItem(prompt));
  }
}
```

### 4. Implement Empty States — `src/ui/templates/prompts.html`

**Note:** The "Clear Search" button reloads prompts without filters. The shell's search input state is managed separately - this just clears the portlet's filter state.

```javascript
function renderEmptyState(type) {
  const list = document.getElementById('prompt-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';
  if (emptyState) emptyState.style.display = '';

  if (type === 'no-prompts') {
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="empty-state-content">
          <p>Create your first prompt to get started.</p>
          <button onclick="enterNewMode()" class="btn-primary">+ New Prompt</button>
        </div>
      `;
    }
  } else if (type === 'no-matches') {
    if (emptyState) {
      emptyState.innerHTML = `
        <div class="empty-state-content">
          <p>No prompts match your search.</p>
        </div>
      `;
    }
  }
}
```

### 5. Wire Up Pin/Favorite Buttons — `src/ui/templates/prompts.html`

```javascript
// In the prompt header setup
document.getElementById('pin-toggle').addEventListener('click', () => {
  if (selectedSlug) {
    handlePinToggle(selectedSlug, currentPromptFlags.pinned);
  }
});

document.getElementById('favorite-toggle').addEventListener('click', () => {
  if (selectedSlug) {
    handleFavoriteToggle(selectedSlug, currentPromptFlags.favorited);
  }
});

// Update flags when prompt selected
function onPromptSelected(prompt) {
  currentPromptFlags = {
    pinned: prompt.pinned ?? false,
    favorited: prompt.favorited ?? false,
  };
  updatePinUI(prompt.slug, currentPromptFlags.pinned);
  updateFavoriteUI(prompt.slug, currentPromptFlags.favorited);
}
```

### 6. Add Copy → Usage Tracking — `src/ui/templates/prompts.html`

In the existing `copyContent()` function, add after successful clipboard write:

```javascript
// Fire-and-forget usage tracking (cookie auth - no headers needed)
fetch(`/api/prompts/${selectedSlug}/usage`, {
  method: 'POST',
  keepalive: true,
}).catch(() => {}); // Ignore failures
```

---

## Constraints

- Do not modify backend files (Stories 1-3)
- Do not implement draft UI (Story 5)
- Follow existing UI patterns in the codebase
- Use existing shell/portlet message protocol

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # All tests should PASS (baseline + 12 Story 4 tests)
```

### Manual Verification

1. Start server: `bun run dev`
2. Open app in browser
3. **Search:** Type in search box, prompts filter as you type
4. **Empty search:** Clear search, all prompts shown
5. **No matches:** Search for gibberish, "No prompts match" shown
6. **Pin:** Click pin icon, prompt moves to top of list
7. **Unpin:** Click pin again, prompt returns to ranked position
8. **Favorite:** Click star icon, star appears in list
9. **Unfavorite:** Click star again, star disappears
10. **Copy tracking:** Copy a prompt, check usageCount incremented (via API)

## Done When

- [ ] All tests PASS (baseline + 12 new = 331 total from 319 baseline)
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] No console errors in browser

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
