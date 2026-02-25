# UI Architecture, Patterns & Design

> Source of truth for LiminalDB's UI architecture.

---

## 1. Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Shell** | The outer chrome that hosts portlets. Owns header, navigation, history management. Single HTML page. | `shell.html` |
| **Portlet** | A self-contained iframe page that provides a complete UI surface. Owns its DOM, internal state, and components. | `prompts.html` |
| **Component** | A reusable JavaScript widget mounted inside a portlet. Handles specific rendering/interaction concerns. | `prompt-viewer.js` |
| **Module Route** | Server route that serves portlet HTML directly (no shell). Used for iframe `src`. | `/_m/prompts` |
| **App Route** | Server route that serves shell with a portlet embedded. Used for direct navigation. | `/prompts`, `/prompts/:slug` |

**Hierarchy:**
```
Shell (shell.html)
└── Portlet (prompts.html via iframe)
    └── Component (prompt-viewer.js)
```

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  SHELL (shell.html)                                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ [Search]  [Tags ▼]  [× sql]      LIMINALDB    user@email  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                                                           │  │
│  │   PORTLET (iframe src="/_m/prompts")                      │  │
│  │   ┌─────────────┬───────────────────────────────────────┐ │  │
│  │   │             │  COMPONENT (prompt-viewer.js)         │ │  │
│  │   │             │  ┌─────────────────────────────────┐  │ │  │
│  │   │ Prompt A    │  │ [Edit] [Copy] [Rend][Sem][Plain]│  │ │  │
│  │   │ Prompt B ◀  │  │                                 │  │ │  │
│  │   │ Prompt C    │  │  Rendered prompt content...     │  │ │  │
│  │   │             │  │                                 │  │ │  │
│  │   │             │  ├─────────────────────────────────┤  │ │  │
│  │   │             │  │ tags: 2  vars: 4  chars: 450    │  │ │  │
│  │   │             │  └─────────────────────────────────┘  │ │  │
│  │   └─────────────┴───────────────────────────────────────┘ │  │
│  │                                                           │  │
│  │   Mode: view | edit | new (insert)                        │  │
│  │   - view: prompt-viewer.js displayed                      │  │
│  │   - edit: prompt-editor.js with existing data             │  │
│  │   - new:  prompt-editor.js with empty form (batch staging)│  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │ 42 prompts          [+ New]          [Import / Export]     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**Data flow:**
```
Browser URL ──→ Shell ──→ iframe src ──→ Portlet ──→ API
                 │                          │
                 │←── postMessage ──────────┘
                 │
            history.pushState()
```

---

## 3. Shell

### Responsibilities

| Owns | Does Not Own |
|------|--------------|
| Browser history (pushState/popstate) | Portlet internal DOM |
| URL parsing and construction | Component state |
| Header chrome (search, tags, branding) | Data fetching |
| Footer chrome (+ New, status, Import/Export) | Form validation |
| Transfer dialog (export/import modal) | Business logic |
| Portlet loading/switching | |
| Cross-portlet event routing | |

### Implementation: `src/ui/templates/shell.html`

**Key functions:**

```javascript
// URL ↔ State
parseUrlState(pathname)     // Extract {slug, mode} from URL
buildUrlPath(state)         // Build URL from state object

// History management
handleHistoryPush(state)    // Add entry to browser history
handlePopState(event)       // Restore state on back/forward

// Portlet communication
handlePortletMessage(event) // Process messages from iframe
broadcastToPortlet(message) // Send state/commands to iframe
```

**Lifecycle:**

1. Shell loads, parses URL for initial state
2. Shell sets iframe `src` to module route
3. Portlet loads, sends `portlet:ready`
4. Shell sends `shell:state` with initial state
5. User interacts → Portlet sends `history:push` → Shell updates URL
6. User clicks back → Shell receives `popstate` → Shell sends `shell:state`

### Header Features

| Feature | Implementation |
|---------|----------------|
| Search | Text input, sends `shell:filter` to portlet |
| Tag filter | Dropdown picker, selected tags as dismissable pills |
| Branding | **LIMINAL**DB (bold/regular weight) |
| User | Email display from auth context |

### Footer Features

| Feature | Implementation |
|---------|----------------|
| + New | Sends `shell:action` with `action: 'new-prompt'` to portlet |
| Status | Prompt count from `portlet:prompt-count` message |
| Import / Export | Opens transfer dialog (tabbed modal in shell) |

### Transfer Dialog

Shell-level modal for bulk import and export. Two tabs:

