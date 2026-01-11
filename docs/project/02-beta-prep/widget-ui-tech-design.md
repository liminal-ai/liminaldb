# Widget UI Tech Design

> Baseline pattern for porting web app capabilities to ChatGPT MCP widgets.

## Context

PromptDB has a web UI with shell/portlet architecture. We want to expose the same prompt management capabilities as a ChatGPT widget via the OpenAI Apps SDK.

### Key Decisions

- **Target fullscreen mode first** - assume adequate viewport, responsive later
- **Separate HTML over shared** - copy-paste preferred over coupling
- **Direct API when possible** - fall back to MCP tools if auth doesn't work
- **Adapter pattern** - inject platform behavior, don't branch everywhere

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                         UI LAYER                                 │
├─────────────────────────────┬───────────────────────────────────┤
│      WEB APP                │         CHATGPT WIDGET            │
│                             │                                   │
│  shell.html                 │                                   │
│    └── prompts.html         │  prompts-chatgpt.html             │
│          (iframe)           │    (standalone, has search)       │
│                             │                                   │
│  No adapter (unchanged)     │  Adapter: chatgpt-adapter.js      │
│    - postMessage to shell   │    - window.openai API            │
│    - fetch(/api/*)          │    - fetch(/api/*) via CSP        │
├─────────────────────────────┴───────────────────────────────────┤
│                     SHARED COMPONENTS                            │
│  prompt-viewer.js, prompt-editor.js, utils.js, themes/*.css     │
├─────────────────────────────────────────────────────────────────┤
│                       API LAYER                                  │
│  /api/prompts, /api/drafts  (Express routes)                    │
├─────────────────────────────────────────────────────────────────┤
│                     SERVICE LAYER                                │
│  src/lib/services/prompts.ts, drafts.ts (if extracted)          │
├─────────────────────────────────────────────────────────────────┤
│                      MCP LAYER (if needed)                       │
│  MCP tools that call services                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/ui/templates/
├── shell.html
├── prompts.html                    # Web portlet (unchanged)
└── widgets/
    └── prompts-chatgpt.html        # ChatGPT widget (copy + adapt)

public/js/
├── prompt-viewer.js                # Shared
├── prompt-editor.js                # Shared
├── utils.js                        # Shared
├── components/
│   ├── modal.js                    # Shared
│   └── toast.js                    # Shared
└── adapters/
    └── chatgpt-adapter.js          # ChatGPT platform adapter

public/shared/themes/               # Shared CSS
```

---

## Platform Adapter Interface

```javascript
window.__PROMPT_PLATFORM__ = {
  host: {
    notifyStateChange(state, track) {},
    notifyReady() {},
    notifyDirty(dirty) {},
    notifyDrafts(summary) {},
    onShellMessage(handler) {},
  },

  data: {
    listPrompts(query, tags) {},
    getPrompt(slug) {},
    createPrompts(prompts) {},
    updatePrompt(slug, data) {},
    deletePrompt(slug) {},
    updateFlags(slug, flags) {},
    trackUsage(slug) {},
    listDrafts() {},
    getDraftSummary() {},
    saveDraft(id, data) {},
    deleteDraft(id) {},
  },

  env: {
    getTheme() {},
    onThemeChange(handler) {},
    getAuth() {},
  }
};
```

---

## Web vs ChatGPT Differences

| Aspect | Web (prompts.html) | ChatGPT (prompts-chatgpt.html) |
|--------|-------------------|-------------------------------|
| Shell | Yes (shell.html) | No - standalone |
| Search/filter | In shell header | In portlet sidebar |
| Communication | postMessage | window.openai API |
| Data fetching | fetch(/api/*) | fetch or callTool() |
| Auth | Cookie (same-origin) | Token header or MCP context |
| History | URL + pushState | widgetState |
| Theme | 6 themes, localStorage | Map dark/light → our themes |

---

## ChatGPT Widget Structure

```html
<!-- prompts-chatgpt.html -->
<body class="module prompts-module widget-mode">
  <aside class="sidebar">
    <!-- ADDED: Search/filter (no shell) -->
    <div class="sidebar-search">
      <input type="search" id="search-input" ... />
      <div class="tag-picker">...</div>
      <div class="filter-tags" id="filter-tags"></div>
    </div>

    <div class="sidebar-header">
      <button id="new-prompt-btn">+ New</button>
    </div>
    <div id="prompt-list"></div>
  </aside>

  <main class="content">
    <!-- Same as prompts.html -->
  </main>

  <!-- Load adapter FIRST -->
  <script src="/js/adapters/chatgpt-adapter.js"></script>
  <!-- Then shared components -->
  <script src="/js/utils.js"></script>
  <!-- ... -->
  <!-- Then main script using platform.* -->
</body>
```

---

## Layout Constraints

| Context | Viewport | Layout |
|---------|----------|--------|
| Web fullscreen | Desktop+ | Sidebar (280px) + content |
| ChatGPT fullscreen | Desktop+ | Same - should work |
| ChatGPT PiP | ~400px? | Future - needs responsive |
| Mobile | ~375px | Future - needs view toggle |

**Current approach:** Target fullscreen only. Create BD issue for responsive requirements if/when needed.

---

## Data Access

**Decision:** Direct API calls with `connect_domains` CSP whitelist.

Widget makes standard `fetch()` calls to existing `/api/*` endpoints. No MCP tools needed for data operations.

### CSP Configuration

Set in MCP tool response metadata when serving the widget:

```json
{
  "metadata": {
    "openai/widgetCSP": {
      "connect_domains": ["https://promptdb.example.com"]
    }
  }
}
```

### Environment Variable

Add `PUBLIC_API_URL` to config:

| Environment | Value |
|-------------|-------|
| `.env.local` | `http://localhost:5001` |
| Fly.io | `https://promptdb.fly.dev` |

Referenced in MCP tool handler to build `connect_domains` dynamically.

### MCP Tool Visibility

If MCP tools are ever needed, they can be marked **component-only** (widget can call, model doesn't see). Avoids cluttering the LLM's tool list with widget internals.

---

## Implementation Sequence

### Phase 1: Infrastructure
1. Add env vars: `PUBLIC_API_URL`, `WIDGET_JWT_SECRET`
2. Add widget JWT signing/verification utilities
3. Add CORS middleware for widget origins
4. Add widget auth middleware for API routes

### Phase 2: Widget UI
5. Copy prompts.html → `widgets/prompts-chatgpt.html`
6. Add search/filter UI to widget sidebar
7. Create chatgpt-adapter.js (reads token from `_meta`, calls API)
8. Wire widget script to use adapter

### Phase 3: MCP Integration
9. Register widget as MCP resource (`text/html+skybridge`)
10. Create MCP tool `open_prompt_library` that:
    - Returns widget via `outputTemplate`
    - Includes initial prompts in `structuredContent`
    - Passes widgetToken in `_meta`
11. Add CSP metadata with `connect_domains`

### Phase 4: Test
12. Test in ChatGPT fullscreen
13. Verify auth flow end-to-end
14. Verify theme resolution

**Note:** Web UI (prompts.html) stays unchanged. Only the widget uses the adapter pattern.

---

## Repeatable Pattern for Future Widgets

| Step | Action |
|------|--------|
| 1 | Copy `{portlet}.html` → `widgets/{portlet}-chatgpt.html` |
| 2 | Add any shell UI into widget (search, filters, etc.) |
| 3 | Add `class="widget-mode"` for CSS tweaks |
| 4 | Include chatgpt-adapter.js before main script |
| 5 | Update script to use `platform.*` calls |
| 6 | Configure MCP tool to serve widget |
| 7 | Add `connect_domains` if using direct API |

---

## Auth for Widget API Calls

Widget needs auth to call `/api/*` endpoints. OAuth token is only on MCP requests, not available to widget directly.

### Solution: Widget Token via `_meta`

1. MCP tool handler validates OAuth token, extracts userId
2. MCP creates short-lived JWT containing userId
3. Passes JWT to widget via `_meta` (only widget sees, not model)
4. Widget reads from `window.openai.toolResponseMetadata.widgetToken`
5. Widget includes in fetch headers: `Authorization: Bearer <widgetToken>`
6. API validates JWT, extracts userId

**MCP Response:**
```javascript
return {
  structuredContent: { prompts: [...] },  // Model + widget see this
  _meta: {
    widgetToken: createWidgetJWT(userId, { expiresIn: '1h' }),
  }
};
```

**Widget Adapter:**
```javascript
const token = window.openai?.toolResponseMetadata?.widgetToken;

async listPrompts(query, tags) {
  const res = await fetch(`${API_URL}/api/prompts?...`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}
```

**API Middleware:**
```typescript
// New middleware for widget auth
function widgetAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const payload = verifyWidgetJWT(token);
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.userId = payload.userId;
  next();
}
```

### JWT Implementation

Use existing JWT infrastructure or add simple signing:
- Secret: `WIDGET_JWT_SECRET` env var
- Payload: `{ userId, iat, exp }`
- Expiry: 1 hour (refreshed on each tool call)

---

## CORS Configuration

Widget runs on `*.web-sandbox.oaiusercontent.com`. API needs CORS headers.

**Add to API routes:**
```typescript
app.use('/api/*', cors({
  origin: [
    /\.web-sandbox\.oaiusercontent\.com$/,
    'http://localhost:5001',  // Dev
  ],
  credentials: true,
}));
```

Or for simpler dev: `Access-Control-Allow-Origin: *` on widget-specific endpoints.

---

## Theme Resolution

ChatGPT provides base theme (`dark`/`light`). User can set specific preference.

**Resolution order:**
1. Read `window.openai.theme` → `'dark'` or `'light'`
2. Query user preference for `chatgpt` surface (via MCP or API)
3. If user has preference in that family, use it
4. Otherwise, default to `dark-1` or `light-1`

**Preference passed in structuredContent:**
```javascript
structuredContent: {
  prompts: [...],
  userTheme: 'dark-2',  // From Convex
}
```

Widget applies theme on load based on this + ChatGPT base theme.

---

## Open Questions

- [ ] Exact fullscreen viewport dimensions (need to test in ChatGPT)

## Resolved

- [x] Data access approach → Direct API with `connect_domains`
- [x] Web UI changes → None needed, widget is separate copy
- [x] Service layer extraction → Not needed for this work
- [x] Auth mechanism → Widget JWT passed via `_meta`
- [x] CORS → Allow `*.web-sandbox.oaiusercontent.com`
- [x] Theme mapping → ChatGPT base + user preference

---

## Implementation Complete

### Files Created
| File | Purpose |
|------|---------|
| `src/lib/auth/widgetJwt.ts` | JWT sign/verify for widget auth |
| `src/middleware/apiAuth.ts` | Combined API auth middleware (cookie + widget JWT) |
| `src/lib/widgetLoader.ts` | Load widget HTML from file system |
| `src/ui/templates/widgets/prompts-chatgpt.html` | Full widget HTML |
| `public/js/adapters/chatgpt-adapter.js` | Platform adapter for ChatGPT |
| `tests/service/auth/widgetJwt.test.ts` | Widget JWT tests |
| `tests/service/auth/apiAuth.test.ts` | API auth middleware tests |
| `tests/service/mcp/promptLibraryWidget.test.ts` | MCP widget tests |

### Files Modified
| File | Changes |
|------|---------|
| `src/lib/config.ts` | Added `publicApiUrl`, `widgetJwtSecret`, widget sandbox CORS |
| `src/lib/mcp.ts` | Registered `prompt-library-widget` resource + `open_prompt_library` tool |
| `src/lib/auth/index.ts` | Export widgetJwt module |
| `src/routes/prompts.ts` | Switched to `apiAuthMiddleware` |
| `src/routes/drafts.ts` | Switched to `apiAuthMiddleware` |
| `src/routes/preferences.ts` | Switched to `apiAuthMiddleware` |
| `public/shared/themes/base.css` | Added widget-mode CSS |
| `.env.example` | Added new env vars |

### Key Decisions
- API routes now accept both cookie auth (web) and widget JWT auth (ChatGPT)
- Widget reads initial data from `toolOutput`, auth token from `toolResponseMetadata`
- `/api/prompts/tags` endpoint already existed, no changes needed
- **Runtime asset inlining** - `widgetLoader.ts` inlines all local JS/CSS at request time
- No build step required for widget - just edit and test
- 397 tests passing

### Runtime Asset Inlining

ChatGPT widgets require all scripts/CSS inlined in HTML (external `<script src="...">` won't work in sandbox). Instead of a build step, we inline at runtime:

- `widgetLoader.ts` reads widget HTML template
- Finds local `<script src="/...">` tags and inlines file contents
- Finds local `<link rel="stylesheet" href="/...">` tags and inlines CSS
- Escapes `</script>` and `</style>` in content to prevent HTML parser issues
- Skips external CDN scripts (keeps markdown-it from jsdelivr)
- Skips theme CSS files (dynamically loaded based on user preference)
- Caches result in production, fresh reads in development

This approach:
- Zero new dependencies
- No build step to remember
- Dev workflow: edit file → restart server → test
- Extends existing `widgetLoader.ts` pattern
