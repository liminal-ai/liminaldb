# Phase 4: TDD Red Spec - Prompt UI

## Overview

This spec defines the skeleton implementations and test infrastructure for Phase 4. All skeletons throw `NotImplementedError` or return placeholder HTML. Tests assert expected behavior and fail.

**Goal:** Tests fail for the right reasons. When we implement (TDD Green), tests pass.

**Key difference from Phases 1-2:** We're testing UI templates with jsdom, not just API routes. Service tests load HTML into jsdom and verify DOM behavior. Integration tests verify HTTP responses and HTML structure.

---

## Design Decisions

### Template Disposition

POC templates are **deleted and reimplemented** from scratch. This ensures no leftover prototype code.

**Delete:**
- `src/ui/templates/shell.html`
- `src/ui/templates/prompts.html`
- `src/ui/templates/prompt-editor.html`
- `public/index.html`

**Create:** New templates per specifications in tech design.

### URL Structure

User-facing routes (auth-gated):
- `/prompts` — Shell with prompts module
- `/prompts/new` — Shell with editor module

Internal module routes (no route auth, API auth):
- `/_m/prompts` — Prompts module template
- `/_m/prompt-editor` — Editor module template

### Auth Context Injection

Shell template receives auth context via string replacement at render time:
```typescript
const html = template
  .replace('{{userId}}', user.id)
  .replace('{{email}}', user.email)
  .replace('{{modulePath}}', modulePath);
```

### Test Framework

- **Service tests:** Vitest + jsdom for DOM testing
- **Integration tests:** Vitest + real Fastify + HTML response assertions
- **No Playwright:** OAuth blocks automated browsers; jsdom sufficient for server-rendered HTML

---

## File Structure

### Files to Delete

```bash
rm src/ui/templates/shell.html
rm src/ui/templates/prompts.html
rm src/ui/templates/prompt-editor.html
rm public/index.html
```

### Files to Create

```
src/
├── routes/
│   ├── app.ts                    # NEW - user-facing routes with auth
│   └── modules.ts                # NEW - internal module routes
└── ui/
    └── templates/
        ├── shell.html            # NEW - skeleton
        ├── prompts.html          # NEW - skeleton
        └── prompt-editor.html    # NEW - skeleton

tests/
├── service/
│   ├── prompts/
│   │   └── listPrompts.test.ts   # NEW - API list endpoint tests
│   └── ui/
│       ├── setup.ts              # NEW - jsdom helpers
│       ├── prompts-module.test.ts
│       └── prompt-editor.test.ts
└── integration/
    └── ui/
        ├── ui-auth.test.ts
        └── ui-prompts.test.ts
```

### Files to Update

```
src/index.ts                      # Register new routes
vitest.config.ts                  # Add ui project with jsdom
package.json                      # Add jsdom dependency
```

---

## Dependencies to Add

```bash
bun add -d jsdom @types/jsdom
```

---

## Vitest Configuration Update

Add to `vitest.config.ts` projects array:

```typescript
{
  extends: true,
  test: {
    name: 'ui',
    include: ['tests/service/ui/**/*.test.ts'],
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5001',
        runScripts: 'dangerously',
      }
    }
  }
}
```

---

## Skeleton Implementations

### src/routes/app.ts

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { authMiddleware } from "../middleware/auth";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerAppRoutes(fastify: FastifyInstance): void {
  // User-facing routes require authentication
  fastify.get("/prompts", { preHandler: authMiddleware }, promptsPageHandler);
  fastify.get("/prompts/new", { preHandler: authMiddleware }, newPromptPageHandler);
}

async function promptsPageHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user!;
  const modulePath = "/_m/prompts";

  const template = await readFile(
    resolve(__dirname, "../ui/templates/shell.html"),
    "utf8"
  );

  const html = template
    .replace("{{userId}}", user.id)
    .replace("{{email}}", user.email)
    .replace("{{modulePath}}", modulePath);

  reply.type("text/html").send(html);
}

async function newPromptPageHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = request.user!;
  const modulePath = "/_m/prompt-editor";

  const template = await readFile(
    resolve(__dirname, "../ui/templates/shell.html"),
    "utf8"
  );

  const html = template
    .replace("{{userId}}", user.id)
    .replace("{{email}}", user.email)
    .replace("{{modulePath}}", modulePath);

  reply.type("text/html").send(html);
}
```

### src/routes/modules.ts

```typescript
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function registerModuleRoutes(fastify: FastifyInstance): void {
  // Internal module routes - no auth (API calls require auth)
  fastify.get("/_m/prompts", promptsModuleHandler);
  fastify.get("/_m/prompt-editor", promptEditorHandler);
}