**Export tab:** Requests prompt list from portlet via `shell:action` / `portlet:prompt-list`, renders checklist with select-all and search filter, calls `/api/prompts/export?slugs=a&slugs=b` (repeated param) for selective download.

**Import tab:** Drop zone + file picker, previews via `POST /api/prompts/import/preview`, renders checklist with duplicates dimmed/disabled, imports selected via `POST /api/prompts/import` with `slugs` filter.

---

## 4. Portlets

### Definition

A portlet is a complete HTML page designed to run inside an iframe. It:
- Fetches its own data via API calls
- Manages its own DOM state
- Hosts components for specific UI concerns
- Communicates with shell via postMessage

### Structure

```html
<!-- /_m/prompts serves this -->
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/shared/themes/base.css">
  <link rel="stylesheet" href="/shared/themes/tokyo-night.css">
  <link rel="stylesheet" href="/shared/prompt-viewer.css">
</head>
<body>
  <div class="module-layout">
    <aside class="sidebar"><!-- List UI --></aside>
    <main class="content"><!-- Detail/component area --></main>
  </div>

  <script src="/js/utils.js"></script>
  <script src="/js/prompt-viewer.js"></script>
  <script>
    // Portlet logic: fetch data, handle selection, mount components
  </script>
</body>
</html>
```

### State Management

Portlets track internal state and notify shell of navigation-relevant changes:

```javascript
// Internal state (portlet manages)
let prompts = [];
let selectedSlug = null;
let mode = 'view'; // 'view' | 'edit' | 'new'

// Selection change → notify shell
function selectPrompt(slug, options = {}) {
  selectedSlug = slug;
  updateDOM();

  if (options.trackHistory !== false) {
    parent.postMessage({
      type: 'history:push',
      state: { slug, mode }
    }, window.location.origin);
  }
}
```

### Mode Switching

Portlets can swap between modes without page reload:

```
mode: 'empty' → "Select a prompt to view"
mode: 'view'  → prompt-viewer component displayed
mode: 'edit'  → prompt-editor component displayed, pre-populated with existing data
mode: 'new'   → prompt-editor component, empty form (insert mode)
```

The portlet owns the mode transition. Components are mounted/unmounted as needed.

### Staging State (Insert Mode)

When creating multiple prompts (batch insert), the portlet maintains an in-memory staging array:

```javascript
let stagingPrompts = [];  // Array of { tempId, data }

// Each staging entry
{
  tempId: 'temp-1704657600000',  // Unique ID for this session
  data: {
    slug: 'my-prompt',
    name: 'My Prompt',
    description: '...',
    content: '...',
    tags: ['tag1', 'tag2']
  }
}
```

**Key behaviors:**
- "+ New" in the shell footer triggers `enterInsertMode()` via `shell:action` message
- Form data is captured to staging array before switching entries
- "Save All" posts all staged prompts in batch
- "Discard All" clears staging and exits insert mode
- Staging is in-memory only — for persistent drafts, see Section 11 (Durable Drafts)

### Current Portlets

| Portlet | Route | Purpose | Status |
|---------|-------|---------|--------|
| `prompts.html` | `/_m/prompts` | List, view, edit, create prompts | Active - all modes implemented |
| `prompt-editor.html` | `/_m/prompt-editor` | Create prompt (standalone) | Legacy - superseded by prompts.html insert mode |

---

## 5. Components

### Definition

A component is a reusable JavaScript module that handles a specific UI concern within a portlet. Components:
- Receive data, render output
- Manage their own micro-state (e.g., view mode preference)
- Do NOT communicate directly with shell
- Can be swapped by portlet based on mode

### Component Patterns

Two patterns are in use:

| Pattern | Example | When to Use |
|---------|---------|-------------|
| **Functional** | `prompt-viewer.js` | Stateless rendering, simple lifecycle |
| **Class-based** | `prompt-editor.js` | Complex state, callbacks, destroy cleanup |

The class-based pattern provides a consistent interface:
```javascript
const component = new Component(container, options);
component.setData(data);    // Update state
component.getData();        // Read state
component.destroy();        // Cleanup
```

### Pattern: prompt-viewer.js (Functional)

```javascript
// Component structure (functional module)
const { html, stats } = renderPrompt(content, viewMode);
contentEl.innerHTML = html;
statsEl.textContent = stats.vars;
```

### prompt-viewer Features

