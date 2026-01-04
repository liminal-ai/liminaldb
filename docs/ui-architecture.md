# LiminalBuilder UI Architecture

## Overview

The LiminalBuilder UI follows a **domain-oriented modular architecture** where each product domain owns its complete UI surface. Components are designed as self-contained, server-rendered pages that can operate independently or be composed into larger applications.

## Design Principles

### 1. Domain Ownership

Each domain (prompts, skills, context, chat, etc.) owns its UI components end-to-end. Components are built for their specific domain needs, not as generic abstractions.

```
liminaldb/
  └── ui/
      ├── prompts/       # Search, browse, view prompts
      └── prompt-editor/ # Create and edit prompts

liminal-state/
  └── ui/
      ├── context/       # Active context management
      └── session/       # Session state viewer
```

**Why domain-specific over widget-generic:**
- No shared component coordination overhead
- Each domain optimizes for its specific use cases
- Domains evolve independently
- Clear ownership boundaries

### 2. Server-Rendered Components

All UI components are server-rendered HTML pages served via Fastify routes.

```
GET /ui/prompts          → Prompts browser component
GET /ui/prompt-editor    → Prompt editor component
GET /ui/context          → Context manager component
```

**Benefits:**
- Full control over cache headers
- Inject auth/config at render time
- No client-side hydration complexity
- Updates deploy immediately (no CDN cache issues in embedded contexts)

### 3. Embeddable by Default

Components are designed to function:
- **Standalone** - As full pages in the LiminalBuilder app
- **Embedded** - As iframes in external containers (ChatGPT widgets, MCP surfaces, VS Code webviews)
- **Composed** - Arranged together in shell layouts

Each component assumes nothing about its container.

### 4. Minimal Communication Protocol

Components communicate via `postMessage` with a simple event contract:

```js
// Component emits domain events
parent.postMessage({
  type: 'prompts:selected',
  payload: { slug: 'code-review' }
}, '*')

// Component listens for relevant events
window.addEventListener('message', (event) => {
  if (event.data.type === 'theme:changed') {
    applyTheme(event.data.payload)
  }
})
```

**Event naming convention:** `domain:action` (e.g., `prompts:selected`, `editor:saved`, `context:updated`)

Components declare what events they emit and consume. No shared libraries required.

---

## Component Structure

### Standard Component Anatomy

```
/ui/{domain}/{component}/
```

Each component route returns a complete HTML document:

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/ui/shared/theme.css">
  <style>/* Component-specific styles */</style>
</head>
<body>
  <!-- Component markup -->
  <script type="module">
    // Component logic
    // postMessage communication
  </script>
</body>
</html>
```

### Shared Resources

Components share only:
- **Theme CSS** - CSS custom properties for colors, typography, spacing
- **Event Protocol** - Message format specification
- **Auth Context** - Injected by server at render time

No shared JavaScript libraries between components.

### Configuration via Query Parameters

Components accept configuration through URL parameters:

```
/ui/prompts?theme=dark&compact=true&readonly=true
```

Server reads params and renders appropriate variant.

---

## Shell Architecture

### Shell Responsibilities

The shell (when composing multiple components) handles:
- Layout arrangement
- Event routing between components
- Auth state management
- Navigation / URL state
- Theme distribution

### Shell Does NOT

- Reach into component internals
- Share state directly with components
- Require components to use specific frameworks

### Layout Modes

**Simple navigation:** Shell swaps which component is visible
```
┌─────────────────────────────┐
│  Nav: [Prompts] [Skills]    │
├─────────────────────────────┤
│                             │
│   Currently active          │
│   component (iframe)        │
│                             │
└─────────────────────────────┘
```

**Side-by-side:** Shell arranges multiple components
```
┌─────────────────────────────┐
│  Header                     │
├────────────┬────────────────┤
│            │                │
│  Component │   Component    │
│  A         │   B            │
│            │                │
└────────────┴────────────────┘
```

---

## Styling & Theming

### Theme Distribution

Shared CSS custom properties file:

```css
/* /ui/shared/theme.css */
:root {
  --bg-deep: #1a1b26;
  --bg-surface: #24283b;
  --text-primary: #c0caf5;
  --accent-gold: #e0af68;
  /* ... */
}
```

Components import this file. Theme changes propagate via:
1. Server renders with theme param: `/ui/prompts?theme=dark`
2. Or shell broadcasts theme event, components reload or apply dynamically

### Component-Specific Styles

Each component owns its styles. No global CSS leakage. Components can extend theme variables but don't share component-level styles.

---

## Authentication & Authorization

### Auth Context Injection

Server injects auth context at render time:

```html
<script>
  window.__AUTH__ = {
    userId: "user_123",
    roles: ["user", "pro"],
    token: "..." // if needed for API calls
  };
</script>
```

Components use this context for:
- Conditional rendering based on roles
- API authentication
- Feature gating

### RBAC per Component

Each component route can enforce its own access rules:

```js
fastify.get('/ui/admin-dashboard', {
  preHandler: [requireRole('admin')]
}, async (req, reply) => {
  return renderAdminDashboard(req.user)
})
```

### Cross-Domain Auth

When components span subdomains:
- Cookies scoped to `.liminalbuilder.com`
- Or token passed via query param for initial load
- Components refresh auth via API if needed

---

## External Embedding

### ChatGPT / MCP Widget Embedding

Components designed for external embedding:
- Self-contained (no external dependencies)
- Responsive to container size
- Communicate via postMessage (container may relay)
- Handle auth via token param or cookie

### Browser Agent Compatibility

Components expose:
- Clear, semantic DOM structure
- Standard form elements for agent interaction
- Optional: `/api/` endpoints for programmatic access

---

## Domain Inventory (Current)

### LiminalDB Domain

| Component | Purpose | Status |
|-----------|---------|--------|
| `/ui/prompts` | Search, browse, view prompts | Phase 4 |
| `/ui/prompt-editor` | Create and edit prompts | Phase 4 |

### Future Domains

| Domain | Components (Planned) |
|--------|---------------------|
| liminal-state | context, session |
| chat | composer, response, history |
| dashboard | metrics, activity |

---

## Migration Path

### Phase 1: Standalone Components
Build components as standalone pages. No shell, no composition. Each works independently.

### Phase 2: Simple Shell
Add shell for navigation between components. Basic event routing.

### Phase 3: Rich Composition
Side-by-side layouts, floating components, cross-component workflows.

### Phase 4: External Distribution
Package components for ChatGPT widgets, MCP surfaces, Tauri desktop.

---

## Open Questions

- [ ] Resize protocol between components and shell
- [ ] Focus management across component boundaries
- [ ] Deep linking / URL state strategy
- [ ] Component loading states and skeleton screens

---

*Draft v0.1 - Subject to revision*
