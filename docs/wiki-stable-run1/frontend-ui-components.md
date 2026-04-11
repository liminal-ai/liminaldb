# Frontend UI Components

## Overview

Browser-side JavaScript component library that powers the LiminalDB web interface. The module provides standalone UI components for prompt editing, viewing, version merging, modal dialogs, toast notifications, and tag selection, along with a shared utility file. All files are vanilla JS loaded via `<script>` tags with no formal module exports—components attach behavior to the DOM directly.

## Responsibilities

- Provide a rich prompt editor with creation and update capabilities (prompt-editor.js, 555 LOC)
- Render prompt content in a read-only viewer with version navigation (prompt-viewer.js, 404 LOC)
- Enable side-by-side merge mode for resolving prompt version conflicts (merge-mode.js, 186 LOC)
- Display and manage modal dialogs for confirmations and forms (modal.js, 85 LOC)
- Surface transient toast notifications for user feedback (toast.js, 55 LOC)
- Offer a tag selector widget for categorizing prompts (tag-selector.js, 131 LOC)
- Supply shared DOM/string utility helpers (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
