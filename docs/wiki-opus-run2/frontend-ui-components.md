# Frontend UI Components

## Overview

Client-side JavaScript modules that power the LiminalDB browser UI. The module provides a prompt editor, a read-only prompt viewer, merge-mode conflict resolution, a tag selector, reusable modal dialogs, toast notifications, and shared utility helpers. All files are vanilla JS loaded as static assets from `public/js/`.

## Responsibilities

- Prompt authoring and editing (prompt-editor.js — 555 LOC, largest component)
- Read-only prompt display and navigation (prompt-viewer.js)
- Side-by-side merge conflict resolution UI (merge-mode.js)
- Tag browsing and selection widget (tag-selector.js)
- Generic modal dialog lifecycle (modal.js)
- Transient toast / notification messages (toast.js)
- Shared DOM and formatting utilities (utils.js)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
