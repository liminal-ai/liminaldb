# Frontend UI Components

## Overview

Client-side JavaScript components that power the LiminalDB web UI. This module contains vanilla JS files served from `public/js/` that handle prompt editing and viewing, merge conflict resolution, modal dialogs, toast notifications, tag selection, and shared utility functions. Components are loaded directly by the browser via script tags with no formal module exports.

## Responsibilities

- Provide a rich prompt editor with creation and editing capabilities (prompt-editor.js, 555 LOC)
- Render prompt content in a read-only viewer with version and metadata display (prompt-viewer.js, 404 LOC)
- Handle merge-mode UI for resolving conflicting prompt versions (merge-mode.js, 186 LOC)
- Display and manage tag selection for prompts (tag-selector.js, 131 LOC)
- Present modal dialogs for confirmations and forms (modal.js, 85 LOC)
- Show ephemeral toast notifications for user feedback (toast.js, 55 LOC)
- Supply shared utility functions used across components (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