| Feature | Implementation |
|---------|----------------|
| View modes | Rendered (markdown), Semantic (syntax highlighted), Plain (raw) |
| Line edit | Click-to-edit individual lines (Semantic/Plain views only) |
| Copy button | Copies raw content to clipboard |
| Stats footer | Tag count, variable count, character count |
| Persistence | View mode saved to localStorage |

**Line Edit Mode:**

Toggle button in viewer header enables inline editing of individual lines:

```javascript
// Toggle enables clickable lines
[Line Edit: OFF] → [Line Edit: ON]

// Click any line to edit
Line content here  →  [input: Line content here]

// Blur saves, Escape cancels
```

**Restrictions:**
- Disabled in Rendered view (markdown boundaries are ambiguous)
- Only available in Semantic and Plain views
- Save-on-blur triggers `onContentChange` callback to portlet

### localStorage Keys

Components use localStorage for user preferences. All keys should be namespaced to avoid conflicts:

| Key | Used By | Purpose | Default |
|-----|---------|---------|---------|
| `promptViewMode` | prompt-viewer.js | Persists selected view mode (rendered/semantic/plain) | `'rendered'` |

> **Convention:** Future keys should use format `liminal:{component}:{setting}` (e.g., `liminal:editor:autosave`).

### Semantic Parser

The prompt-viewer includes a parser that identifies prompt structure:

```javascript
class SemanticParser {
  parse(text) {
    // Identifies: variables ({{var}}), XML tags, markdown structure
    // Returns tokens for syntax highlighting
  }
}
```

### prompt-editor.js

Form component for creating and editing prompts.

**Interface:**
```javascript
const editor = new PromptEditor(containerEl, {
  onSave: (data) => { /* Handle save */ },
  onDiscard: () => { /* Handle discard */ },
  onDirtyChange: (isDirty) => { /* Track unsaved changes */ }
});

editor.setData(promptData);     // Pre-populate for edit mode
editor.getFormData();           // Get current form values
editor.validate();              // Returns error string or null
editor.destroy();               // Cleanup
```

**Features:**

| Feature | Implementation |
|---------|----------------|
| Form fields | slug, name, description, content, tags |
| Inline validation | Red border + error message per field |
| Dirty tracking | `isDirty` flag, notifies via `onDirtyChange` callback |
| Editor toolbar | Appears on text selection in content field |
| Keyboard shortcuts | Cmd+Shift+T (tag wrap), Cmd+Shift+V (variable wrap) |

**Editor Toolbar:**

When text is selected in the content textarea, a floating toolbar appears:

| Button | Action | Result |
|--------|--------|--------|
| `</>` | Tag wrap | Prompts for tag name, wraps as `<tag>selection</tag>` |
| `{{}}` | Variable wrap | Wraps as `{{selection}}` |

**Dirty State Pattern:**

The editor tracks whether the user has made unsaved changes:

```javascript
// Portlet receives dirty state changes
onDirtyChange: (isDirty) => {
  // Notify shell for navigation warnings
  parent.postMessage({
    type: 'portlet:dirty',
    dirty: isDirty
  }, window.location.origin);
}
```

### tag-selector.js

Multi-select for the 19 shared tags, grouped by dimension. Supports two styles:
- **chip**: Button chips for inline selection (editor)
- **list**: List items with checkmarks for dropdown (shell)

**Pattern:** Functional (returns HTML string, separate handler attachment)

