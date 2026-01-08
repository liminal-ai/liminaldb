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

Replace the stub with actual implementation:

```javascript
// Track current filter state
let currentQuery = '';
let currentTags = [];

function handleFilter(query, tags) {
  currentQuery = query || '';
  currentTags = tags || [];

  // Build URL with query params
  let url = '/api/prompts';
  const params = new URLSearchParams();

  if (currentQuery) {
    params.set('q', currentQuery);
  }
  if (currentTags.length > 0) {
    params.set('tags', currentTags.join(','));
  }

  if (params.toString()) {
    url += '?' + params.toString();
  }

  // Fetch and render
  fetch(url, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
    .then(res => res.json())
    .then(({ data }) => {
      if (data.length === 0) {
        if (currentQuery || currentTags.length > 0) {
          renderEmptyState('no-matches');
        } else {
          renderEmptyState('no-prompts');
        }
      } else {
        renderPromptList(data);
      }
    })
    .catch(err => {
      console.error('Filter failed:', err);
      showToast('Failed to filter prompts', 'error');
    });
}
```

### 2. Implement Pin/Favorite Handlers — `src/ui/templates/prompts.html`

```javascript
// Current prompt state (for optimistic updates)
let currentPromptFlags = { pinned: false, favorited: false };

function handlePinToggle(slug, currentPinned) {
  const newPinned = !currentPinned;

  // Optimistic UI update
  updatePinUI(slug, newPinned);
  currentPromptFlags.pinned = newPinned;

  // API call
  fetch(`/api/prompts/${slug}/flags`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ pinned: newPinned })
  })
    .then(res => {
      if (!res.ok) throw new Error('Pin update failed');
      // Refresh list to get new order
      loadPrompts();
    })
    .catch(err => {
      console.error('Pin toggle failed:', err);
      // Rollback
      handleOptimisticRollback(slug, { pinned: currentPinned, favorited: currentPromptFlags.favorited });
      showToast('Failed to update pin status', 'error');
    });
}

function handleFavoriteToggle(slug, currentFavorited) {
  const newFavorited = !currentFavorited;

  // Optimistic UI update
  updateFavoriteUI(slug, newFavorited);
  currentPromptFlags.favorited = newFavorited;

  // API call
  fetch(`/api/prompts/${slug}/flags`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ favorited: newFavorited })
  })
    .then(res => {
      if (!res.ok) throw new Error('Favorite update failed');
      // Refresh list to get new order
      loadPrompts();
    })
    .catch(err => {
      console.error('Favorite toggle failed:', err);
      // Rollback
      handleOptimisticRollback(slug, { pinned: currentPromptFlags.pinned, favorited: currentFavorited });
      showToast('Failed to update favorite status', 'error');
    });
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
    pinButton.title = pinned ? 'Unpin prompt' : 'Pin prompt';
  }

  // Update list item
  const listItem = document.querySelector(`[data-slug="${slug}"] .pin-indicator`);
  if (listItem) {
    listItem.classList.toggle('hidden', !pinned);
  }
}

function updateFavoriteUI(slug, favorited) {
  const starButton = document.getElementById('favorite-toggle');
  if (starButton) {
    starButton.classList.toggle('active', favorited);
    starButton.title = favorited ? 'Unfavorite prompt' : 'Favorite prompt';
  }

  // Update list item
  const listItem = document.querySelector(`[data-slug="${slug}"] .favorite-indicator`);
  if (listItem) {
    listItem.classList.toggle('hidden', !favorited);
  }
}
```

### 3. Implement List Rendering with Icons — `src/ui/templates/prompts.html`

```javascript
function renderPromptListItem(prompt) {
  const item = document.createElement('div');
  item.className = 'prompt-list-item';
  item.dataset.slug = prompt.slug;

  const pinIndicator = prompt.pinned
    ? '<span class="pin-indicator" title="Pinned">📌</span>'
    : '<span class="pin-indicator hidden">📌</span>';

  const favoriteIndicator = prompt.favorited
    ? '<span class="favorite-indicator" title="Favorited">⭐</span>'
    : '<span class="favorite-indicator hidden">⭐</span>';

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
  emptyState.classList.add('hidden');

  for (const prompt of prompts) {
    list.appendChild(renderPromptListItem(prompt));
  }
}
```

### 4. Implement Empty States — `src/ui/templates/prompts.html`

```javascript
function renderEmptyState(type) {
  const list = document.getElementById('prompt-list');
  const emptyState = document.getElementById('empty-state');

  list.innerHTML = '';
  emptyState.classList.remove('hidden');

  if (type === 'no-prompts') {
    emptyState.innerHTML = `
      <div class="empty-state-content">
        <p>Create your first prompt to get started.</p>
        <button onclick="enterNewMode()" class="btn-primary">+ New Prompt</button>
      </div>
    `;
  } else if (type === 'no-matches') {
    emptyState.innerHTML = `
      <div class="empty-state-content">
        <p>No prompts match your search.</p>
        <button onclick="clearSearch()" class="btn-secondary">Clear Search</button>
      </div>
    `;
  }
}

function clearSearch() {
  currentQuery = '';
  currentTags = [];
  // Notify shell to clear search input
  window.parent.postMessage({ type: 'portlet:clearSearch' }, window.location.origin);
  loadPrompts();
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
// Fire-and-forget usage tracking
fetch(`/api/prompts/${selectedSlug}/usage`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${getToken()}` },
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
bun run test        # All 316 tests should PASS
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

- [ ] All 316 tests PASS (304 + 12)
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] No console errors in browser

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.