async function promptsModuleHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const template = await readFile(
    resolve(__dirname, "../ui/templates/prompts.html"),
    "utf8"
  );
  reply.type("text/html").send(template);
}

async function promptEditorHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const template = await readFile(
    resolve(__dirname, "../ui/templates/prompt-editor.html"),
    "utf8"
  );
  reply.type("text/html").send(template);
}
```

### src/index.ts Update

Add to imports:
```typescript
import { registerAppRoutes } from "./routes/app";
import { registerModuleRoutes } from "./routes/modules";
```

Add to route registration (after other registerXxxRoutes calls):
```typescript
registerAppRoutes(fastify);
registerModuleRoutes(fastify);
```

### src/ui/templates/shell.html (Skeleton)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LiminalDB</title>
  <link rel="stylesheet" href="/shared/themes/base.css">
  <link rel="stylesheet" href="/shared/themes/tokyo-night.css">
</head>
<body class="shell">
  <header class="shell-header">
    <div class="logo">LiminalDB</div>
    <input type="search" id="search-input" placeholder="Search prompts..." />
    <div class="user-info">{{email}}</div>
  </header>

  <main class="shell-main">
    <iframe
      src="{{modulePath}}"
      class="module-frame"
      id="main-module"
    ></iframe>
  </main>

  <footer class="shell-footer">
    <select id="theme-select">
      <option value="tokyo-night">Tokyo Night</option>
    </select>
  </footer>

  <script>
    window.__AUTH__ = {
      userId: "{{userId}}",
      email: "{{email}}"
    };

    // Search broadcast to module
    const searchInput = document.getElementById('search-input');
    const moduleFrame = document.getElementById('main-module');

    let debounceTimer;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        moduleFrame.contentWindow.postMessage({
          type: 'shell:search',
          query: e.target.value
        }, '*');
      }, 150);
    });

    // Cmd+K focuses search
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInput.focus();
      }
    });

    // Handle navigation from modules
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'module:navigate') {
        window.location.href = e.data.path;
      }
    });
  </script>
</body>
</html>
```

### src/ui/templates/prompts.html (Skeleton)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prompts</title>
  <link rel="stylesheet" href="/shared/themes/base.css">
  <link rel="stylesheet" href="/shared/themes/tokyo-night.css">
</head>
<body class="module prompts-module">
  <aside class="sidebar">
    <div class="sidebar-header">
      <h2>Prompts</h2>
      <button id="new-prompt-btn" class="btn-primary">New Prompt</button>
    </div>
    <div id="prompt-list" class="prompt-list">
      <!-- Populated by JavaScript -->
    </div>
  </aside>

  <main class="content">
    <div id="empty-state" class="empty-state">
      Select a prompt to view
    </div>
    <article id="prompt-view" class="prompt-view" style="display: none;">
      <header class="prompt-header">
        <h1 id="prompt-slug" class="prompt-slug"></h1>
        <p id="prompt-description" class="prompt-description"></p>
      </header>
      <div id="prompt-content" class="prompt-content"></div>
      <div class="prompt-actions">
        <button id="copy-btn" class="btn-secondary">Copy</button>
      </div>
    </article>
  </main>

  <script>
    // State
    let prompts = [];
    let selectedSlug = null;

    // Load prompts on init
    async function loadPrompts(query = '') {
      throw new Error('loadPrompts not implemented');
    }

    // Render prompt list
    function renderList(prompts) {
      throw new Error('renderList not implemented');
    }

    // Select prompt
    function selectPrompt(slug) {
      throw new Error('selectPrompt not implemented');
    }

    // Copy to clipboard
    async function copyContent() {
      throw new Error('copyContent not implemented');
    }

    // Handle search from shell
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'shell:search') {
        loadPrompts(e.data.query);
      }
    });

    // New prompt navigation
    document.getElementById('new-prompt-btn').addEventListener('click', () => {
      window.parent.postMessage({ type: 'module:navigate', path: '/prompts/new' }, '*');
    });

    // Copy button
    document.getElementById('copy-btn').addEventListener('click', copyContent);

    // Initial load - deferred to allow test mocking
    // In production, call loadPrompts() after DOMContentLoaded
    // For TDD: tests will call window.loadPrompts() after setting up mocks
    if (document.readyState === 'complete') {
      // Only auto-load in real browser, not jsdom
      // jsdom sets readyState to 'complete' before scripts run
    }
  </script>
