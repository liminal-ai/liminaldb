# Prompt 5.2: TDD Green

**Story:** UI Durable Drafts (Story 5)

**Working Directory:** `/Users/leemoore/promptdb`

## Objective

Implement the UI draft management handlers to make all Story 5 tests pass.

## Prerequisites

Prompt 5.1 must be complete — stubs and tests in place:
- `src/ui/templates/shell.html` — draft indicator, polling stub
- `src/ui/templates/prompts.html` — draft handlers stubbed
- `tests/service/ui/prompts-module.test.ts` — 8 new tests (ERROR)
- `tests/service/ui/shell-history.test.ts` — 2 new tests (ERROR)
- Story 3 draft API working
- Story 4 search/pin UI working

## Reference Documents

- Tech Design: `docs/epics/02-search-select/02.search.select.tech-design.md` — Flow 4: Durable Drafts
- UI Architecture: `docs/ui-arch-patterns-design.md` — Shell/portlet messaging
- Feature Spec: `docs/epics/02-search-select/01.search.select.feature.md` — AC-29..42

---

## Deliverables

### 1. Implement Draft Indicator — `src/ui/templates/shell.html`

Replace the stubs with actual implementations:

```javascript
let draftPollingInterval = null;
let currentDraftSummary = { count: 0, latestDraftId: null, hasExpiringSoon: false };

function startDraftPolling() {
  // Initial fetch
  fetchDraftSummary();

  // Poll every 15 seconds
  draftPollingInterval = setInterval(fetchDraftSummary, 15000);
}

async function fetchDraftSummary() {
  try {
    const response = await fetch('/api/drafts/summary', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!response.ok) return;

    const summary = await response.json();
    updateDraftIndicator(summary);
  } catch (e) {
    console.error('Draft polling failed:', e);
  }
}

function updateDraftIndicator(summary) {
  currentDraftSummary = summary;

  const indicator = document.getElementById('draft-indicator');
  const countEl = document.getElementById('draft-count');

  if (summary.count > 0) {
    indicator.classList.remove('hidden');
    countEl.textContent = summary.count;

    if (summary.hasExpiringSoon) {
      indicator.classList.add('expiring-soon');
    } else {
      indicator.classList.remove('expiring-soon');
    }
  } else {
    indicator.classList.add('hidden');
  }
}

function handleDraftIndicatorClick() {
  if (currentDraftSummary.latestDraftId) {
    // Tell portlet to open the draft
    const portlet = document.getElementById('main-module');
    if (portlet && portlet.contentWindow) {
      portlet.contentWindow.postMessage({
        type: 'shell:drafts:open',
        draftId: currentDraftSummary.latestDraftId
      }, window.location.origin);
    }
  }
}

// Wire up click handler
document.getElementById('draft-indicator').addEventListener('click', handleDraftIndicatorClick);

// Handle draft updates from portlet
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'portlet:drafts') {
    updateDraftIndicator({
      count: event.data.count,
      latestDraftId: event.data.latestDraftId,
      hasExpiringSoon: event.data.hasExpiringSoon
    });
  }
});

// Start polling on load
startDraftPolling();
```

### 2. Implement Draft Management — `src/ui/templates/prompts.html`

```javascript
// Draft state
let currentDraftId = null;
let draftDebounceTimer = null;
const DRAFT_DEBOUNCE_MS = 500;
const EXPIRY_WARNING_MS = 2 * 60 * 60 * 1000; // 2 hours

// Auto-save to draft on edit
function handleEditModeChange(field, value) {
  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(() => {
    saveToDraft();
  }, DRAFT_DEBOUNCE_MS);
}

async function saveToDraft() {
  const draftId = currentDraftId || generateDraftId();

  const draftData = {
    type: currentDraftId?.startsWith('new:') ? 'new' : 'edit',
    promptSlug: selectedSlug,
    data: {
      slug: getFieldValue('slug') || selectedSlug,
      name: getFieldValue('name'),
      description: getFieldValue('description'),
      content: getFieldValue('content'),
      tags: getCurrentTags(),
    }
  };

  try {
    const response = await fetch(`/api/drafts/${draftId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${getToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(draftData)
    });

    if (!response.ok) throw new Error('Draft save failed');

    const draft = await response.json();
    currentDraftId = draft.draftId;

    // Notify shell of draft update
    notifyShellOfDrafts();

    // Check expiration warning
    checkDraftExpiration(draft);

  } catch (err) {
    console.error('Draft save failed:', err);
    // Don't show error toast for draft saves - just log
  }
}

function generateDraftId() {
  if (selectedSlug && mode === 'edit') {
    return `edit:${selectedSlug}`;
  } else if (mode === 'line') {
    return `line:${selectedSlug}`;
  } else {
    return `new:${crypto.randomUUID()}`;
  }
}

// Line edit handler - accumulates in draft
function handleLineEdit(field, value) {
  // Store in draft, not immediate save
  if (!currentDraftId && selectedSlug) {
    currentDraftId = `line:${selectedSlug}`;
  }

  clearTimeout(draftDebounceTimer);
  draftDebounceTimer = setTimeout(() => {
    saveToDraft();
  }, DRAFT_DEBOUNCE_MS);
}

// +New creates draft entry
function handleNewPrompt() {
  currentDraftId = `new:${crypto.randomUUID()}`;
  enterNewMode();

  // Save initial empty draft
  setTimeout(() => saveToDraft(), 100);
}

