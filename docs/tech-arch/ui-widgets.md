# Widget UI Architecture

> ChatGPT widget patterns and implementation for LiminalDB.

For web app UI patterns (shell/portlet architecture), see [ui-patterns.md](./ui-patterns.md).

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Platform Adapter Pattern](#platform-adapter-pattern)
4. [Widget Files](#widget-files)
5. [Runtime Asset Inlining](#runtime-asset-inlining)
6. [Authentication](#authentication)
7. [MCP Integration](#mcp-integration)
8. [Theming](#theming)
9. [Creating New Widgets](#creating-new-widgets)
10. [Testing](#testing)

---

## Overview

LiminalDB exposes UI capabilities to ChatGPT via MCP widgets. Widgets are standalone HTML pages that run in ChatGPT's sandboxed iframe environment.

### Key Differences from Web App

| Aspect | Web App | ChatGPT Widget |
|--------|---------|----------------|
| Container | Shell + iframe portlet | ChatGPT conversation iframe |
| Communication | `postMessage` to shell | `window.openai` API |
| Auth | Cookie (same-origin) | Widget JWT in Bearer header |
| Data fetching | Direct `fetch()` | Direct `fetch()` via CSP whitelist |
| History | URL + pushState | `widgetState` |
| Theme source | localStorage | ChatGPT host + user preference |

### Design Principles

1. **Copy over coupling** - Widget HTML is a separate copy, not shared with web portlet
2. **Adapter pattern** - Platform differences abstracted via `window.__PROMPT_PLATFORM__`
3. **Runtime inlining** - No build step; assets inlined at request time
4. **Direct API** - Widget calls REST API directly (not MCP tools for data)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  ChatGPT Conversation                                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Widget iframe (sandboxed)                                 │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  prompts-chatgpt.html                               │  │  │
│  │  │  ├── chatgpt-adapter.js (window.__PROMPT_PLATFORM__)│  │  │
│  │  │  ├── Shared components (prompt-viewer.js, etc.)     │  │  │
│  │  │  └── Widget script (uses platform.data.*, etc.)     │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                              │
         │ window.openai API            │ fetch() with Bearer token
         ▼                              ▼
┌─────────────────┐            ┌─────────────────┐
│  ChatGPT Host   │            │  LiminalDB API  │
│  (theme, state) │            │  /api/prompts   │
└─────────────────┘            └─────────────────┘
```

### Data Flow

```
1. User invokes MCP tool (e.g., "open prompt library")
2. MCP server returns widget HTML + initial data + auth token
3. ChatGPT renders widget in iframe
4. Widget reads initial data from window.openai.toolOutput
5. Widget reads auth token from window.openai.toolResponseMetadata
6. User interacts → Widget calls API with Bearer token
7. Widget updates UI, persists state via window.openai.setWidgetState
```

---

## Platform Adapter Pattern

Widgets use an adapter to abstract platform differences. The adapter is loaded first and sets up `window.__PROMPT_PLATFORM__`.

### Interface

```javascript
window.__PROMPT_PLATFORM__ = {
  // Host communication
  host: {
    notifyStateChange(state) {},     // Persist navigation state
    notifyReady() {},                // Signal widget ready (no-op in ChatGPT)
    notifyDirty(dirty) {},           // Track unsaved changes
    notifyDrafts(summary) {},        // Draft count changed
    onShellMessage(handler) {},      // Subscribe to host events
  },

  // Data operations (API calls)
  data: {
    listPrompts(query, tags) {},     // GET /api/prompts
    getPrompt(slug) {},              // GET /api/prompts/:slug
    createPrompts(prompts) {},       // POST /api/prompts
    updatePrompt(slug, data) {},     // PUT /api/prompts/:slug
    deletePrompt(slug) {},           // DELETE /api/prompts/:slug
    updateFlags(slug, flags) {},     // PATCH /api/prompts/:slug/flags
    trackUsage(slug) {},             // POST /api/prompts/:slug/usage
    listDrafts() {},                 // GET /api/drafts
    getDraftSummary() {},            // GET /api/drafts/summary
    saveDraft(id, data) {},          // PUT /api/drafts/:id
    deleteDraft(id) {},              // DELETE /api/drafts/:id
    listTags() {},                   // GET /api/prompts/tags
  },

  // Environment
  env: {
    getTheme() {},                   // Current theme (e.g., 'dark-1')
    onThemeChange(handler) {},       // Subscribe to theme changes
    getAuth() {},                    // Get userId
  },

  // Widget-specific
  widget: {
    requestFullscreen() {},          // Request fullscreen display mode
    getInitialData() {},             // Get data from toolOutput
    isWidgetContext() {},            // Check if in widget environment
  }
};
```

### ChatGPT Adapter Implementation

Located at `public/js/adapters/chatgpt-adapter.js`:

- Reads API URL and auth token from `window.openai.toolResponseMetadata`
- Makes authenticated API calls with Bearer token
- Maps ChatGPT theme (`dark`/`light`) to LiminalDB themes (`dark-1`, `light-1`, etc.)
- Persists state via `window.openai.setWidgetState()`

### Why Adapter Pattern

1. **No conditionals in widget code** - Widget script uses `platform.data.*` everywhere
2. **Testable** - Can inject mock adapter for testing
3. **Extensible** - Could add VS Code adapter, etc. later
4. **Clear contract** - Interface documents what platform must provide

---

## Widget Files

### Structure

```
src/ui/templates/widgets/
└── prompts-chatgpt.html     # Full prompt library widget

public/js/adapters/
└── chatgpt-adapter.js       # Platform adapter

src/lib/
└── widgetLoader.ts          # Runtime asset inlining

src/middleware/
└── apiAuth.ts               # Combined cookie + widget JWT auth
```

### Widget HTML Structure

```html
<!--
  ChatGPT Widget: Prompt Library
  BASED ON: src/ui/templates/prompts.html
  Key differences marked with [WIDGET CHANGE] comments.
-->
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Standard head content -->
  <link rel="stylesheet" href="/shared/themes/base.css">
  <link rel="stylesheet" href="/shared/themes/dark-1.css" id="theme-stylesheet">
  <!-- [WIDGET CHANGE] Widget-specific inline styles -->
  <style>/* sidebar-search styles */</style>
</head>
<!-- [WIDGET CHANGE] Added "widget-mode" class -->
<body class="module prompts-module widget-mode">
  <!-- [WIDGET CHANGE] Search/filter in sidebar (shell provides this in web app) -->
  <aside class="sidebar">
    <div class="sidebar-search">...</div>
    <!-- Rest same as prompts.html -->
  </aside>
  <main class="content">...</main>

  <!-- [WIDGET CHANGE] Load adapter FIRST -->
  <script src="/js/adapters/chatgpt-adapter.js"></script>
  <script src="/js/utils.js"></script>
  <!-- Other shared scripts -->
  <script>
    // Widget script uses platform.data.*, platform.host.*, etc.
    const platform = window.__PROMPT_PLATFORM__;
    // ...
  </script>
</body>
</html>
```

### Differences from Web Portlet

| Area | Web (prompts.html) | Widget (prompts-chatgpt.html) |
|------|-------------------|------------------------------|
| Body class | `prompts-module` | `prompts-module widget-mode` |
| Search UI | In shell header | In sidebar |
| Scripts | Direct `<script src="...">` | Inlined at runtime |
| Data calls | `fetch('/api/...')` | `platform.data.*()` |
| Host comm | `postMessage()` | `platform.host.*()` |
| Init | Wait for `shell:state` | Request fullscreen, use `toolOutput` |

---

## Runtime Asset Inlining

ChatGPT widgets require all JS/CSS inlined - external `<script src="...">` tags won't work in the sandbox.

### How It Works

`src/lib/widgetLoader.ts` processes widget HTML at request time:

1. **Read widget HTML** from `src/ui/templates/widgets/`
2. **Inline local scripts** - Replace `<script src="/js/...">` with `<script>content</script>`
3. **Inline local CSS** - Replace `<link href="/shared/...css">` with `<style>content</style>`
4. **Absolutify theme paths** - Convert `/shared/themes/dark-1.css` to `https://domain.com/shared/themes/dark-1.css`
5. **Cache in production** - Skip cache in dev for fast iteration

### What Gets Inlined

| Asset Type | Inlined? | Notes |
|------------|----------|-------|
| Local JS (`/js/*`) | Yes | All local scripts |
| Local CSS (`/shared/*`) | Yes | Except theme CSS (dynamic) |
| Theme CSS | No | Converted to absolute URL |
| CDN scripts | No | Kept external (e.g., markdown-it) |

### Error Handling

If a local script/CSS file is not found, the loader **fails hard** with an error. This prevents serving broken widgets with missing assets.

### Caching

- **Production**: Cached after first load (fast subsequent requests)
- **Development**: Fresh read every time (edit → restart → test)

---

## Authentication

Widgets authenticate API calls using short-lived JWTs.

### Flow

```
1. MCP tool receives OAuth-authenticated request from ChatGPT
2. MCP extracts userId from OAuth token
3. MCP creates widget JWT (4h expiry) containing userId
4. MCP returns JWT in _meta.widgetToken (only widget sees, not model)
5. Widget reads token from window.openai.toolResponseMetadata.widgetToken
6. Widget includes token in API calls: Authorization: Bearer <token>
7. API middleware validates JWT, extracts userId
```

### Widget JWT

**Created by:** `src/lib/auth/widgetJwt.ts`

```typescript
// Create token (MCP tool handler)
const token = await createWidgetToken(userId);

// Verify token (API middleware)
const result = await verifyWidgetToken(token);
// result: { valid: boolean, payload?: { userId }, error?: string }
```

**Token claims:**
- `userId` - Authenticated user ID
- `iss` - `"promptdb:widget"`
- `exp` - 4 hours from creation
- `iat` - Creation timestamp

### Token Expiry Handling

The adapter checks token expiry before each API call:
- **Expired**: Throws user-friendly error asking to reopen widget
- **Expiring soon** (5 min before): Logs console warning
- **401 response**: Treated as expiry, shows same message

### API Auth Middleware

`src/middleware/apiAuth.ts` provides `apiAuthMiddleware` that accepts:

1. **Widget JWT** in `Authorization: Bearer` header (ChatGPT widget)
2. **Cookie JWT** from WorkOS (web app)

Widget JWT is checked first. If present and valid, request proceeds. Otherwise falls back to cookie auth.

### CORS

Widgets run on `*.web-sandbox.oaiusercontent.com`. CORS is configured to allow this origin pattern in production.

---

## MCP Integration

### Resource Registration

Widget HTML is registered as an MCP resource:

```typescript
server.registerResource(
  "prompt-library-widget",
  "ui://widget/prompt-library",
  { mimeType: "text/html+skybridge" },
  async () => ({
    contents: [{
      uri: "ui://widget/prompt-library",
      mimeType: "text/html+skybridge",
      text: await loadPromptWidgetHtml(),
      _meta: {
        "openai/widgetCSP": {
          connect_domains: [config.publicApiUrl],
          resource_domains: [
            "https://fonts.googleapis.com",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net",
            config.publicApiUrl,
          ],
        },
      },
    }],
  })
);
```

### Tool Registration

MCP tool serves the widget with initial data:

```typescript
server.registerTool(
  "open_prompt_library",
  {
    title: "Open Prompt Library",
    description: "Open the full prompt library...",
    _meta: {
      "openai/outputTemplate": "ui://widget/prompt-library",
    },
  },
  async (extra) => {
    const userId = extractMcpUserId(extra);
    const prompts = await getPrompts(userId);
    const userTheme = await getUserTheme(userId);
    const widgetToken = await createWidgetToken(userId);

    return {
      structuredContent: {
        prompts,           // Model + widget see this
        userTheme,
        userId,
      },
      _meta: {
        widgetToken,       // Only widget sees this
        apiUrl: config.publicApiUrl,
      },
    };
  }
);
```

### CSP Configuration

| CSP Field | Purpose | Values |
|-----------|---------|--------|
| `connect_domains` | API calls (fetch) | Your API domain |
| `resource_domains` | Script/CSS/font loading | Google Fonts, CDNs, your domain |

---

## Theming

### Theme Sources

1. **ChatGPT base theme** - `window.openai.theme` (`'dark'` or `'light'`)
2. **User preference** - Stored in Convex, passed via `toolOutput.userTheme`

### Resolution Logic

```javascript
getTheme() {
  const chatgptTheme = window.openai?.theme || 'dark';
  const userTheme = window.openai?.toolOutput?.userTheme;

  // If user has preference matching ChatGPT's base, use it
  if (userTheme && userTheme.startsWith(chatgptTheme)) {
    return userTheme;  // e.g., 'dark-2'
  }

  // Default to base variant
  return chatgptTheme === 'dark' ? 'dark-1' : 'light-1';
}
```

### Available Themes

| Theme | Base |
|-------|------|
| `dark-1`, `dark-2`, `dark-3` | Dark |
| `light-1`, `light-2`, `light-3` | Light |

### Theme CSS Loading

Theme CSS files are **not inlined** - they're converted to absolute URLs and loaded dynamically. This allows theme switching without reloading the widget.

---

## Creating New Widgets

### Step-by-Step

1. **Copy base portlet** → `widgets/{name}-chatgpt.html`
2. **Add `widget-mode` class** to body
3. **Move shell UI into widget** (search, filters, etc.)
4. **Add header comment** documenting differences from source
5. **Mark changes** with `[WIDGET CHANGE]` comments
6. **Load adapter first** - `<script src="/js/adapters/chatgpt-adapter.js">`
7. **Use `platform.*`** instead of direct `fetch()`/`postMessage()`
8. **Register MCP resource** in `src/lib/mcp.ts`
9. **Register MCP tool** that serves widget with initial data
10. **Configure CSP** - `connect_domains` and `resource_domains`

### Checklist

- [ ] Widget HTML copied and adapted
- [ ] `widget-mode` class added
- [ ] Shell UI moved to widget (if needed)
- [ ] Adapter loaded before other scripts
- [ ] Script uses `platform.*` calls
- [ ] MCP resource registered with CSP
- [ ] MCP tool returns initial data + auth token
- [ ] Tests added

---

## Testing

### Unit Tests

| File | Tests |
|------|-------|
| `tests/service/auth/widgetJwt.test.ts` | JWT creation/verification |
| `tests/service/auth/apiAuth.test.ts` | Combined auth middleware |
| `tests/service/mcp/promptLibraryWidget.test.ts` | MCP resource/tool |

### Manual Testing

1. **Local mock** - Create mock `window.openai` and load widget HTML directly
2. **MCP in ChatGPT** - Deploy to HTTPS, connect MCP, invoke tool

### Mock window.openai

```javascript
window.openai = {
  theme: 'dark',
  toolOutput: {
    prompts: [...],
    userTheme: 'dark-1',
    userId: 'test-user',
  },
  toolResponseMetadata: {
    apiUrl: 'http://localhost:5001',
    widgetToken: '<valid-jwt>',
  },
  setWidgetState: (s) => console.log('widgetState:', s),
  requestDisplayMode: () => Promise.resolve(),
};
```

---

## Current Widgets

| Widget | Location | MCP Tool | Purpose |
|--------|----------|----------|---------|
| `prompts-chatgpt.html` | `src/ui/templates/widgets/` | `open_prompt_library` | Full prompt library (list, view, edit, create) |
| Health widget | Inline in `src/lib/mcp.ts` | `health_check` | System health status (simple, no external deps) |

---

## Open Questions

- [ ] Exact fullscreen viewport dimensions (need empirical testing)
- [x] Token expiry handling - extended to 4h, adapter warns at 5 min before expiry
- [ ] PiP mode layout adaptations

---

*Last updated: January 2025*