</body>
</html>
```

### src/ui/templates/prompt-editor.html (Skeleton)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Prompt</title>
  <link rel="stylesheet" href="/shared/themes/base.css">
  <link rel="stylesheet" href="/shared/themes/tokyo-night.css">
</head>
<body class="module editor-module">
  <form id="prompt-form" class="prompt-form">
    <div class="form-group">
      <label for="slug">Slug</label>
      <input type="text" id="slug" name="slug" required />
      <span id="slug-error" class="error-message"></span>
    </div>

    <div class="form-group">
      <label for="name">Name</label>
      <input type="text" id="name" name="name" required />
      <span id="name-error" class="error-message"></span>
    </div>

    <div class="form-group">
      <label for="description">Description</label>
      <textarea id="description" name="description" rows="2"></textarea>
      <span id="description-error" class="error-message"></span>
    </div>

    <div class="form-group">
      <label for="content">Content</label>
      <textarea id="content" name="content" rows="10" required></textarea>
      <span id="content-error" class="error-message"></span>
    </div>

    <div class="form-group">
      <label for="tags">Tags (comma-separated)</label>
      <input type="text" id="tags" name="tags" />
      <span id="tags-error" class="error-message"></span>
    </div>

    <div class="form-actions">
      <button type="button" id="cancel-btn" class="btn-secondary">Cancel</button>
      <button type="submit" id="submit-btn" class="btn-primary">Save Prompt</button>
    </div>

    <div id="form-error" class="form-error"></div>
  </form>

  <script>
    const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

    // Validation
    function validateSlug(value) {
      throw new Error('validateSlug not implemented');
    }

    function validateForm() {
      throw new Error('validateForm not implemented');
    }

    // Submit
    async function submitForm(e) {
      throw new Error('submitForm not implemented');
    }

    // Cancel
    function cancel() {
      window.parent.postMessage({ type: 'module:navigate', path: '/prompts' }, '*');
    }

    // Event listeners
    document.getElementById('prompt-form').addEventListener('submit', submitForm);
    document.getElementById('cancel-btn').addEventListener('click', cancel);

    // Blur validation
    document.getElementById('slug').addEventListener('blur', (e) => {
      validateSlug(e.target.value);
    });
  </script>
</body>
</html>
```

---

## Test Infrastructure

### tests/service/ui/setup.ts

```typescript
import { JSDOM } from "jsdom";
import { vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a template file into jsdom for testing.
 */
export async function loadTemplate(templateName: string): Promise<JSDOM> {
  const templatePath = resolve(
    __dirname,
    `../../../src/ui/templates/${templateName}`
  );
  const html = await readFile(templatePath, "utf8");

  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "http://localhost:5001",
    pretendToBeVisual: true,
  });

  return dom;
}

/**
 * Mock prompts for testing.
 */
export const mockPrompts = [
  {
    slug: "code-review",
    name: "Code Review",
    description: "Reviews code for issues",
    content: "You are a code reviewer. Analyze the following code...",
    tags: ["code", "review"],
    parameters: [],
  },
  {
    slug: "meeting-notes",
    name: "Meeting Notes",
    description: "Summarizes meetings",
    content: "Summarize the following meeting transcript...",
    tags: ["meetings"],
    parameters: [],
  },
];

/**
 * Mock user for testing.
 */
export const mockUser = {
  id: "user_test123",
  email: "test@example.com",
};

/**
 * Create a mock fetch function.
 */
export function mockFetch(
  responses: Record<string, { ok?: boolean; status?: number; data: unknown }>
) {
  return vi.fn((url: string, options?: RequestInit) => {
    // Find matching response
    const matchingUrl = Object.keys(responses).find((key) =>
      url.includes(key)
    );

    if (!matchingUrl) {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Not found" }),
      });
    }

    const response = responses[matchingUrl];
    return Promise.resolve({
      ok: response.ok ?? true,
      status: response.status ?? 200,
      json: () => Promise.resolve(response.data),
    });
  });
}

/**
 * Create a mock clipboard.
 */
export function mockClipboard() {
  const written: string[] = [];
  return {
    writeText: vi.fn((text: string) => {
      written.push(text);
      return Promise.resolve();
    }),
    readText: vi.fn(() => Promise.resolve(written[written.length - 1] || "")),
    getWritten: () => written,
  };
}

/**
 * Inject clipboard mock into jsdom window.
 */
export function setupClipboard(dom: JSDOM) {
  const clipboard = mockClipboard();
  Object.defineProperty(dom.window.navigator, "clipboard", {
    value: clipboard,
    writable: true,
  });
  return clipboard;
}

/**
 * Wait for async operations (fetch, DOM updates).
 */
export function waitForAsync(ms = 50): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Wait for element to appear in DOM.
 */
export async function waitForElement(
  dom: JSDOM,
  selector: string,
  timeout = 1000
): Promise<Element> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = dom.window.document.querySelector(selector);
    if (el) return el;
    await waitForAsync(10);
  }
  throw new Error(`Element ${selector} not found within ${timeout}ms`);
}

/**
 * Simulate a click event.
 */
export function click(element: Element): void {
  const event = new (element.ownerDocument.defaultView!.MouseEvent)("click", {
    bubbles: true,
    cancelable: true,
  });
  element.dispatchEvent(event);
}

/**
 * Simulate input event.
 */
export function input(element: HTMLInputElement, value: string): void {
  element.value = value;
  const event = new (element.ownerDocument.defaultView!.Event)("input", {
    bubbles: true,
  });
  element.dispatchEvent(event);
}

/**
 * Simulate blur event.
 */
export function blur(element: Element): void {
  const event = new (element.ownerDocument.defaultView!.FocusEvent)("blur", {
    bubbles: true,
  });
  element.dispatchEvent(event);
}

/**
 * Send postMessage to window.
 */
export function postMessage(dom: JSDOM, data: unknown): void {
  const event = new dom.window.MessageEvent("message", {
    data,
    origin: "http://localhost:5001",
  });
  dom.window.dispatchEvent(event);
}
```