// Save button commits draft to Convex
async function handleSave() {
  if (!currentDraftId) {
    // No draft, do normal save
    await savePrompt();
    return;
  }

  try {
    // Get draft data
    const response = await fetch(`/api/drafts/${currentDraftId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!response.ok) {
      // Draft not found, do normal save
      await savePrompt();
      return;
    }

    const draft = await response.json();

    // Commit to Convex
    const saveSuccess = await savePromptFromDraft(draft.data);

    if (saveSuccess) {
      // Delete the draft
      await fetch(`/api/drafts/${currentDraftId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });

      currentDraftId = null;
      notifyShellOfDrafts();
      showToast('Prompt saved', 'success');
    }
  } catch (err) {
    console.error('Save failed:', err);
    showToast('Save failed - draft preserved', 'error');
    // Draft is preserved on failure
  }
}

// Discard button clears draft from Redis
async function handleDiscard() {
  if (!currentDraftId) return;

  try {
    await fetch(`/api/drafts/${currentDraftId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    currentDraftId = null;
    notifyShellOfDrafts();

    // Reload prompt to discard changes
    if (selectedSlug) {
      loadPrompt(selectedSlug);
    } else {
      exitEditMode();
    }

    showToast('Changes discarded', 'info');
  } catch (err) {
    console.error('Discard failed:', err);
    showToast('Failed to discard', 'error');
  }
}

// Handle save failure - preserves draft
function handleSaveFailure(error) {
  console.error('Save failed:', error);
  showToast('Save failed - your changes are preserved as a draft', 'error');
  // currentDraftId remains set, draft stays in Redis
}

// Expiration warning
function checkDraftExpiration(draft) {
  const timeRemaining = draft.expiresAt - Date.now();

  if (timeRemaining < EXPIRY_WARNING_MS) {
    showDraftExpirationWarning(timeRemaining);
  }
}

function showDraftExpirationWarning(timeRemaining) {
  const hours = Math.floor(timeRemaining / (60 * 60 * 1000));
  const minutes = Math.floor((timeRemaining % (60 * 60 * 1000)) / (60 * 1000));

  const warningEl = document.getElementById('draft-expiration-warning');
  if (warningEl) {
    warningEl.textContent = `Draft expires in ${hours}h ${minutes}m`;
    warningEl.classList.remove('hidden');
  }
}

// Notify shell of draft changes
async function notifyShellOfDrafts() {
  try {
    const response = await fetch('/api/drafts/summary', {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (response.ok) {
      const summary = await response.json();
      window.parent.postMessage({
        type: 'portlet:drafts',
        count: summary.count,
        latestDraftId: summary.latestDraftId,
        hasExpiringSoon: summary.hasExpiringSoon
      }, window.location.origin);
    }
  } catch {
    // Ignore - shell will poll anyway
  }
}

// Handle shell request to open draft
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;

  if (event.data.type === 'shell:drafts:open') {
    openDraft(event.data.draftId);
  }
});

async function openDraft(draftId) {
  try {
    const response = await fetch(`/api/drafts/${draftId}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!response.ok) {
      showToast('Draft not found', 'error');
      return;
    }

    const draft = await response.json();
    currentDraftId = draftId;

    // Load draft data into editor
    if (draft.type === 'new') {
      enterNewMode();
      populateFields(draft.data);
    } else {
      selectPrompt(draft.promptSlug);
      setTimeout(() => {
        enterEditMode();
        populateFields(draft.data);
      }, 100);
    }

    checkDraftExpiration(draft);
  } catch (err) {
    console.error('Failed to open draft:', err);
    showToast('Failed to open draft', 'error');
  }
}
```

### 3. Wire Up Edit Mode → Draft — `src/ui/templates/prompts.html`

Modify existing edit mode handlers to use drafts:

```javascript
// In existing field change handlers
function onFieldChange(field, value) {
  isDirty = true;
  handleEditModeChange(field, value);
}

// In existing line edit completion
function onLineEditComplete(field, value) {
  handleLineEdit(field, value);
}

// Wire +New button to use draft
document.getElementById('new-prompt-btn').addEventListener('click', handleNewPrompt);

// Wire Save/Discard buttons
document.getElementById('save-btn').addEventListener('click', handleSave);
document.getElementById('discard-btn').addEventListener('click', handleDiscard);
```

---

## Constraints

- Do not modify backend files (Stories 1-3)
- Do not modify search/pin UI implementation (Story 4)
- Follow existing UI patterns in the codebase
- Use existing shell/portlet message protocol

## Verification

```bash
bun run typecheck   # Should pass
bun run test        # All 333 tests should PASS
```

### Manual Verification

1. Start Redis: `redis-server`
2. Start server: `bun run dev`
3. Open app in browser

**Test scenarios:**

1. **Edit mode draft:** Edit a prompt, refresh browser, changes preserved
2. **Line edit draft:** Make line edit in view mode, refresh, changes preserved
3. **Multiple drafts:** Click +New multiple times, each creates separate draft
4. **Cross-tab:** Open second tab, see draft indicator from first tab
5. **Save commits:** Click Save, changes committed to Convex, draft deleted
6. **Discard clears:** Click Discard, changes gone, draft deleted
7. **Save failure:** Disconnect network, click Save, draft preserved
8. **Expiration warning:** Wait until draft is < 2 hours from expiry, warning appears

## Done When

- [ ] All 333 tests PASS (323 + 10)
- [ ] TypeScript compiles
- [ ] Manual verification passes
- [ ] Drafts persist across refreshes
- [ ] No console errors in browser

After completion, summarize: which files were modified, how many tests now pass, and confirm manual verification results.

---

## Epic Complete

After Story 5 green phase:
- 50 ACs delivered
- 48 TCs verified
- 55 new tests (278 → 333)
- Epic 02: Search & Select complete