**Interface:**
```javascript
// Chip style (default) - for inline selection
const html = tagSelector.render(tags, selectedTags);
container.innerHTML = html;
tagSelector.attachHandlers(container, (tagName, isSelected) => { ... });

// List style - for dropdown menus
const html = tagSelector.render(tags, selectedTags, { style: 'list' });
container.innerHTML = html;
tagSelector.attachHandlers(container, onToggle, { style: 'list' });
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `tags` | `{ purpose: string[], domain: string[], task: string[] }` | Available tags grouped by dimension |
| `selectedTags` | `string[]` | Currently selected tag names |
| `options.style` | `'chip' \| 'list'` | Render style (default: 'chip') |
| `onToggle` | `(tagName, isSelected) => void` | Callback when item is clicked |

**Features:**

| Feature | Implementation |
|---------|----------------|
| Grouped display | Three sections: Purpose, Domain, Task |
| Multi-select | Click toggles `.selected` class |
| Accessibility | `aria-pressed` attribute (chip style) |
| XSS protection | Tag names escaped via `escapeHtml()` |
| Two render styles | Chips for editor, list items for shell dropdown |

**CSS Classes (chip style):**

| Class | Element | Purpose |
|-------|---------|---------|
| `.tag-section` | Container | Groups chips by dimension |
| `.tag-section-header` | Label | Dimension name |
| `.tag-chips` | Container | Flex container for chip buttons |
| `.tag-chip` | Button | Individual selectable tag |
| `.tag-chip.selected` | Button | Selected state styling |

**CSS Classes (list style):**

| Class | Element | Purpose |
|-------|---------|---------|
| `.tag-picker-section` | Container | Groups items by dimension |
| `.tag-picker-section-header` | Label | Dimension name |
| `.tag-picker-item` | Div | Individual selectable item |
| `.tag-picker-item.selected` | Div | Selected state (shows checkmark) |

**Usage in Editor:**

```javascript
tagSelectorEl.innerHTML = tagSelector.render(allTags, existingTags);
tagSelector.attachHandlers(tagSelectorEl, () => setDirty(true));
```

**Usage in Shell:**

```javascript
tagPickerDropdown.innerHTML = tagSelector.render(allTags, selectedTags, { style: 'list' });
tagSelector.attachHandlers(tagPickerDropdown, (tag) => toggleTag(tag), { style: 'list' });
```

### Future Components

| Component | Purpose | Used By |
|-----------|---------|---------|
| `prompt-diff.js` | Side-by-side comparison | prompts portlet (batch edit) |

---

## 6. Message Protocol

### Portlet → Shell

| Message | Purpose | Payload |
|---------|---------|---------|
| `portlet:ready` | Portlet loaded, ready for state | `{}` |
| `history:push` | Navigation event, add to history | `{ state, trackHistory? }` |
| `portlet:dirty` | Unsaved changes state changed | `{ dirty: boolean }` |
| `portlet:prompt-count` | Prompt count for footer status | `{ count: number }` |
| `portlet:prompt-list` | Full prompt list for export dialog | `{ prompts: { slug, name, tags, pinned }[] }` |

### Shell → Portlet

| Message | Purpose | Payload |
|---------|---------|---------|
| `shell:state` | Restore/set portlet state | `{ slug?, mode? }` |
| `shell:filter` | Search + tag filter changed | `{ query, tags: string[] }` |
| `shell:action` | Action dispatch from shell footer/dialog | `{ action: 'new-prompt' \| 'refresh-prompts' \| 'get-prompt-list' }` |

### Example Flow

```javascript
// 1. Portlet signals ready
parent.postMessage({ type: 'portlet:ready' }, origin);

// 2. Shell sends initial state (from URL)
iframe.postMessage({
  type: 'shell:state',
  state: { slug: 'sql-query', mode: 'view' }
}, origin);

// 3. User clicks different prompt
parent.postMessage({
  type: 'history:push',
  state: { slug: 'commit-msg', mode: 'view' }
}, origin);

// 4. Shell updates URL to /prompts/commit-msg

// 5. User clicks Back button
// Shell receives popstate, sends:
iframe.postMessage({
  type: 'shell:state',
  state: { slug: 'sql-query', mode: 'view' }
}, origin);
```

### Security

All postMessage calls use explicit origin:
```javascript
parent.postMessage(data, window.location.origin);  // Not '*'
```

Receivers validate origin:
```javascript
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  // Process message
});
```

---

## 7. URL & History Patterns

### URL Structure

```
/prompts                    → Shell + prompts portlet, nothing selected
/prompts/:slug              → Shell + prompts portlet, prompt selected (view)
/prompts/:slug/edit         → Shell + prompts portlet, prompt selected (edit)
/prompts/new                → Shell + prompts portlet, insert mode
```

### Route Registration

```typescript
// App routes (serve shell, shell loads portlet)
app.get('/prompts', serveShell('prompts'));
app.get('/prompts/new', serveShell('prompts'));      // Insert mode
app.get('/prompts/:slug', serveShell('prompts'));
app.get('/prompts/:slug/edit', serveShell('prompts'));

// Module routes (serve portlet HTML directly)
app.get('/_m/prompts', serveModule('prompts'));
app.get('/_m/prompt-editor', serveModule('prompt-editor'));  // Legacy
```

### Deep Linking

URLs are shareable and bookmarkable:
1. User visits `/prompts/sql-query`
2. Shell parses URL → `{ slug: 'sql-query', mode: 'view' }`
3. Shell loads portlet, waits for `portlet:ready`
4. Shell sends `shell:state` with parsed state
5. Portlet selects and displays `sql-query`

### History Suppression

Some state changes shouldn't create history entries:
```javascript
// After applying a filter, re-select current prompt without history entry
selectPrompt(currentSlug, { trackHistory: false });
```

---

## 8. Styling & Theming

### Architecture

```
/public/shared/themes/
├── base.css          # Structural styles (layout, components)
├── tokyo-night.css   # Default theme tokens
├── teal.css          # Alternative theme tokens (not wired)
└── modern-dark.css   # Alternative theme tokens (not wired)

