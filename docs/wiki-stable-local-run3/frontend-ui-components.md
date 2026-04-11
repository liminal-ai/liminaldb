# Frontend UI Components

## Overview

Client-side JavaScript modules that power the LiminalDB browser UI. The module provides a prompt editor, prompt viewer, merge-mode interface, tag selector, modal dialog, toast notifications, and shared utility helpers. Each file is a self-contained script loaded by the frontend — none export ES module symbols, relying instead on DOM APIs and global scope to wire behavior to the page.

## Responsibilities

- Prompt editing — rich editing experience for creating and updating prompts (prompt-editor.js, 555 LOC)
- Prompt viewing — read-only rendering and navigation of prompt content (prompt-viewer.js, 404 LOC)
- Merge mode — side-by-side diff and conflict-resolution UI for prompt versions (merge-mode.js, 186 LOC)
- Tag selection — interactive tag picker for categorizing prompts (tag-selector.js, 131 LOC)
- Modal dialogs — reusable overlay dialog component (modal.js, 85 LOC)
- Toast notifications — transient success/error/info messages (toast.js, 55 LOC)
- Shared utilities — small helper functions used across UI scripts (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
