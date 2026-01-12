# UI Architecture, Patterns & Design

> Source of truth for LiminalDB's web app UI architecture (shell/portlet pattern).

For ChatGPT widget UI architecture, see **[ui-widgets.md](./ui-widgets.md)**.

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
│  │   │ [+ New]     │  COMPONENT (prompt-viewer.js)         │ │  │
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
| Portlet loading/switching | Form validation |
| Cross-portlet event routing | Business logic |

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
  <link rel="stylesheet" href="/shared/themes/dark-1.css" id="theme-stylesheet">
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
- Clicking "+ New" creates a new staging entry
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

### Shell → Portlet

| Message | Purpose | Payload |
|---------|---------|---------|
| `shell:state` | Restore/set portlet state | `{ slug?, mode? }` |
| `shell:filter` | Search + tag filter changed | `{ query, tags: string[] }` |

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
├── base.css          # Structural styles (layout, components, widget-mode)
├── dark-1.css        # Dark theme variant 1 (default)
├── dark-2.css        # Dark theme variant 2
├── dark-3.css        # Dark theme variant 3
├── light-1.css       # Light theme variant 1
├── light-2.css       # Light theme variant 2
└── light-3.css       # Light theme variant 3

/public/shared/
└── prompt-viewer.css # Component-specific styles
```

### Theme Selection

Users can select themes via a theme picker in the shell header. Theme preference is:
- Stored per-surface in Convex (web app vs ChatGPT widget)
- Persisted across sessions
- Loaded dynamically without page reload

### Theme Tokens

Each theme file defines CSS custom properties:

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

### Widget Mode Styles (base.css)

`.widget-mode` class provides adjustments for ChatGPT widget context:
```css
.widget-mode { /* Full viewport, no shell chrome */ }
.widget-mode .sidebar { /* Adjusted for standalone operation */ }
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

### Adding Themes

1. Create new token file: `themes/{name}.css`
2. Define same CSS custom properties with different values
3. Add to theme picker options in shell.html
4. Theme loads dynamically when selected

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

### Shell Integration

The shell header shows a draft indicator when unsaved drafts exist:

```html
<div id="draft-indicator" class="draft-indicator hidden">
  <span class="draft-icon"></span>
  <span id="draft-count">0</span> unsaved
</div>
```

### Draft Polling

Shell polls for drafts every 15 seconds:

```javascript
// Start on load
startDraftPolling();

async function fetchDraftSummary() {
  const response = await fetch('/api/drafts/summary', { credentials: 'include' });
  const summary = await response.json();
  updateDraftIndicator(summary);
}

// Poll every 15s
draftPollingInterval = setInterval(fetchDraftSummary, 15000);
```

### Draft Summary Response

```typescript
{
  count: number;           // Total active drafts
  latestDraftId: string;   // Most recent draft ID
  hasExpiringSoon: boolean; // Any draft < 2h TTL remaining
}
```

### Message Protocol (Drafts)

| Message | Direction | Purpose | Payload |
|---------|-----------|---------|---------|
| `portlet:drafts` | Portlet → Shell | Draft count changed | `{ count, latestDraftId }` |
| `shell:drafts:open` | Shell → Portlet | Open specific draft | `{ draftId }` |

### Portlet Draft Behavior

When editing a prompt:
1. Each keystroke debounces and auto-saves to draft (POST `/api/drafts`)
2. Draft ID is stable per prompt slug + user
3. Save to Convex clears the draft (DELETE `/api/drafts/:id`)
4. Discard clears the draft without saving

### Cross-Tab Sync

