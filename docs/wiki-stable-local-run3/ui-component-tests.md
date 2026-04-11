# UI Component Tests

## Overview

Service-level test suite for LiminalDB's frontend UI components. All eight test files depend on a shared `setup.ts` harness that provides mock data, DOM injection helpers, and interaction utilities. The suite covers prompt editing/viewing, merge conflict resolution, tag selection, modal/toast notifications, theme picking, and shell history.

## Responsibilities

- Validate prompt viewer rendering, navigation, and panel layout via `prompt-viewer.test.ts` and `prompts-module.test.ts`
- Test prompt editor creation and editing workflows in `prompt-editor.test.ts`
- Exercise merge-mode conflict resolution UI in `merge-mode.test.ts`, using shared merge fixtures
- Verify tag selector filtering and selection behavior in `tag-selector.test.ts`
- Cover modal and toast notification lifecycle in `modal-toast.test.ts`
- Test theme and surface switching in `theme-picker.test.ts`
- Validate shell history display and interaction in `shell-history.test.ts`
- Provide a centralized test harness (`setup.ts`) with mock data, DOM helpers, fetch/clipboard mocks, and component injection functions

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
