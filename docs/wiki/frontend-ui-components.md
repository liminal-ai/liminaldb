# Frontend UI Components

## Overview

Client-side JavaScript UI components that power the LiminalDB browser interface. The module provides a prompt editor, viewer, merge-mode conflict resolution, tag selection, modal dialogs, toast notifications, and shared utility helpers. All files are vanilla JS served from `public/js/` with no formal module exports — they attach behavior directly to the DOM.

## Responsibilities

- Prompt editing with rich text or code input (prompt-editor.js, 555 LOC)
- Read-only prompt viewing and rendering (prompt-viewer.js, 404 LOC)
- Side-by-side merge/conflict resolution UI (merge-mode.js, 186 LOC)
- Tag browsing and selection widget (tag-selector.js, 131 LOC)
- Generic modal dialog lifecycle (modal.js, 85 LOC)
- Ephemeral toast notification display (toast.js, 55 LOC)
- Shared DOM/formatting utility helpers (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