/public/shared/
└── prompt-viewer.css # Component-specific styles
```

### Theme Tokens (tokyo-night.css)

```css
:root {
  /* Backgrounds */
  --bg-deep: #1a1b26;
  --bg-surface: #24283b;
  --bg-elevated: #414868;

  /* Text */
  --text-primary: #c0caf5;
  --text-secondary: #9aa5ce;
  --text-muted: #565f89;

  /* Accent */
  --accent-gold: #e0af68;
  --accent-blue: #7aa2f7;

  /* Semantic */
  --success: #9ece6a;
  --error: #f7768e;
  --error-dim: #f7768e33;
}
```

### Structural Styles (base.css)

Layout classes that use theme tokens:
```css
.shell { background: var(--bg-deep); }
.sidebar { background: var(--bg-surface); }
.btn-primary { background: var(--accent-gold); }
```

### UI Feedback Styles (base.css)

Styles for user feedback patterns:

| Class | Purpose |
|-------|---------|
| `.confirm-modal`, `.confirm-overlay` | Confirmation dialog overlay and content |
| `.toast-container`, `.toast` | Notification container (top-center) and items |
| `.toast.success`, `.toast.error`, `.toast.info` | Toast type variants |
| `.field-error` | Red border on invalid form inputs |
| `.error-message` | Error text below form fields |
| `.staging-header` | Batch insert controls (Save All / Discard All) |
| `.staging-item` | Sidebar item for staged prompts |
| `.editor-toolbar` | Floating toolbar for text selection actions |
| `.shell-footer`, `.shell-footer-btn` | Pinned footer bar with action buttons |
| `.transfer-dialog`, `.transfer-dialog-content` | Import/Export modal overlay and content |
| `.transfer-tab`, `.transfer-tab-panel` | Tabbed navigation within transfer dialog |
| `.transfer-item`, `.transfer-item-duplicate` | Checklist rows (duplicate items dimmed) |
| `.import-drop-zone`, `.import-drop-zone.drag-over` | File drop target with drag state |

### Adding Themes

1. Create new token file: `themes/solarized.css`
2. Define same CSS custom properties with different values
3. Serve via query param: `/prompts?theme=solarized` (not yet implemented)
4. Shell loads appropriate theme CSS (planned)

---

## 9. Security Patterns

### XSS Prevention

All user content escaped before DOM insertion:

```javascript
// Shared utility: /public/js/utils.js
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Usage
tagEl.innerHTML = `<span class="tag">${escapeHtml(tag)}</span>`;
```

### postMessage Origin Validation

Never use `'*'` for postMessage:
```javascript
// Sending
parent.postMessage(data, window.location.origin);

// Receiving
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
});
```

### CDN Integrity

External scripts use Subresource Integrity:
```html
<script
  src="https://cdn.jsdelivr.net/npm/markdown-it@14.1.0/dist/markdown-it.min.js"
  integrity="sha384-Jf+EoJcFOn1a6AY4WExmffvfFs/..."
  crossorigin="anonymous">
