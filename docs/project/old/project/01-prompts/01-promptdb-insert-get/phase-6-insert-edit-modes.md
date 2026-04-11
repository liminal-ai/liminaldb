# Phase 6: Insert/Edit Modes

> **Epic:** O1 - Core Prompt Management
> **Status:** 6a Complete, 6b Complete
> **Branch:** `new-edit`

---

## Overview

Phase 6 adds create and edit capabilities to the prompts portlet, completing the CRUD functionality. Users can now create single or batch prompts, edit existing prompts, and use inline line editing in the viewer.

---

## Phase 6a: Implementation (Complete)

### What Was Built

#### 1. Update API
- Added `PUT /api/prompts/:slug` endpoint
- Added `updateBySlug` Convex mutation
- Validates all fields same as create
- Returns updated prompt on success

#### 2. Insert Mode (Batch Staging)
- Click "+ New" enters insert mode with empty form
- Multiple "+ New" clicks add prompts to staging list
- Sidebar shows staging prompts with "unsaved" status and remove (×) button
- Staging header shows "N prompt(s) to save" with Discard All / Save All (only when 2+ staged)
- Individual Save/Discard per prompt
- Data retained when switching between staged prompts

#### 3. Edit Mode
- Edit button on prompt viewer opens form pre-populated with existing data
- URL updates to `/prompts/:slug/edit`
- Discard returns to view mode without changes
- Save sends PUT request, returns to view mode on success

#### 4. Line Edit
- Toggle button in viewer header (disabled in Rendered view)
- Click any line in Semantic/Plain view to inline edit
- Save on blur, escape to cancel
- Minimal whitespace impact when enabled

#### 5. Editor Toolbar
- Appears when text selected in content textarea
- `[</>]` wraps selection in XML tag (prompts for tag name via modal)
- `[{{}}]` wraps selection in variable braces
- Keyboard shortcuts: Cmd+Shift+T (tag), Cmd+Shift+V (variable)

#### 6. Custom Dialogs
- `showConfirm(message)` - async modal replacing native `confirm()`
- `showToast(message, options)` - auto-dismiss notifications replacing native `alert()`
- Both styled with Tokyo Night theme

#### 7. Inline Validation
- Field-specific error display (red border + error message below field)
- Errors clear when field is corrected
- No toast for validation - errors shown inline

### New Patterns Introduced

| Pattern | Implementation | Usage |
|---------|----------------|-------|
| **Confirmation Modal** | `showConfirm(msg)` returns `Promise<boolean>` | Destructive actions, unsaved changes |
| **Toast Notifications** | `showToast(msg, {type, duration})` | Success/error feedback, auto-dismiss |
| **Inline Validation** | `showFieldError(field, msg)` / `clearFieldErrors()` | Form validation |
| **Staging State** | `stagingPrompts[]` array with `{tempId, data}` | Batch insert workflow |
| **Dirty State Tracking** | `isDirty` flag + `onDirtyChange` callback | Unsaved changes warning |
| **Mode State** | `currentMode` = 'view' \| 'edit' \| 'new' | UI state management |

### Key Decisions

1. **Staging in memory only** - No persistence layer for staged prompts. Will be addressed when Redis is introduced for search feature. Refresh loses staged work.

2. **Batch buttons visibility** - Save All / Discard All only appear when 2+ prompts staged. Single prompt uses individual Save/Discard.

3. **Validation approach** - Inline field errors for form validation, toasts for API errors and success messages.

4. **Line edit restriction** - Disabled in Rendered view because markdown rendering makes line boundaries ambiguous.

5. **isDirty reset** - Reset after capturing form data and showing new empty form to prevent spurious "discard changes" prompts.

### Files Changed