---

## Service Tests

### tests/service/prompts/listPrompts.test.ts

TC-2.1, TC-2.1b, TC-2.1c cover the `GET /api/prompts` list endpoint. These follow the Phase 2 pattern.

```typescript
import Fastify from "fastify";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockConvexClient } from "../../fixtures/mockConvexClient";
import { createTestJwt } from "../../fixtures";

// Mock convex client before importing routes
const mockConvex = createMockConvexClient();
vi.mock("../../../src/lib/convex", () => ({ convex: mockConvex }));

describe("GET /api/prompts", () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    const { registerPromptRoutes } = await import("../../../src/routes/prompts");
    app = Fastify();
    registerPromptRoutes(app);
    await app.ready();
    mockConvex.query.mockClear();
  });

  afterEach(async () => {
    await app.close();
  });

  describe("TC-2.1: Returns user's prompts", () => {
    test("calls Convex query with userId", async () => {
      mockConvex.query.mockResolvedValue([
        { slug: "prompt-1", name: "Prompt 1", description: "...", content: "...", tags: [] },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt({ sub: "user_123" })}` },
      });

      expect(response.statusCode).toBe(200);
      expect(mockConvex.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: "user_123" })
      );
    });

    test("returns array of prompts", async () => {
      mockConvex.query.mockResolvedValue([
        { slug: "prompt-1", name: "Prompt 1", description: "...", content: "...", tags: ["a"] },
        { slug: "prompt-2", name: "Prompt 2", description: "...", content: "...", tags: ["b"] },
      ]);

      const response = await app.inject({
        method: "GET",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body).toHaveLength(2);
      expect(body[0].slug).toBe("prompt-1");
    });
  });

  describe("TC-2.1b: Passes query param to Convex", () => {
    test("passes q param to query", async () => {
      mockConvex.query.mockResolvedValue([]);

      await app.inject({
        method: "GET",
        url: "/api/prompts?q=search-term",
        headers: { authorization: `Bearer ${createTestJwt()}` },
      });

      expect(mockConvex.query).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ query: "search-term" })
      );
    });
  });

  describe("TC-2.1c: Returns 401 without auth", () => {
    test("returns 401 without auth header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/prompts",
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
```

---

### tests/service/ui/prompts-module.test.ts

```typescript
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  loadTemplate,
  mockPrompts,
  mockFetch,
  setupClipboard,
  waitForAsync,
  click,
  postMessage,
} from "./setup";
import type { JSDOM } from "jsdom";

describe("Prompts Module", () => {
  let dom: JSDOM;

  beforeEach(async () => {
    dom = await loadTemplate("prompts.html");
  });

  describe("TC-2.2: Page load fetches and renders prompt list", () => {
    test("fetches /api/prompts on load", async () => {
      const fetchMock = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });
      dom.window.fetch = fetchMock;

      // Trigger initial load (deferred for testability)
      dom.window.loadPrompts();
      await waitForAsync(100);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/prompts"),
        expect.any(Object)
      );
    });

    test("renders prompt items in list", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const items = dom.window.document.querySelectorAll(".prompt-item");
      expect(items.length).toBe(2);
    });

    test("displays slug in list item", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const listHtml = dom.window.document.getElementById("prompt-list")?.innerHTML;
      expect(listHtml).toContain("code-review");
    });

    test("displays tags in list item", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const listHtml = dom.window.document.getElementById("prompt-list")?.innerHTML;
      expect(listHtml).toContain("code");
      expect(listHtml).toContain("review");
    });
  });

  describe("TC-2.3: Click prompt item displays content", () => {
    test("clicking prompt shows content area", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const firstItem = dom.window.document.querySelector(".prompt-item");
      click(firstItem!);

      await waitForAsync(50);

      const promptView = dom.window.document.getElementById("prompt-view");
      expect(promptView?.style.display).not.toBe("none");
    });

    test("content area shows prompt slug", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const firstItem = dom.window.document.querySelector(".prompt-item");
      click(firstItem!);

      await waitForAsync(50);

      const slugEl = dom.window.document.getElementById("prompt-slug");
      expect(slugEl?.textContent).toBe("code-review");
    });

    test("content area shows prompt content", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const firstItem = dom.window.document.querySelector(".prompt-item");
      click(firstItem!);

      await waitForAsync(50);

      const contentEl = dom.window.document.getElementById("prompt-content");
      expect(contentEl?.textContent).toContain("You are a code reviewer");
    });

    test("clicked item has selected class", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });

      dom.window.loadPrompts();
      await waitForAsync(100);

      const firstItem = dom.window.document.querySelector(".prompt-item");
      click(firstItem!);

      await waitForAsync(50);

      expect(firstItem?.classList.contains("selected")).toBe(true);
    });
  });

  describe("TC-2.4: Search triggers API call", () => {
    test("receiving shell:search message calls API with query", async () => {
      const fetchMock = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });
      dom.window.fetch = fetchMock;

      // Initial load
      dom.window.loadPrompts();
      await waitForAsync(100);
      fetchMock.mockClear();

      // Search message from shell
      postMessage(dom, { type: "shell:search", query: "code" });

      await waitForAsync(100);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/prompts?q=code"),
        expect.any(Object)
      );
    });
  });

  describe("TC-2.5: Copy writes to clipboard", () => {
    test("copy button copies content to clipboard", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { data: mockPrompts },
      });
      const clipboard = setupClipboard(dom);

      dom.window.loadPrompts();
      await waitForAsync(100);

      // Select a prompt first
      const firstItem = dom.window.document.querySelector(".prompt-item");
      click(firstItem!);
      await waitForAsync(50);

      // Click copy
      const copyBtn = dom.window.document.getElementById("copy-btn");
      click(copyBtn!);
      await waitForAsync(50);

      expect(clipboard.writeText).toHaveBeenCalledWith(
        expect.stringContaining("You are a code reviewer")
      );
    });
  });

  describe("TC-3.1: New Prompt navigates to editor", () => {
    test("clicking New Prompt sends navigate message", async () => {
      const postMessageSpy = vi.fn();
      dom.window.parent.postMessage = postMessageSpy;

      const newBtn = dom.window.document.getElementById("new-prompt-btn");
      click(newBtn!);

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: "module:navigate", path: "/prompts/new" },
        "*"
      );
    });
  });
});
```

### tests/service/ui/prompt-editor.test.ts

```typescript
import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  loadTemplate,
  mockFetch,
  waitForAsync,
  click,
  input,
  blur,
} from "./setup";
import type { JSDOM } from "jsdom";

