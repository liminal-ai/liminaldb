# UI Architecture, Patterns & Design

> Source of truth for LiminalDB's UI architecture. Last updated: Phase 5b.

---

## 1. Terminology

| Term | Definition | Example |
|------|------------|---------|
| **Shell** | The outer chrome that hosts portlets. Owns header, navigation, history management. Single HTML page. | `shell.html` |
| **Portlet** | A self-contained iframe page that provides a complete UI surface. Owns its DOM, internal state, and components. | `prompts.html`, `prompt-editor.html` |
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
│  │   │ Prompt A    │  │ [Copy]  [Rend][Sem][Plain]      │  │ │  │
│  │   │ Prompt B ◀  │  │                                 │  │ │  │
│  │   │ Prompt C    │  │  Rendered prompt content...     │  │ │  │
│  │   │             │  │                                 │  │ │  │
│  │   │             │  ├─────────────────────────────────┤  │ │  │
│  │   │             │  │ tags: 2  vars: 4  chars: 450    │  │ │  │
│  │   │             │  └─────────────────────────────────┘  │ │  │
│  │   └─────────────┴───────────────────────────────────────┘ │  │
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
| Search | Text input, sends `shell:search` to portlet |
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
mode: 'edit'  → prompt-editor component displayed (planned - Phase 6)
mode: 'new'   → prompt-editor component, empty form (planned - Phase 6)
```

The portlet owns the mode transition. Components are mounted/unmounted as needed.

> **Note:** Edit and new modes are planned for Phase 6. Currently only 'empty' and 'view' are implemented.

### Current Portlets

| Portlet | Route | Purpose | Status |
|---------|-------|---------|--------|
| `prompts.html` | `/_m/prompts` | List, view, edit prompts | Active - view implemented, edit in Phase 6 |
| `prompt-editor.html` | `/_m/prompt-editor` | Create prompt (standalone) | Deprecated - will be replaced by edit mode in prompts.html |

---

## 5. Components

### Definition

A component is a reusable JavaScript class/module that handles a specific UI concern within a portlet. Components:
- Receive data, render output
- Manage their own micro-state (e.g., view mode preference)
- Do NOT communicate directly with shell
- Can be swapped by portlet based on mode

### Pattern: prompt-viewer.js

```javascript
// Component structure
class PromptViewer {
  constructor(containerEl) {
    this.container = containerEl;
    this.viewMode = localStorage.getItem('promptViewMode') || 'rendered';
  }

  display(content) {
    // Parse content, render based on viewMode
    this.container.innerHTML = this.render(content);
    this.bindEvents();
  }

  setViewMode(mode) {
    this.viewMode = mode;
    localStorage.setItem('promptViewMode', mode);
    this.refresh();
  }
}

// Portlet mounts component
const viewer = new PromptViewer(document.getElementById('promptContent'));
viewer.display(selectedPrompt.content);
```

### prompt-viewer Features

| Feature | Implementation |
|---------|----------------|
| View modes | Rendered (markdown), Semantic (syntax highlighted), Plain (raw) |
| Copy button | Copies raw content to clipboard |
| Stats footer | Tag count, variable count, character count |
| Persistence | View mode saved to localStorage |

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

### Future Components

| Component | Purpose | Used By |
|-----------|---------|---------|
| `prompt-editor.js` | Form for create/edit | prompts portlet |
| `prompt-diff.js` | Side-by-side comparison | prompts portlet (batch edit) |

---

## 6. Message Protocol

### Portlet → Shell

| Message | Purpose | Payload |
|---------|---------|---------|
| `portlet:ready` | Portlet loaded, ready for state | `{}` |
| `history:push` | Navigation event, add to history | `{ state, trackHistory? }` |

### Shell → Portlet

| Message | Purpose | Payload |
|---------|---------|---------|
| `shell:state` | Restore/set portlet state | `{ slug?, mode? }` |
| `shell:search` | Search query changed | `{ query }` |
| `shell:filter` | Tag filter changed | `{ tags: string[] }` |

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
/prompts/new                → Shell + prompts portlet, new prompt form
```

### Route Registration

```typescript
// App routes (serve shell, shell loads portlet)
app.get('/prompts', serveShell('prompts'));
app.get('/prompts/new', serveShell('prompts'));
app.get('/prompts/:slug', serveShell('prompts'));
app.get('/prompts/:slug/edit', serveShell('prompts'));

// Module routes (serve portlet HTML directly)
app.get('/_m/prompts', serveModule('prompts'));
app.get('/_m/prompt-editor', serveModule('prompt-editor'));
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
└── tokyo-night.css   # Color tokens only

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

### Adding Themes

1. Create new token file: `themes/solarized.css`
2. Define same CSS custom properties with different values
3. Serve via query param: `/prompts?theme=solarized`
4. Shell loads appropriate theme CSS

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

## 10. Error Handling

> **Status:** Error handling patterns are evolving. This section documents current state and planned improvements.

### Current Patterns

**API Errors (Portlet → User):**
```javascript
// Portlet fetches data
const response = await fetch('/api/prompts');
if (!response.ok) {
  // Currently: silent failure or console.error
  // TODO: Display user-friendly error in content area
}
```

**Component Errors:**
```javascript
// markdown-it CDN failure
if (typeof markdownit === 'undefined') {
  console.warn('markdown-it not available, falling back to plain text');
  // Graceful degradation to plain text rendering
}
```

### Planned Improvements (Phase 6b+)

| Area | Current | Planned |
|------|---------|---------|
| API fetch failure | Silent/console | Error message in content area |
| Network offline | No handling | Offline indicator in header |
| Invalid URL/slug | 404 page | "Prompt not found" in content area |
| postMessage malformed | Ignored | Log warning, continue |
| Component crash | Breaks UI | Error boundary, show fallback |

### Error Display Convention

When implemented, errors will display in the content area (not alerts/modals):
```html
<div class="error-state">
  <span class="error-icon">⚠</span>
  <p class="error-message">Unable to load prompts. Please try again.</p>
  <button class="btn-secondary" onclick="retry()">Retry</button>