| File | Changes |
|------|---------|
| `src/ui/templates/prompts.html` | +788 lines - Insert/edit modes, staging, modals, toasts |
| `public/js/prompt-editor.js` | +455 lines - New component for create/edit form |
| `public/js/prompt-viewer.js` | +80 lines - Line edit mode |
| `public/shared/themes/base.css` | +366 lines - Modal, toast, form, staging styles |
| `public/shared/prompt-viewer.css` | +73 lines - Line edit styles |
| `src/routes/prompts.ts` | +67 lines - PUT endpoint |
| `convex/model/prompts.ts` | +108 lines - updateBySlug mutation |
| `convex/prompts.ts` | +28 lines - Export update mutation |

### Commits

```
aa8ad6a fix: Reset isDirty when adding new staging prompt
65bca05 feat: UX improvements for batch staging and validation
35018e8 fix: Capture form data before creating new staging entry
3317e7c feat: Replace native dialogs with themed modal and toast system
2822c4e fix: Improve staging item layout in sidebar
b482939 fix: Disable line edit mode in Rendered view
2be6ff9 fix: Disable line edit in rendered view
35d3390 fix: Reduce line edit mode whitespace
82d4dae feat: Phase 6a - New/edit modes, batch insert, and line edit
816977c test: harden UI tests with assertElement helper
```

---

## Phase 6b: Hardening (Planned)

### For Implementing Agents

**Getting Started:**
1. Read `docs/ui-arch-patterns-design.md` for architecture context
2. Read `CLAUDE.md` for project conventions
3. Review existing test patterns in `tests/service/ui/` before writing new tests

**How to run tests:**
```bash
bun run test                    # All tests
bun run test prompt-editor      # Specific file
bun run test --watch            # Watch mode
```

**Suggested work order:**
1. Architecture doc updates (Section 2 below)
2. UI tests for insert mode
3. UI tests for edit mode
4. UI tests for modal/toast
5. UI tests for line edit
6. Tech debt items

---

### Architecture Document Updates

Update `docs/ui-arch-patterns-design.md`:

#### Section 4 (Portlets)
- [ ] Add `currentMode` state variable documentation
- [ ] Document staging state pattern (`stagingPrompts[]` structure)
- [ ] Update mode values: 'empty' | 'view' | 'edit' | 'new'
- [ ] Remove "planned - Phase 6" notes, mark as implemented

#### Section 5 (Components)
- [ ] Add `prompt-editor.js` component documentation
- [ ] Document component interface: `init()`, `destroy()`, `getFormData()`, `setData()`
- [ ] Document toolbar feature and keyboard shortcuts
- [ ] Document dirty state callback pattern

#### Section 6 (Message Protocol)
- [ ] Add `dirty:change` message (Portlet → Shell)

#### Section 10 (Error Handling)
- [ ] Document modal pattern (`showConfirm`)
- [ ] Document toast pattern (`showToast`)
- [ ] Document inline validation pattern

#### Section 11 (API Reference)
- [ ] Mark `PUT /api/prompts/:slug` as implemented

#### Section 14 (Current Inventory)
- [ ] Update Routes table - mark edit mode as Active
- [ ] Update Files table - add prompt-editor.js
- [ ] Update header "Last updated" to Phase 6b

---

### Test Cases to Add

**Note:** API tests for `PUT /api/prompts/:slug` are already complete in `tests/service/prompts/updatePrompt.test.ts` (authentication, validation, success paths, error handling).

#### TC-6.1: Insert Mode - Single Prompt
Location: `tests/service/ui/prompts-module.test.ts`

Follow pattern from existing TC-3.1 test. Mock: `POST /api/prompts`.

- [ ] Clicking +New enters insert mode (editor visible, empty state hidden)
- [ ] Form shows empty/placeholder values for new prompt
- [ ] Valid form submission calls POST /api/prompts with form data
- [ ] Successful save exits insert mode and shows new prompt in list
- [ ] Validation errors display inline on form fields
- [ ] Discard button exits insert mode without API call

#### TC-6.2: Insert Mode - Batch Staging
Location: `tests/service/ui/prompts-module.test.ts`

Mock: `POST /api/prompts` (batch).

