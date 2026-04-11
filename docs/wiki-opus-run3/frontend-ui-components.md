# Frontend UI Components

## Overview

Browser-side JavaScript components that power the LiminalDB web interface. This module provides standalone UI components for prompt editing, viewing, version merge resolution, modal dialogs, tag management, toast notifications, and shared utility functions. Each file is a self-contained script loaded into the browser via `<script>` tags with no formal module exports or inter-component import dependencies.

## Responsibilities

- Provide a rich prompt editor with content authoring and editing capabilities (prompt-editor.js, 555 LOC)
- Render prompt content in a read-only viewer with formatting support (prompt-viewer.js, 404 LOC)
- Implement merge-mode UI for resolving conflicting prompt versions (merge-mode.js, 186 LOC)
- Display tag selection and management controls (tag-selector.js, 131 LOC)
- Present modal dialog overlays for confirmations and forms (modal.js, 85 LOC)
- Show transient toast notifications for user feedback (toast.js, 55 LOC)
- Expose shared browser-side utility helpers (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