</script>
```

### Module Route Authentication

Module routes (`/_m/*`) do NOT require authentication. This is intentional:
- Modules are UI shells, not data sources
- Data is fetched via authenticated API calls
- Enables embedding in external contexts
- Authentication happens at API layer

---

## 10. Error Handling & User Feedback

### Feedback Patterns

Three patterns for user feedback, each with distinct use cases:

#### Toast Notifications

Auto-dismissing messages for transient feedback:

```javascript
// Usage
showToast('Prompt saved successfully', { type: 'success' });
showToast('Failed to save prompt', { type: 'error' });
showToast('Copied to clipboard', { type: 'info' });

// Options
{
  type: 'success' | 'error' | 'info',  // Styling
  duration: 4000                        // Auto-dismiss (ms)
}
```

**Use for:** API success/failure, clipboard operations, non-blocking info.

#### Confirmation Modal

Async modal for destructive actions:

```javascript
// Usage
const confirmed = await showConfirm('Discard all 3 unsaved prompts?');
if (confirmed) {
  // User clicked OK
} else {
  // User clicked Cancel
}
```

**Use for:** Discard unsaved changes, delete operations, irreversible actions.

**Note:** Replaced native `confirm()` which blocked browser automation and looked ugly.

**Location:** Currently defined in `prompts.html`. Future: extract to `public/js/components/` for reuse by other portlets.

#### Inline Validation

Field-specific errors for form validation:

```javascript
// Show error on field
showFieldError('slug', 'Slug is required');

// Clear all errors
clearFieldErrors();
```

**CSS classes:**
- `.field-error` - Red border on input
- `.error-message` - Error text below field

**Use for:** Required fields, format validation, duplicate slug errors.

### Pattern Selection Guide

| Situation | Pattern | Why |
|-----------|---------|-----|
| Save succeeded | Toast (success) | Transient, non-blocking |
| Save failed (API error) | Toast (error) | User needs to know, but can retry |
| Field missing/invalid | Inline validation | User needs to see which field |
| About to lose work | Confirmation modal | Requires explicit decision |
| About to delete | Confirmation modal | Irreversible action |

### API Error Handling

```javascript
const response = await fetch('/api/prompts', { method: 'POST', body });
if (!response.ok) {
  const error = await response.json();
  showToast(error.message || 'Failed to save prompt', { type: 'error' });
  return;
}
showToast('Prompt saved', { type: 'success' });
```

### Component Errors

```javascript
// CDN failure - graceful degradation
if (typeof markdownit === 'undefined') {
  console.warn('markdown-it not available, falling back to plain text');
}
```

### Future Improvements

| Area | Current | Planned |
|------|---------|---------|
| Network offline | No handling | Offline indicator in header |
| Invalid URL/slug | 404 page | "Prompt not found" in content area |
| Component crash | Breaks UI | Error boundary, show fallback |

---

## 11. Durable Drafts

Drafts persist in Redis (24h TTL) and survive browser refresh.

> **Note:** The shell-side draft indicator (header badge, polling, `portlet:drafts`/`shell:drafts:open` messages) has been removed. Draft persistence still works at the portlet and API layers — the shell no longer displays draft status.

### Portlet Draft Behavior

When editing a prompt:
1. Each keystroke debounces and auto-saves to draft (POST `/api/drafts`)
2. Draft ID is stable per prompt slug + user
3. Save to Convex clears the draft (DELETE `/api/drafts/:id`)
4. Discard clears the draft without saving

### Cross-Tab Sync

Drafts sync across tabs via Redis as shared storage (any tab's save is visible to others).

---

## 12. API Reference

The UI fetches data from REST endpoints. Full API documentation is in the route handlers.

### Quick Reference

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/prompts` | GET | List user's prompts | `Prompt[]` |
| `/api/prompts` | POST | Create prompt | `{ ids: string[] }` |
| `/api/prompts/tags` | GET | List unique tags | `string[]` |
| `/api/prompts/:slug` | GET | Get single prompt | `Prompt` |
| `/api/prompts/:slug` | DELETE | Delete prompt | `{ deleted: boolean }` |
| `/api/prompts/:slug` | PUT | Update prompt | `{ prompt: Prompt }` |
| `/api/prompts/export` | GET | Export prompts as YAML (optional `?slugs=`) | YAML file download |
| `/api/prompts/import/preview` | POST | Preview import (parse + duplicate check) | `{ prompts, errors }` |
| `/api/prompts/import` | POST | Import prompts from YAML (optional `slugs` filter) | `{ created, skipped, errors }` |
| `/api/drafts` | GET | List user's drafts | `Draft[]` |
| `/api/drafts` | POST | Create/update draft | `{ id: string }` |
| `/api/drafts/summary` | GET | Draft count and status | `{ count, latestDraftId, hasExpiringSoon }` |
| `/api/drafts/:id` | GET | Get specific draft | `Draft` |
| `/api/drafts/:id` | DELETE | Discard draft | `{ deleted: boolean }` |

### Prompt Shape

```typescript
interface Prompt {
  _id: string;
  slug: string;
  name: string;
  description?: string;
  content: string;
  tags: string[];
  pinned: boolean;
  userId: string;
  _creationTime: number;
}
```

### Query Parameters

| Endpoint | Param | Purpose |
|----------|-------|---------|
| `/api/prompts` | `?q=text` | Search by name/description |
| `/api/prompts` | `?tags=tag1,tag2` | Filter by tags (max 20, each max 50 chars) |
| `/api/prompts/export` | `?slugs=a&slugs=b` | Filter export to specific slugs (repeated param) |
| `/api/prompts/import` | body: `{ yaml, slugs? }` | Filter import to specific slugs |
| `/api/prompts/import/preview` | body: `{ yaml }` | Parse YAML, returns prompts with duplicate flags |

> **See also:** `src/routes/prompts.ts` and `src/routes/import-export.ts` for full implementation details.

---

## 13. Testing Patterns

### Test Categories

| Category | Location | Tool | Coverage |
|----------|----------|------|----------|
| Service tests | `tests/service/` | Vitest | API logic, Convex functions |
| UI tests | `tests/service/ui/` | Vitest + jsdom | DOM behavior, component logic |
| Integration tests | `tests/integration/` | Vitest + Supertest | HTTP routes, auth flows |
| E2E tests | `tests/e2e/` (planned) | Playwright | Full user flows |

### UI Test Pattern

```typescript
// tests/service/ui/ui-prompts.test.ts
import { loadTemplate, mockFetch } from './helpers';

describe('Prompts Module', () => {
  it('displays prompt content when selected', async () => {
    const dom = await loadTemplate('prompts.html');

    // Mock API response
    mockFetch(dom, '/api/prompts', { prompts: [testPrompt] });

    // Trigger selection
    dom.window.document.querySelector('.prompt-item').click();

    // Assert DOM updated
    expect(dom.window.document.getElementById('promptContent').textContent)
      .toContain(testPrompt.content);
  });
});
```

### Test Helpers

```typescript
// Setup jsdom with required globals
async function loadTemplate(name: string) {
  const html = await fs.readFile(`src/ui/templates/${name}`);
  const dom = new JSDOM(html, { runScripts: 'dangerously' });

  // Inject shared utilities
  const utilsScript = await fs.readFile('public/js/utils.js');
  dom.window.eval(utilsScript);

  // Mock APIs
  dom.window.fetch = mockFetch;
  dom.window.navigator.clipboard = { writeText: vi.fn() };

  return dom;
}
```

### What's Tested

| Area | Tested | Notes |
|------|--------|-------|
| API routes | Yes | GET/POST/PUT/DELETE prompts, tags endpoint |
| Tag filtering | Yes | Query param parsing, response filtering |
| Deep-link routes | Yes | /prompts/:slug serves shell |
| Module routes | Yes | /_m/prompts returns HTML |
| View mode toggle | Yes | Button clicks, localStorage persistence |
| Copy button | Yes | Clipboard API mock |
| Prompt selection | Yes | DOM class changes |
| prompt-editor component | Yes | Form rendering, validation, dirty state |

### Additional Test Coverage

| Area | Test File | Coverage |
|------|-----------|----------|
| Insert mode | `prompts-module.test.ts` | Enter, staging, save, discard |
| Edit mode | `prompts-module.test.ts` | Enter, save, cancel |
| Modal/Toast | `modal-toast.test.ts` (new) | showConfirm, showToast behavior |
| Line edit | `prompt-viewer.test.ts` | Toggle, edit, save, cancel |
| Editor toolbar | `prompt-editor.test.ts` (new) | Tag wrap, variable wrap |

### Not Yet Tested (E2E scope)

- Back/forward navigation (requires real browser)
- Full user flows (login → create → view → edit)
- Cross-portlet communication
- Tag picker dropdown interaction

---

## 14. Authentication

### Auth Context Injection

Shell receives auth context at render time:

```typescript
// Server injects user into template
const html = shellTemplate
  .replace('{{userEmail}}', user.email)
  .replace('{{userId}}', user.id);
```

### API Authentication

Portlets fetch data via authenticated API calls:
```javascript
// Cookies sent automatically (same-origin)
const response = await fetch('/api/prompts');
```

Cookie-based auth with httpOnly `accessToken` cookie set by WorkOS AuthKit.

### Protected Routes

```typescript
// App routes require auth
app.get('/prompts', { preHandler: [requireAuth] }, serveShell);

// API routes require auth
app.get('/api/prompts', { preHandler: [requireAuth] }, listPrompts);

// Module routes are public (data protected at API layer)
app.get('/_m/prompts', serveModule);
```

---

## 15. Current Inventory

### Routes

| Route | Type | Auth | Purpose | Status |
|-------|------|------|---------|--------|
| `/prompts` | App | Yes | Shell + prompts portlet | Active |
| `/prompts/:slug` | App | Yes | Shell + prompts portlet (selected) | Active |
| `/prompts/:slug/edit` | App | Yes | Shell + prompts portlet (edit mode) | Active |
| `/prompts/new` | App | Yes | Shell + prompts portlet (insert mode) | Active (legacy route still works) |
| `/_m/prompts` | Module | No | Prompts portlet HTML | Active |
| `/_m/prompt-editor` | Module | No | Editor portlet HTML | Legacy - superseded by prompts.html |
| `/api/prompts` | API | Yes | List/create prompts | Active |
| `/api/prompts/tags` | API | Yes | List unique tags | Active |
| `/api/prompts/:slug` | API | Yes | Get/delete/update prompt | Active |
| `/api/prompts/export` | API | Yes | Export prompts as YAML (optional slug filter) | Active |
| `/api/prompts/import/preview` | API | Yes | Preview import (parse + duplicate check) | Active |
| `/api/prompts/import` | API | Yes | Import prompts from YAML (optional slug filter) | Active |
| `/api/drafts` | API | Yes | List/create drafts | Active |
| `/api/drafts/summary` | API | Yes | Draft count and status | Active |
| `/api/drafts/:id` | API | Yes | Get/delete draft | Active |

### Files

| File | Type | Purpose | Status |
|------|------|---------|--------|
| `src/ui/templates/shell.html` | Shell | Outer chrome, history, footer, transfer dialog | Active |
| `src/ui/templates/prompts.html` | Portlet | Prompt list, viewer, editor, insert mode | Active |
| `src/ui/templates/prompt-editor.html` | Portlet | Create form (standalone) | Legacy - superseded by prompts.html |
| `public/shared/themes/base.css` | Styles | Structural CSS, modal, toast | Active |
| `public/shared/themes/tokyo-night.css` | Theme | Color tokens | Active |
| `public/shared/prompt-viewer.css` | Styles | Viewer component styles | Active |
| `public/js/components/prompt-viewer.js` | Component | 3-mode prompt renderer, line edit | Active |
| `public/js/components/prompt-editor.js` | Component | Create/edit form with validation | Active |
| `public/js/components/tag-selector.js` | Component | Chip-based tag multi-select | Active |
| `public/js/utils.js` | Utility | Shared helpers (escapeHtml) | Active |

---

## 16. Open Questions

### Resolved

- [x] Deep linking / URL state strategy → Shell owns history, portlets notify
- [x] Module authentication → Modules public, API protected
- [x] Component vs portlet distinction → Portlet = iframe page, component = JS widget
- [x] Error/feedback patterns → Toast, modal, inline validation (see Section 10)
- [x] Native dialog replacement → `showConfirm()` and `showToast()` replace `confirm()`/`alert()`

### Active

- [ ] Resize protocol between shell and portlet (dynamic height)
- [ ] Focus management across iframe boundary
- [ ] Component loading states and skeleton screens
- [ ] Offline/PWA considerations

### Future Phases

- [ ] Multi-portlet layouts (side-by-side)
- [ ] Cross-portlet workflows (drag prompt to context)
- [ ] External embedding (ChatGPT widgets, VS Code webviews)
- [ ] Theme switching at runtime (currently requires reload)

---

## 17. Widgets & Demos (Experimental)

The following standalone demo UIs live under `public/widgets/` and are not part of the main shell/portlet system:

- `prompt-picker.html`
- `prompt-picker-pip.html`
- `prompt-card.html`
- `prompt-batch-viewer.html`
- `chatgpt-mock.html`

---

## Appendix: File Locations

```
src/
├── routes/
│   ├── app.ts              # App routes (shell serving)
│   ├── prompts.ts          # API routes
│   └── import-export.ts    # Import/export + preview routes
├── schemas/
│   └── import-export.ts    # YAML import validation schemas
├── ui/
│   └── templates/
│       ├── shell.html      # Shell
│       ├── prompts.html    # Prompts portlet
│       └── prompt-editor.html
public/
├── js/
│   ├── components/
│   │   ├── tag-selector.js   # Tag chip multi-select
│   │   ├── prompt-viewer.js  # Viewer component
│   │   └── prompt-editor.js  # Editor component
│   └── utils.js              # Shared utilities
├── shared/
│   ├── themes/
│   │   ├── base.css        # Structural styles
│   │   ├── tokyo-night.css # Default theme tokens
│   │   ├── teal.css        # Alternative theme tokens (not wired)
│   │   └── modern-dark.css # Alternative theme tokens (not wired)
│   └── prompt-viewer.css   # Component styles
tests/
├── service/ui/             # UI tests (jsdom)
└── integration/ui/         # Route tests
docs/tech-arch/
└── ui-patterns.md              # This document
```

---

*Last updated: February 2026*