- [ ] Multiple +New clicks create multiple staging entries in sidebar
- [ ] Staging header with Save All/Discard All appears when 2+ staged
- [ ] Switching between staged prompts retains form data
- [ ] Save All validates all prompts before submitting
- [ ] Save All sends batch POST and exits insert mode on success
- [ ] Discard All shows confirmation modal and clears all staging on confirm
- [ ] Remove (×) button removes individual staging item

#### TC-6.3: Edit Mode
Location: `tests/service/ui/prompts-module.test.ts`

Mock: `PUT /api/prompts/:slug`.

- [ ] Edit button enters edit mode with form pre-populated
- [ ] Form fields contain existing prompt data
- [ ] Valid save calls PUT /api/prompts/:slug
- [ ] Successful save returns to view mode showing updated content
- [ ] Discard returns to view mode without API call
- [ ] 404 response shows error toast

#### TC-6.4: Unsaved Changes Warning
Location: `tests/service/ui/prompts-module.test.ts`

- [ ] No confirmation when navigating away without edits
- [ ] Confirmation modal appears when navigating away with unsaved edits
- [ ] Cancel keeps user on current form
- [ ] OK discards changes and navigates

#### TC-6.5: Modal and Toast
Location: `tests/service/ui/modal-toast.test.ts` (new file)

Follow component test pattern from `prompt-viewer.test.ts`.

- [ ] `showConfirm()` displays modal with message and Cancel/OK buttons
- [ ] Modal OK resolves promise with true, Cancel with false
- [ ] `showToast()` displays message that auto-dismisses
- [ ] Toast displays correct styling for error/success/info types

#### TC-6.6: Line Edit Mode
Location: `tests/service/ui/prompt-viewer.test.ts`

Follow pattern from existing view mode tests.

- [ ] Line Edit toggle exists and is disabled in Rendered view
- [ ] Toggle enables clickable lines in Semantic/Plain views
- [ ] Clicking line shows input with line content
- [ ] Blur saves edited content via callback
- [ ] Escape cancels edit without saving

#### TC-6.7: Editor Toolbar
Location: `tests/service/ui/prompt-editor.test.ts` (new file)

Follow component test pattern from `prompt-viewer.test.ts`.

- [ ] Toolbar appears when text selected in content textarea
- [ ] Tag wrap button inserts `<tag>selection</tag>` around selected text
- [ ] Variable wrap button inserts `{{selection}}` around selected text
- [ ] Toolbar hidden when no selection

---

### Tech Debt to Address

#### P1: Code Organization
- [ ] Extract `showConfirm()` and `showToast()` from `prompts.html` to `public/js/components/modal.js` and `toast.js`
  - These are reusable patterns that will be needed by other portlets
  - Export as ES modules with `init(containerEl)` pattern

#### P2: Validation Consolidation
- [ ] Slug regex exists in 3 places - choose one approach:
  - **Option A:** Single shared constants file imported by all
  - **Option B:** Server-side only validation, frontend relies on API errors
  - Current locations: `src/routes/prompts.ts:18`, `public/js/prompt-editor.js:239`, `convex/model/prompts.ts:12`

#### P3: Minor Fixes
- [ ] Copy button may need `allow="clipboard-write"` on iframe in `shell.html` for feedback to work
- [ ] Document "sidebar doesn't update name in real-time" as known limitation (enhancement for later)

---

### Definition of Done (6b)

- [ ] All architecture doc sections updated
- [ ] All test cases (TC-6.1 through TC-6.7) implemented and passing
- [ ] P1 tech debt addressed
- [ ] P2/P3 tech debt addressed or documented as future work
- [ ] `bun run format && bun run lint && bun run typecheck && bun run test` passes
- [ ] Manual smoke test of create/edit/batch flows
- [ ] PR created and ready for review

---

## References

- [UI Architecture Doc](../../ui-arch-patterns-design.md)
- [CLAUDE.md](../../../CLAUDE.md)
- Existing test patterns: `tests/service/ui/prompts-module.test.ts`, `tests/service/ui/prompt-viewer.test.ts`
- bd issue: `promptdb-fjg` (copy button feedback)
- Branch: `new-edit`
- Base: `main`