Drafts sync across tabs via:
1. Redis as shared storage (any tab's save is visible to others)
2. Shell polling picks up changes from other tabs
3. Portlet can request fresh draft list on focus

### Visual States

| State | Indicator |
|-------|-----------|
| No drafts | Hidden |
| 1+ drafts | Shows count badge |
| Draft expiring soon (<2h) | Yellow/warning style via `.expiring-soon` class |

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
  userId: string;
  _creationTime: number;
}
```

### Query Parameters

| Endpoint | Param | Purpose |
|----------|-------|---------|
| `/api/prompts` | `?q=text` | Search by name/description |
| `/api/prompts` | `?tags=tag1,tag2` | Filter by tags (max 20, each max 50 chars) |

> **See also:** `src/routes/prompts.ts` for full implementation details.

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
| `/api/drafts` | API | Yes | List/create drafts | Active |
| `/api/drafts/summary` | API | Yes | Draft count and status | Active |
| `/api/drafts/:id` | API | Yes | Get/delete draft | Active |

### Files

| File | Type | Purpose | Status |
|------|------|---------|--------|
| `src/ui/templates/shell.html` | Shell | Outer chrome, history management | Active |
| `src/ui/templates/prompts.html` | Portlet | Prompt list, viewer, editor, insert mode | Active |
| `src/ui/templates/prompt-editor.html` | Portlet | Create form (standalone) | Legacy |
| `public/shared/themes/base.css` | Styles | Structural CSS, modal, toast, widget-mode | Active |
| `public/shared/themes/dark-{1,2,3}.css` | Theme | Dark theme variants | Active |
| `public/shared/themes/light-{1,2,3}.css` | Theme | Light theme variants | Active |
| `public/shared/prompt-viewer.css` | Styles | Viewer component styles | Active |
| `public/js/prompt-viewer.js` | Component | 3-mode prompt renderer, line edit | Active |
| `public/js/prompt-editor.js` | Component | Create/edit form with validation | Active |
| `public/js/utils.js` | Utility | Shared helpers (escapeHtml) | Active |
| `public/js/components/modal.js` | Component | Confirmation modal | Active |
| `public/js/components/toast.js` | Component | Toast notifications | Active |

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
- [x] External embedding - ChatGPT widgets implemented (see [ui-widgets.md](./ui-widgets.md))
- [x] Theme switching at runtime - implemented via theme picker

---

## 17. Widgets

### Production Widgets

ChatGPT MCP widgets are documented in **[ui-widgets.md](./ui-widgets.md)**. These are production widgets that run in ChatGPT's iframe sandbox:

| Widget | Location | Purpose |
|--------|----------|---------|
| `prompts-chatgpt.html` | `src/ui/templates/widgets/` | Full prompt library |
| Health widget | Inline in `src/lib/mcp.ts` | System health status |

### Demo/Experimental Widgets

The following standalone demo UIs live under `public/widgets/` and are **not** part of the production system:

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
│   └── drafts.ts           # Draft API routes
├── middleware/
│   ├── auth.ts             # Browser/MCP auth middleware
│   └── apiAuth.ts          # API auth (cookie + widget JWT)
├── lib/
│   ├── auth/
│   │   ├── widgetJwt.ts    # Widget JWT sign/verify
│   │   └── ...
│   └── widgetLoader.ts     # Runtime asset inlining
├── ui/
│   └── templates/
│       ├── shell.html      # Shell
│       ├── prompts.html    # Prompts portlet (web app)
│       ├── prompt-editor.html  # Legacy
│       └── widgets/
│           └── prompts-chatgpt.html  # ChatGPT widget
public/
├── js/
│   ├── prompt-viewer.js    # Viewer component
│   ├── prompt-editor.js    # Editor component
│   ├── utils.js            # Shared utilities
│   ├── components/
│   │   ├── modal.js        # Modal component
│   │   └── toast.js        # Toast component
│   └── adapters/
│       └── chatgpt-adapter.js  # ChatGPT platform adapter
├── shared/
│   ├── themes/
│   │   ├── base.css        # Structural styles
│   │   ├── dark-1.css      # Dark theme variant 1
│   │   ├── dark-2.css      # Dark theme variant 2
│   │   ├── dark-3.css      # Dark theme variant 3
│   │   ├── light-1.css     # Light theme variant 1
│   │   ├── light-2.css     # Light theme variant 2
│   │   └── light-3.css     # Light theme variant 3
│   └── prompt-viewer.css   # Component styles
tests/
├── service/ui/             # UI tests (jsdom)
├── service/auth/           # Auth tests (including widget JWT)
└── integration/            # Route tests
docs/tech-arch/
├── ui-patterns.md          # This document (web app UI)
└── ui-widgets.md           # ChatGPT widget UI
```

---

*Last updated: January 2025*
