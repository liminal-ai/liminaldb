# Frontend UI Components

## Overview

Client-side JavaScript modules powering the LiminalDB web UI. The module provides a set of standalone browser components — prompt editing and viewing, version merge mode, modals, toasts, a tag selector, and shared utilities — loaded as plain script files from `public/js/`.

## Responsibilities

- Prompt editing with rich content support (prompt-editor.js, 555 LOC)
- Read-only prompt viewing and rendering (prompt-viewer.js, 404 LOC)
- Version merge mode for comparing and resolving prompt changes (merge-mode.js)
- Modal dialog management (modal.js)
- Toast notification display and lifecycle (toast.js)
- Tag selection and management UI (tag-selector.js)
- Shared browser utility helpers (utils.js)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
