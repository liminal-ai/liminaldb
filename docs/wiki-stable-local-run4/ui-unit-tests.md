# UI Unit Tests

## Overview

Suite of unit tests covering the LiminalDB frontend UI components. All eight test files share a common test setup module (`setup.ts`) and collectively verify behavior for prompt editing/viewing, merge conflict resolution, modals, toasts, tag selection, theme switching, shell history, and the top-level prompts module. The largest file (`prompts-module.test.ts` at ~2 000 LOC) exercises the integrated prompts workflow, while `merge-mode.test.ts` additionally depends on dedicated merge fixtures.

## Responsibilities

- Validate prompt editor creation, editing, and submission behavior
- Validate prompt viewer rendering and interaction states
- Test merge-mode conflict detection and resolution flows using merge fixtures
- Verify modal display/dismiss and toast notification lifecycle
- Test tag selector filtering, selection, and creation
- Test theme picker toggling and persistence
- Verify shell history navigation and recall
- Exercise the integrated prompts module combining multiple UI concerns

## Source Coverage

- tests/service/ui/merge-mode.test.ts
- tests/service/ui/modal-toast.test.ts
- tests/service/ui/prompt-editor.test.ts
- tests/service/ui/prompt-viewer.test.ts
- tests/service/ui/prompts-module.test.ts
- tests/service/ui/shell-history.test.ts
- tests/service/ui/tag-selector.test.ts
- tests/service/ui/theme-picker.test.ts

## Cross-Module Context

- tests/service/ui/merge-mode.test.ts -> tests/fixtures/merge.ts (usage)
- tests/service/ui/merge-mode.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/modal-toast.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/prompt-editor.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/prompt-viewer.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/prompts-module.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/shell-history.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/tag-selector.test.ts -> tests/service/ui/setup.ts (usage)
- tests/service/ui/theme-picker.test.ts -> tests/service/ui/setup.ts (usage)
