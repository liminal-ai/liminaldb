# UI Unit Tests

## Overview

Unit test suite for LiminalDB's frontend UI components. All eight test files depend on a shared `setup.ts` harness that provides mock data, DOM injection helpers, and interaction utilities. The suite covers prompt editing/viewing, merge mode, modals/toasts, tag selection, theme picking, and shell history.

## Responsibilities

- Validate prompt viewer rendering, navigation, and data display
- Test prompt editor creation, editing, and save flows
- Exercise merge mode conflict resolution UI (uses external merge fixtures)
- Verify modal and toast notification behavior
- Test tag selector filtering and assignment
- Validate theme picker application of themes and surfaces
- Test shell history display and interaction
- Provide reusable test harness with mock fetch, clipboard, DOM helpers, and component injectors

## Source Coverage

- tests/service/ui/merge-mode.test.ts
- tests/service/ui/modal-toast.test.ts
- tests/service/ui/prompt-editor.test.ts
- tests/service/ui/prompt-viewer.test.ts
- tests/service/ui/prompts-module.test.ts
- tests/service/ui/setup.ts
- tests/service/ui/shell-history.test.ts
- tests/service/ui/tag-selector.test.ts
- tests/service/ui/theme-picker.test.ts

## Cross-Module Context

- tests/service/ui/merge-mode.test.ts -> tests/fixtures/merge.ts (usage)