describe("Prompt Editor", () => {
  let dom: JSDOM;

  beforeEach(async () => {
    dom = await loadTemplate("prompt-editor.html");
  });

  describe("TC-3.3: Submit valid form creates prompt", () => {
    test("submitting valid form calls POST /api/prompts", async () => {
      const fetchMock = mockFetch({
        "/api/prompts": { status: 201, data: { ids: ["new_id"] } },
      });
      dom.window.fetch = fetchMock;

      // Fill form
      input(
        dom.window.document.getElementById("slug") as HTMLInputElement,
        "new-prompt"
      );
      input(
        dom.window.document.getElementById("name") as HTMLInputElement,
        "New Prompt"
      );
      input(
        dom.window.document.getElementById("description") as HTMLTextAreaElement,
        "A new prompt"
      );
      input(
        dom.window.document.getElementById("content") as HTMLTextAreaElement,
        "Prompt content here"
      );
      input(
        dom.window.document.getElementById("tags") as HTMLInputElement,
        "test, example"
      );

      // Submit
      const form = dom.window.document.getElementById("prompt-form");
      form?.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true })
      );

      await waitForAsync(100);

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/prompts"),
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("new-prompt"),
        })
      );
    });

    test("successful submit navigates back to prompts", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": { status: 201, data: { ids: ["new_id"] } },
      });
      const postMessageSpy = vi.fn();
      dom.window.parent.postMessage = postMessageSpy;

      // Fill required fields
      input(
        dom.window.document.getElementById("slug") as HTMLInputElement,
        "valid-slug"
      );
      input(
        dom.window.document.getElementById("name") as HTMLInputElement,
        "Valid Name"
      );
      input(
        dom.window.document.getElementById("content") as HTMLTextAreaElement,
        "Content"
      );

      // Submit
      const form = dom.window.document.getElementById("prompt-form");
      form?.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true })
      );

      await waitForAsync(100);

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: "module:navigate", path: "/prompts" },
        "*"
      );
    });
  });

  describe("TC-3.4: Invalid slug shows validation error", () => {
    test("invalid slug format shows error message", async () => {
      const slugInput = dom.window.document.getElementById(
        "slug"
      ) as HTMLInputElement;
      input(slugInput, "INVALID SLUG!");
      blur(slugInput);

      await waitForAsync(50);

      const errorEl = dom.window.document.getElementById("slug-error");
      expect(errorEl?.textContent).toContain("lowercase");
    });

    test("empty slug shows required error", async () => {
      const slugInput = dom.window.document.getElementById(
        "slug"
      ) as HTMLInputElement;
      input(slugInput, "");
      blur(slugInput);

      await waitForAsync(50);

      const errorEl = dom.window.document.getElementById("slug-error");
      expect(errorEl?.textContent).not.toBe("");
    });

    test("valid slug clears error", async () => {
      const slugInput = dom.window.document.getElementById(
        "slug"
      ) as HTMLInputElement;

      // First trigger error
      input(slugInput, "INVALID");
      blur(slugInput);
      await waitForAsync(50);

      // Then fix it
      input(slugInput, "valid-slug");
      blur(slugInput);
      await waitForAsync(50);

      const errorEl = dom.window.document.getElementById("slug-error");
      expect(errorEl?.textContent).toBe("");
    });
  });

  describe("Duplicate slug error (TC-3.5 - UI portion)", () => {
    test("409 response shows duplicate error", async () => {
      dom.window.fetch = mockFetch({
        "/api/prompts": {
          ok: false,
          status: 409,
          data: { error: "Slug already exists" },
        },
      });

      // Fill required fields
      input(
        dom.window.document.getElementById("slug") as HTMLInputElement,
        "existing-slug"
      );
      input(
        dom.window.document.getElementById("name") as HTMLInputElement,
        "Name"
      );
      input(
        dom.window.document.getElementById("content") as HTMLTextAreaElement,
        "Content"
      );

      // Submit
      const form = dom.window.document.getElementById("prompt-form");
      form?.dispatchEvent(
        new dom.window.Event("submit", { bubbles: true, cancelable: true })
      );

      await waitForAsync(100);

      const formError = dom.window.document.getElementById("form-error");
      expect(formError?.textContent).toContain("exists");
    });
  });

  describe("Cancel button", () => {
    test("cancel navigates back to prompts", async () => {
      const postMessageSpy = vi.fn();
      dom.window.parent.postMessage = postMessageSpy;

      const cancelBtn = dom.window.document.getElementById("cancel-btn");
      click(cancelBtn!);

      expect(postMessageSpy).toHaveBeenCalledWith(
        { type: "module:navigate", path: "/prompts" },
        "*"
      );
    });
  });
});
```

---

## Integration Tests

### tests/integration/ui/ui-auth.test.ts

```typescript
import { describe, test, expect, beforeAll, afterAll } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { getTestAuth, hasTestAuth } from "../../fixtures/auth";