</div>
```

---

## 11. API Reference

The UI fetches data from REST endpoints. Full API documentation is in the route handlers.

### Quick Reference

| Endpoint | Method | Purpose | Response |
|----------|--------|---------|----------|
| `/api/prompts` | GET | List user's prompts | `{ prompts: Prompt[] }` |
| `/api/prompts` | POST | Create prompt | `{ prompt: Prompt }` |
| `/api/prompts/tags` | GET | List unique tags | `{ tags: string[] }` |
| `/api/prompts/:slug` | GET | Get single prompt | `{ prompt: Prompt }` |
| `/api/prompts/:slug` | DELETE | Delete prompt | `{ success: boolean }` |
| `/api/prompts/:slug` | PUT | Update prompt | `{ prompt: Prompt }` (planned - Phase 6) |

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

## 12. Testing Patterns

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
| API routes | Yes | GET/POST/DELETE prompts, tags endpoint |
| Tag filtering | Yes | Query param parsing, response filtering |
| Deep-link routes | Yes | /prompts/:slug serves shell |
| Module routes | Yes | /_m/prompts returns HTML |
| View mode toggle | Yes | Button clicks, localStorage persistence |
| Copy button | Yes | Clipboard API mock |
| Prompt selection | Yes | DOM class changes |

### Not Yet Tested (E2E scope)

- Back/forward navigation (requires real browser)
- Full user flows (login → create → view → edit)
- Cross-portlet communication
- Tag picker dropdown interaction

---

## 13. Authentication

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

## 14. Current Inventory

### Routes

| Route | Type | Auth | Purpose | Status |
|-------|------|------|---------|--------|
| `/prompts` | App | Yes | Shell + prompts portlet | Active |
| `/prompts/:slug` | App | Yes | Shell + prompts portlet (selected) | Active |
| `/prompts/:slug/edit` | App | Yes | Shell + prompts portlet (edit mode) | Route exists, mode planned Phase 6 |
| `/prompts/new` | App | Yes | Shell + prompts portlet (new mode) | Route exists, mode planned Phase 6 |
| `/_m/prompts` | Module | No | Prompts portlet HTML | Active |
| `/_m/prompt-editor` | Module | No | Editor portlet HTML | Deprecated - Phase 6 removes |
| `/api/prompts` | API | Yes | List/create prompts | Active |
| `/api/prompts/tags` | API | Yes | List unique tags | Active |
| `/api/prompts/:slug` | API | Yes | Get/delete prompt | Active |
| `/api/prompts/:slug` | API | Yes | Update prompt (PUT) | Planned - Phase 6 |

### Files

| File | Type | Purpose | Status |
|------|------|---------|--------|
| `src/ui/templates/shell.html` | Shell | Outer chrome, history management | Active |
| `src/ui/templates/prompts.html` | Portlet | Prompt list and viewer | Active |
| `src/ui/templates/prompt-editor.html` | Portlet | Create form (standalone) | Deprecated - Phase 6 removes |
| `public/shared/themes/base.css` | Styles | Structural CSS | Active |
| `public/shared/themes/tokyo-night.css` | Theme | Color tokens | Active |
| `public/shared/prompt-viewer.css` | Styles | Viewer component styles | Active |
| `public/js/prompt-viewer.js` | Component | 3-mode prompt renderer | Active |
| `public/js/utils.js` | Utility | Shared helpers (escapeHtml) | Active |

---

## 15. Open Questions

### Resolved

- [x] Deep linking / URL state strategy → Shell owns history, portlets notify
- [x] Module authentication → Modules public, API protected
- [x] Component vs portlet distinction → Portlet = iframe page, component = JS widget

### Active

- [ ] Resize protocol between shell and portlet (dynamic height)
- [ ] Focus management across iframe boundary
- [ ] Component loading states and skeleton screens
- [ ] Error boundary patterns (API failures, component crashes)
- [ ] Offline/PWA considerations

### Future Phases

- [ ] Multi-portlet layouts (side-by-side)
- [ ] Cross-portlet workflows (drag prompt to context)
- [ ] External embedding (ChatGPT widgets, VS Code webviews)
- [ ] Theme switching at runtime (currently requires reload)

---

## Appendix: File Locations

```
src/
├── routes/
│   ├── app.ts              # App routes (shell serving)
│   └── prompts.ts          # API routes
├── ui/
│   └── templates/
│       ├── shell.html      # Shell
│       ├── prompts.html    # Prompts portlet
│       └── prompt-editor.html
public/
├── js/
│   ├── prompt-viewer.js    # Viewer component
│   └── utils.js            # Shared utilities
├── shared/
│   ├── themes/
│   │   ├── base.css        # Structural styles
│   │   └── tokyo-night.css # Theme tokens
│   └── prompt-viewer.css   # Component styles
tests/
├── service/ui/             # UI tests (jsdom)
└── integration/ui/         # Route tests
docs/
└── ui-arch-patterns-design.md  # This document
```

---

*Version 1.0 - Phase 5b Complete*
