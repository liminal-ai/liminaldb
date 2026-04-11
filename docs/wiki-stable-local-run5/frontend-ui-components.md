# Frontend UI Components

## Overview

Browser-side JavaScript components that power the LiminalDB web interface. These vanilla JS files are served from `public/js/` and handle prompt editing and viewing, merge conflict resolution, modals, toast notifications, tag selection, and shared utility functions. Each component is a standalone script loaded by the HTML pages — there are no explicit module exports or inter-component import relationships.

## Responsibilities

- Provide a rich prompt editor UI with create/update capabilities (prompt-editor.js, 555 LOC)
- Render prompt content in a read-only viewer (prompt-viewer.js, 404 LOC)
- Implement merge-mode UI for resolving conflicting prompt versions (merge-mode.js, 186 LOC)
- Display and manage tag selection controls (tag-selector.js, 131 LOC)
- Show and dismiss modal dialogs (modal.js, 85 LOC)
- Present transient toast notifications to the user (toast.js, 55 LOC)
- Supply shared browser-side utility helpers (utils.js, 18 LOC)

## Source Coverage

- public/js/components/merge-mode.js
- public/js/components/modal.js
- public/js/components/prompt-editor.js
- public/js/components/prompt-viewer.js
- public/js/components/tag-selector.js
- public/js/components/toast.js
- public/js/utils.js