/**
 * Integration tests for UI authentication.
 * Tests the auth gate on /prompts routes.
 *
 * Uses existing getTestAuth() fixture which calls real WorkOS
 * with TEST_USER_EMAIL/TEST_USER_PASSWORD env vars.
 */

describe("UI Auth Integration", () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    if (!hasTestAuth()) {
      console.warn("Skipping UI auth tests - TEST_USER credentials not configured");
      return;
    }

    // Import routes
    const { registerAppRoutes } = await import("../../../src/routes/app");
    const { registerModuleRoutes } = await import("../../../src/routes/modules");
    const { registerAuthRoutes } = await import("../../../src/routes/auth");

    app = Fastify();
    app.register(cookie, { secret: process.env.COOKIE_SECRET || "test" });
    registerAuthRoutes(app);
    registerAppRoutes(app);
    registerModuleRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe("TC-1.1: Unauthenticated redirects to login", () => {
    test("GET /prompts without auth returns 302", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/prompts",
      });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain("/auth/login");
    });

    test("redirect includes returnTo param", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/prompts",
      });

      expect(response.headers.location).toContain("returnTo");
    });
  });

  describe("TC-1.2: Authenticated returns shell HTML", () => {
    test("GET /prompts with valid token returns 200", async () => {
      const auth = await getTestAuth();
      if (!auth) return; // Skip if no auth configured

      const response = await app.inject({
        method: "GET",
        url: "/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["content-type"]).toContain("text/html");
    });

    test("response contains shell structure", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      const response = await app.inject({
        method: "GET",
        url: "/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.body).toContain("shell");
      expect(response.body).toContain("main-module");
    });

    test("shell contains user email", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      const response = await app.inject({
        method: "GET",
        url: "/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.body).toContain(auth.email);
    });

    test("shell iframe src is /_m/prompts", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      const response = await app.inject({
        method: "GET",
        url: "/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.body).toContain('src="/_m/prompts"');
    });
  });

  describe("TC-1.3: OAuth flow establishes session", () => {
    test("getTestAuth returns valid token", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      expect(auth.accessToken).toBeDefined();
      expect(auth.accessToken.length).toBeGreaterThan(0);
    });

    test("token enables subsequent requests", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      const response = await app.inject({
        method: "GET",
        url: "/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe("/prompts/new route", () => {
    test("authenticated request returns shell with editor module", async () => {
      const auth = await getTestAuth();
      if (!auth) return;

      const response = await app.inject({
        method: "GET",
        url: "/prompts/new",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain('src="/_m/prompt-editor"');
    });
  });
});
```

### tests/integration/ui/ui-prompts.test.ts

```typescript
import { describe, test, expect, beforeAll, afterAll, afterEach } from "vitest";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import { getTestAuth, hasTestAuth } from "../../fixtures/auth";

/**
 * Integration tests for UI prompts flow.
 * Tests create → list → view happy path using app.inject().
 * Consistent with ui-auth.test.ts pattern.
 */

describe("UI Prompts Integration", () => {
  let app: ReturnType<typeof Fastify>;
  let auth: Awaited<ReturnType<typeof getTestAuth>>;
  const createdSlugs: string[] = [];

  beforeAll(async () => {
    if (!hasTestAuth()) {
      console.warn("Skipping UI prompts tests - TEST_USER credentials not configured");
      return;
    }

    auth = await getTestAuth();

    // Import routes
    const { registerAppRoutes } = await import("../../../src/routes/app");
    const { registerModuleRoutes } = await import("../../../src/routes/modules");
    const { registerPromptRoutes } = await import("../../../src/routes/prompts");
    const { registerAuthRoutes } = await import("../../../src/routes/auth");

    app = Fastify();
    app.register(cookie, { secret: process.env.COOKIE_SECRET || "test" });
    registerAuthRoutes(app);
    registerAppRoutes(app);
    registerModuleRoutes(app);
    registerPromptRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  afterEach(async () => {
    if (!auth) return;
    // Cleanup created prompts
    for (const slug of createdSlugs) {
      try {
        await app.inject({
          method: "DELETE",
          url: `/api/prompts/${slug}`,
          headers: { authorization: `Bearer ${auth.accessToken}` },
        });
      } catch {
        // Ignore
      }
    }
    createdSlugs.length = 0;
  });

  function trackSlug(slug: string): string {
    createdSlugs.push(slug);
    return slug;
  }

  describe("Happy path: Create and view prompt", () => {
    test("created prompt appears in list API", async () => {
      if (!auth) return;
      const slug = trackSlug(`ui-test-${Date.now()}`);

      // Create via API
      const createRes = await app.inject({
        method: "POST",
        url: "/api/prompts",
        headers: {
          authorization: `Bearer ${auth.accessToken}`,
          "content-type": "application/json",
        },
        payload: {
          prompts: [
            {
              slug,
              name: "UI Test Prompt",
              description: "Created for UI test",
              content: "Test content",
              tags: ["ui-test"],
            },
          ],
        },
      });

      expect(createRes.statusCode).toBe(201);

      // Fetch list
      const listRes = await app.inject({
        method: "GET",
        url: "/api/prompts",
        headers: { authorization: `Bearer ${auth.accessToken}` },
      });

      expect(listRes.statusCode).toBe(200);
      const prompts = listRes.json();
      const found = prompts.find((p: { slug: string }) => p.slug === slug);
      expect(found).toBeDefined();
    });
  });
});
```

---

## TDD Red Checklist

When skeleton and tests are in place, run tests and verify:

**Service Tests (API - Phase 2 pattern):**

| Test | Expected Failure |
|------|------------------|
| TC-2.1: calls Convex with userId | ❌ Route not implemented |
| TC-2.1: returns array of prompts | ❌ Route not implemented |
| TC-2.1b: passes q param | ❌ Route not implemented |
| TC-2.1c: returns 401 without auth | ✅ Should pass (auth middleware) |

**Service Tests (jsdom):**

| Test | Expected Failure |
|------|------------------|
| TC-2.2: fetches /api/prompts on load | ❌ Error: loadPrompts not implemented |
| TC-2.2: renders prompt items | ❌ Error: renderList not implemented |
| TC-2.2: displays slug in list | ❌ Error: renderList not implemented |
| TC-2.2: displays tags in list | ❌ Error: renderList not implemented |
| TC-2.3: clicking shows content | ❌ Error: selectPrompt not implemented |
| TC-2.3: content shows slug | ❌ Error: selectPrompt not implemented |
| TC-2.3: content shows content | ❌ Error: selectPrompt not implemented |
| TC-2.3: clicked has selected class | ❌ Error: selectPrompt not implemented |
| TC-2.4: search calls API with query | ❌ Error: loadPrompts not implemented |
| TC-2.5: copy writes to clipboard | ❌ Error: copyContent not implemented |
| TC-3.1: New Prompt navigates | ✅ Should pass (implemented in skeleton) |
| TC-3.3: submit calls POST | ❌ Error: submitForm not implemented |
| TC-3.3: success navigates back | ❌ Error: submitForm not implemented |
| TC-3.4: invalid slug shows error | ❌ Error: validateSlug not implemented |
| TC-3.4: empty slug shows error | ❌ Error: validateSlug not implemented |
| TC-3.4: valid slug clears error | ❌ Error: validateSlug not implemented |
| TC-3.5: 409 shows duplicate error | ❌ Error: submitForm not implemented |
| Cancel navigates back | ✅ Should pass (implemented in skeleton) |

**Integration Tests:**

| Test | Expected Failure |
|------|------------------|
| TC-1.1: GET /prompts no cookie → 302 | ✅ Should pass (auth middleware) |
| TC-1.1: redirect includes returnTo | ✅ Should pass (auth middleware) |
| TC-1.2: GET /prompts with cookie → 200 | ✅ Should pass (route returns template) |
| TC-1.2: response contains shell | ✅ Should pass (template content) |
| TC-1.2: shell contains email | ✅ Should pass (template injection) |
| TC-1.2: iframe src is /_m/prompts | ✅ Should pass (template content) |
| TC-1.3: auth returns valid cookie | ✅ Should pass (existing auth) |
| TC-1.3: cookie enables requests | ✅ Should pass (existing auth) |
| /prompts/new returns editor module | ✅ Should pass (route + template) |
| Happy path: create and view | ✅ Should pass (existing API) |

---

## Execution Order

1. Delete POC templates:
   ```bash
   rm src/ui/templates/shell.html
   rm src/ui/templates/prompts.html
   rm src/ui/templates/prompt-editor.html
   rm public/index.html
   ```

2. Add jsdom dependency:
   ```bash
   bun add -d jsdom @types/jsdom
   ```

3. Update `vitest.config.ts` with ui project

4. Create `src/routes/app.ts` skeleton

5. Create `src/routes/modules.ts` skeleton

6. Update `src/index.ts` to register new routes

7. Create `src/ui/templates/shell.html` skeleton

8. Create `src/ui/templates/prompts.html` skeleton

9. Create `src/ui/templates/prompt-editor.html` skeleton

10. Create `tests/service/prompts/listPrompts.test.ts` (API tests)

11. Create `tests/service/ui/setup.ts`

12. Create `tests/service/ui/prompts-module.test.ts`

13. Create `tests/service/ui/prompt-editor.test.ts`

14. Create `tests/integration/ui/ui-auth.test.ts`

15. Create `tests/integration/ui/ui-prompts.test.ts`

16. Run tests, verify failures match expected

---

## Notes

- POC templates are deleted before creating new ones to ensure clean state
- Service tests use jsdom with `runScripts: 'dangerously'` to execute template JavaScript
- Navigation via postMessage (TC-3.1, cancel) is implemented in skeletons so tests pass
- Data fetching and DOM manipulation functions throw NotImplementedError
- Integration tests rely on existing auth fixtures (`getTestAuth()` with Bearer tokens)
- The shell template injects `{{userId}}`, `{{email}}`, `{{modulePath}}` via string replacement
- Internal module routes (`/_m/*`) don't have route-level auth; API calls require auth
- Edit/Delete buttons are not included in templates (out of scope)
