# Phase 6: Insert/Edit Modes

> **Epic:** O1 - Core Prompt Management
> **Status:** 6a Complete, 6b In Progress
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
- Keyboard shortcuts: Cmd+T (tag), Cmd+Shift+V (variable)

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
35d3390 fix: Reduce line edit mode whitespace
82d4dae feat: Phase 6a - New/edit modes, batch insert, and line edit
```

---

## Phase 6b: Hardening (Planned)

### Architecture Document Updates

Update `docs/ui-arch-patterns-design.md`:

#### Section 4 (Portlets)
- [ ] Add `currentMode` state variable documentation
- [ ] Document staging state pattern (`stagingPrompts[]` structure)
- [ ] Update mode values: 'empty' | 'view' | 'edit' | 'new'
- [ ] Remove "planned - Phase 6" notes, mark as implemented

#### Section 5 (Components)
- [ ] Add `prompt-editor.js` component documentation
- [ ] Document component interface: `init(container, options)`, `destroy()`, `getFormData()`, `setData()`
- [ ] Document toolbar feature and keyboard shortcuts
- [ ] Document dirty state callback pattern

#### Section 6 (Message Protocol)
- [ ] Add `dirty:change` message (Portlet → Shell)
- [ ] Document payload: `{ dirty: boolean }`

#### Section 10 (Error Handling)
- [ ] Document modal pattern (`showConfirm`)
- [ ] Document toast pattern (`showToast`)
- [ ] Document inline validation pattern
- [ ] Update "Planned Improvements" table to reflect what's implemented

#### Section 11 (API Reference)
- [ ] Mark `PUT /api/prompts/:slug` as implemented
- [ ] Add response shape documentation

#### Section 12 (Testing Patterns)
- [ ] Add new test categories for Phase 6 features
- [ ] Document component test pattern for prompt-editor

#### Section 14 (Current Inventory)
- [ ] Update Routes table - mark edit mode as Active
- [ ] Update Files table - add prompt-editor.js
- [ ] Remove "Legacy" and "Phase 6" notes where applicable

#### Header
- [ ] Update "Last updated" to Phase 6b

---

### Test Cases to Add

#### prompt-editor.js Component Tests
Location: `tests/service/ui/prompt-editor.test.ts`

**Rendering**
- [ ] Renders all form fields (slug, name, description, content, tags)
- [ ] Populates form with initial data when provided
- [ ] Shows placeholders when no initial data
- [ ] Renders toolbar (hidden by default)

**Validation**
- [ ] Returns error for empty slug
- [ ] Returns error for empty name
- [ ] Returns error for empty description
- [ ] Returns error for empty content
- [ ] Returns error for invalid slug format (uppercase, spaces, special chars)
- [ ] Accepts valid slug format (lowercase, numbers, dashes)
- [ ] Returns all errors at once (not just first)

**Inline Errors**
- [ ] showFieldError displays error message below field
- [ ] showFieldError adds error class to field
- [ ] clearFieldErrors removes all error states
- [ ] Error clears when field value changes

**Dirty State**
- [ ] isDirty starts false
- [ ] isDirty becomes true on any input
- [ ] onDirtyChange callback fires when dirty state changes
- [ ] isDirty resets on init with new data

**Callbacks**
- [ ] onSave called with form data on save button click
- [ ] onDiscard called on discard button click
- [ ] getFormData returns current form values
- [ ] setData updates form without triggering dirty

**Toolbar**
- [ ] Toolbar hidden when no selection
- [ ] Toolbar visible when text selected in content
- [ ] Tag wrap button opens modal
- [ ] Tag wrap inserts tags around selection
- [ ] Variable wrap inserts {{}} around selection
- [ ] Keyboard shortcut Cmd+T triggers tag wrap
- [ ] Keyboard shortcut Cmd+Shift+V triggers variable wrap

#### prompts.html Portlet Tests - Insert Mode
Location: `tests/service/ui/prompts-module.test.ts`

**Enter/Exit Insert Mode**
- [ ] enterInsertMode creates staging entry
- [ ] enterInsertMode sets currentMode to 'new'
- [ ] enterInsertMode shows editor, hides viewer
- [ ] exitInsertMode clears staging array
- [ ] exitInsertMode restores prompt list
- [ ] exitInsertMode sets currentMode to 'view'

**Staging Management**
- [ ] Multiple +New creates multiple staging entries
- [ ] Each staging entry has unique tempId
- [ ] Staging entry stores form data
- [ ] Clicking +New captures current form data first
- [ ] isDirty resets after +New

**Staging List Display**
- [ ] renderStagingList shows all staged prompts
- [ ] Staging item displays name
- [ ] Staging item displays slug or "(no slug)" if empty
- [ ] Staging item shows "unsaved" status
- [ ] Staging item has remove button
- [ ] Selected staging item has selected class

**Staging Selection**
- [ ] Clicking staging item switches selection
- [ ] Switching loads that prompt's data into form
- [ ] Switching saves current form data to staging array
- [ ] No confirm dialog when switching with no changes

**Remove Staging Item**
- [ ] Remove button removes item from array
- [ ] Remove last item exits insert mode
- [ ] Remove non-selected item keeps selection
- [ ] Remove selected item selects first remaining

**Save Single**
- [ ] Save validates form before API call
- [ ] Save shows inline errors on validation failure
- [ ] Save sends POST to /api/prompts on success
- [ ] Save removes item from staging on API success
- [ ] Save shows toast on API error

**Save All**
- [ ] Save All only visible when 2+ staged
- [ ] Save All validates all prompts first
- [ ] Save All shows inline errors for invalid prompts
- [ ] Save All sends batch POST
- [ ] Save All exits insert mode on success
- [ ] Save All shows success toast

**Discard All**
- [ ] Discard All only visible when 2+ staged
- [ ] Discard All shows confirmation modal
- [ ] Discard All exits insert mode on confirm
- [ ] Discard All does nothing on cancel

#### prompts.html Portlet Tests - Edit Mode
Location: `tests/service/ui/prompts-module.test.ts`

**Enter/Exit Edit Mode**
- [ ] enterEditMode sets currentMode to 'edit'
- [ ] enterEditMode shows editor with existing data
- [ ] enterEditMode hides viewer
- [ ] Edit button triggers enterEditMode

**Edit Form**
- [ ] Form populated with existing prompt data
- [ ] Slug field is editable (for now)
- [ ] All fields reflect current prompt values

**Save Edit**
- [ ] Save validates form
- [ ] Save sends PUT to /api/prompts/:slug
- [ ] Save returns to view mode on success
- [ ] Save shows updated content in viewer
- [ ] Save shows toast on error

**Discard Edit**
- [ ] Discard returns to view mode
- [ ] Discard shows confirm if dirty
- [ ] Discard does not send API request
- [ ] Original content still displayed after discard

#### prompts.html Portlet Tests - Modal/Toast
Location: `tests/service/ui/prompts-module.test.ts`

**Confirmation Modal**
- [ ] showConfirm displays modal element
- [ ] showConfirm shows message text
- [ ] Modal has Cancel and OK buttons
- [ ] OK click resolves promise with true
- [ ] Cancel click resolves promise with false
- [ ] Modal closes after button click

**Toast Notifications**
- [ ] showToast creates toast element
- [ ] showToast displays message text
- [ ] Toast has correct type class (error/success/info)
- [ ] Toast auto-dismisses after duration
- [ ] Multiple toasts stack

#### prompt-viewer.js - Line Edit Tests
Location: `tests/service/ui/prompt-viewer.test.ts`

**Toggle**
- [ ] Line edit toggle button exists
- [ ] Toggle disabled in Rendered view
- [ ] Toggle enabled in Semantic view
- [ ] Toggle enabled in Plain view
- [ ] Clicking toggle enables line edit mode
- [ ] Clicking again disables line edit mode

**Inline Editing**
- [ ] Clicking line in edit mode shows input
- [ ] Input contains line text
- [ ] Input is focused
- [ ] Blur saves edited content
- [ ] Escape cancels edit
- [ ] Updated content passed to onLineEdit callback

---

### Tech Debt to Address

#### Code Organization
- [ ] Extract modal/toast to `public/js/components/modal.js` and `toast.js`
- [ ] Extract inline JS from `prompts.html` to ES module(s)
- [ ] Consider `public/js/portlets/prompts/` structure for large portlet

#### Validation Consolidation
- [ ] Single source of truth for slug regex
- [ ] Options: shared constants file, or server-side validation only with API errors
- [ ] Current locations: `src/routes/prompts.ts`, `public/js/prompt-editor.js`, `convex/model/prompts.ts`

#### Minor Fixes
- [ ] Copy button feedback ("Copied!") - may need clipboard-write permission on iframe
- [ ] Sidebar doesn't update name in real-time while typing (enhancement, not bug)

---

### Definition of Done (6b)

- [ ] All architecture doc sections updated
- [ ] All test cases implemented and passing
- [ ] Tech debt items addressed or documented as future work
- [ ] Manual testing of full create/edit/batch flows
- [ ] PR created and ready for review

---

## References

- [UI Architecture Doc](/docs/ui-arch-patterns-design.md)
- [CLAUDE.md](/CLAUDE.md)
- Branch: `new-edit`
- Base: `main`
