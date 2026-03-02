# Story 6: Web UI Merge Mode

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Provide an interactive merge mode in the web viewer where `{{fieldName}}` tokens
become inline inputs, duplicates synchronize, and copy produces merged content.

## Scope

### In Scope
- Merge mode toggle only when a prompt has merge fields
- Rendered (markdown) merge view with prominent inline inputs and `{{braces}}` styling
- Duplicate fields synchronize
- Copy triggers merge via REST endpoint and writes merged content to clipboard
- Unfilled-field warnings that do not block copy
- Dirty-state confirmation on exit and navigation
- Mode interaction with line edit: save-before-switch, hide authoring controls, restore prior state
- Keyboard navigation via Tab
- Values displayed as plain text (no HTML rendering), and not persisted across sessions

### Out of Scope
- Persisting merge values or merge history
- Merge-field metadata beyond name strings

## Dependencies / Prerequisites

- Story 1 complete (web UI needs `mergeFields` from reads)
- Story 2 complete (copy uses merge endpoint)
- Story 5 complete (save-before-switch requires real save semantics)

## Acceptance Criteria

**AC-3.1:** Merge mode is available when a prompt has merge fields

- **TC-3.1a: Merge mode entry point visible**
  - Given: A prompt with merge fields is displayed in the viewer
  - When: User views the prompt
  - Then: A merge mode control is visible
- **TC-3.1b: Merge mode entry point hidden for prompts without merge fields**
  - Given: A prompt with no merge fields is displayed
  - When: User views the prompt
  - Then: No merge mode control is visible

**AC-3.2:** Merge mode renders the prompt in rendered (markdown) view with merge fields as prominent inline inputs

- **TC-3.2a: Content renders as markdown**
  - Given: Prompt content has markdown formatting (headers, bold, code blocks)
  - When: User enters merge mode
  - Then: Content displays with markdown formatting applied, not as raw source text
- **TC-3.2b: Fields become prominent inputs with braces**
  - Given: Prompt content has `{{language}}` and `{{code}}`
  - When: User enters merge mode
  - Then: Each `{{fieldName}}` occurrence renders as a prominent inline text input with braces and the field name as placeholder
- **TC-3.2c: Duplicate fields synchronize**
  - Given: `{{language}}` appears three times in content
  - When: User types "Python" into any one of the `language` inputs
  - Then: All three `language` inputs reflect "Python"
- **TC-3.2d: Filled fields are visually distinct from unfilled fields**
  - Given: User is in merge mode
  - When: User fills in a value for one field but not another
  - Then: The filled field is visually distinguishable from the unfilled field

**AC-3.3:** Merge mode copy produces the merged content

- **TC-3.3a: Full merge copy**
  - Given: User has filled in all merge fields
  - When: User copies the merged result
  - Then: Clipboard contains the prompt content with all fields replaced by entered values
- **TC-3.3b: Partial merge copy**
  - Given: User has filled some but not all fields
  - When: User copies
  - Then: Clipboard contains content with filled fields replaced and unfilled fields as `{{fieldName}}`

**AC-3.4:** Warning when copying with unfilled fields

- **TC-3.4a: Unfilled field warning**
  - Given: User is in merge mode with unfilled fields remaining
  - When: User initiates copy
  - Then: A warning lists the names of the unfilled fields
- **TC-3.4b: Warning does not block copy**
  - Given: Warning is displayed about unfilled fields
  - When: User proceeds
  - Then: The partial merge is copied to clipboard

**AC-3.5:** Merge mode hides Line Edit toggle and Edit button

- **TC-3.5a: Authoring controls hidden in merge mode**
  - Given: User is in normal view with Line Edit toggle and Edit button visible
  - When: User enters merge mode
  - Then: Line Edit toggle and Edit button are not visible
- **TC-3.5b: Authoring controls restored on exit**
  - Given: User is in merge mode (authoring controls hidden)
  - When: User exits merge mode
  - Then: Line Edit toggle and Edit button are visible again

**AC-3.6:** Exiting merge mode restores previous viewer state

- **TC-3.6a: Line edit resumes if it was on**
  - Given: Line edit was enabled (localStorage), user entered merge mode
  - When: User exits merge mode
  - Then: Line edit is active again - lines are clickable for editing
- **TC-3.6b: Plain view if line edit was off**
  - Given: Line edit was disabled, user entered merge mode
  - When: User exits merge mode
  - Then: Viewer returns to normal semantic view without line edit
- **TC-3.6c: Line edit localStorage preference unchanged**
  - Given: Line edit was enabled in localStorage
  - When: User enters and then exits merge mode
  - Then: localStorage `lineEditEnabled` value has not changed

**AC-3.7:** Exiting merge mode with unsaved work shows a confirmation

- **TC-3.7a: Confirm when fields have been filled but not copied**
  - Given: User has typed values into merge fields and has not copied
  - When: User clicks the merge mode toggle to exit
  - Then: A confirmation asks whether to discard entered values
- **TC-3.7b: No confirm when no fields have been touched**
  - Given: User entered merge mode and has not typed anything
  - When: User exits merge mode
  - Then: Merge mode exits immediately with no confirmation
- **TC-3.7c: No confirm immediately after copy**
  - Given: User filled fields and copied the merged result
  - When: User exits merge mode
  - Then: Merge mode exits immediately with no confirmation
- **TC-3.7d: Confirm if fields edited after copy**
  - Given: User filled fields, copied, then changed a field value
  - When: User exits merge mode
  - Then: A confirmation asks whether to discard entered values
- **TC-3.7e: Confirm on prompt navigation with dirty fields**
  - Given: User has typed values into merge fields and has not copied
  - When: User clicks a different prompt in the list
  - Then: A confirmation asks whether to discard entered values

**AC-3.8:** Entering merge mode saves any active line edit first

- **TC-3.8a: Active line edit saved before mode switch**
  - Given: Line edit is on and user has an active textarea (mid-edit on a line)
  - When: User clicks the merge mode toggle
  - Then: The active line edit is saved, then merge mode activates
- **TC-3.8b: Line edit save failure blocks mode switch**
  - Given: Line edit is on, user has an active textarea, and the save fails
  - When: User clicks the merge mode toggle
  - Then: Merge mode does not activate; the line edit error is displayed

**AC-3.9:** Merge mode copy increments the prompt's usage count once per copy action

- **TC-3.9a: Usage tracked on full merge copy**
  - Given: User has filled all merge fields and prompt has usage count N
  - When: User copies the merged result
  - Then: Usage count is N+1
- **TC-3.9b: Usage tracked on partial merge copy**
  - Given: User has filled some fields (unfilled warning shown) and prompt has usage count N
  - When: User proceeds with copy
  - Then: Usage count is N+1
- **TC-3.9c: Repeated copies increment each time**
  - Given: User has already copied once (usage count is N+1)
  - When: User copies again without exiting merge mode
  - Then: Usage count is N+2

**AC-3.10:** Merge mode supports keyboard navigation

- **TC-3.10a: Tab between fields**
  - Given: User is in merge mode with multiple fields
  - When: User presses Tab
  - Then: Focus moves to the next merge field input

**AC-3.11:** Merge values are displayed as plain text, not rendered as HTML

- **TC-3.11a: HTML in merge value**
  - Given: User is in merge mode
  - When: User types `<script>alert(1)</script>` into a field
  - Then: The value displays as literal text, not rendered HTML

**AC-3.12:** Entered values are not persisted across merge mode sessions (see A8)

- **TC-3.12a: Values cleared on re-entry**
  - Given: User entered values in merge mode, exited (confirmed discard or post-copy)
  - When: User re-enters merge mode
  - Then: All fields are empty

## Definition of Done

- [ ] Merge mode is discoverable only when relevant (`mergeFields.length > 0`)
- [ ] Copy uses the merge endpoint and preserves newline/literal semantics
- [ ] Exiting merge mode never flips the persisted line edit preference

## Technical Implementation

### Architecture Context

Merge mode is a new viewer state in the prompt viewer state machine. Three mutually exclusive viewer states exist: **normal view** (semantic, with optional line edit), **merge mode** (rendered/markdown with interactive inputs), and **full editor**. State machine: `home | view | merge | edit | new`.

**State Machine — Merge Mode Lifecycle:**

```
  View Mode (semantic, +/- line edit)
       |
       |  [Click merge toggle]
       |  +-- If editingLineIndex !== null (active textarea open)
       |  |   +-- Call saveCurrentLineEdit() (AC-3.8)
       |  |       +-- Save succeeds -> continue
       |  |       +-- Save fails -> abort, show error, stay in view
       |  +-- Store preMergeLineEdit = lineEditEnabled
       v
  Merge Mode (rendered/markdown view)
       +-- Line Edit toggle: hidden (AC-3.5)
       +-- Edit button: hidden (AC-3.5)
       +-- Content: pre-process raw content (strict regex -> placeholders),
       |   renderMarkdown(), replace placeholders with <input> wrappers
       +-- mergeDirty = false
       +-- On any field input event -> mergeDirty = true
       +-- On copy -> POST /api/prompts/:slug/merge
       |   +-- If unfilledFields.length > 0 -> show toast listing unfilled
       |   |   field names (non-blocking)
       |   +-- Write response.content to clipboard
       |   +-- mergeDirty = false (AC-3.7c)
       |
       |  [Click merge toggle / navigate to another prompt]
       |  +-- If mergeDirty -> confirm("Discard entered values?") (AC-3.7)
       |  |   +-- Confirm -> exit merge
       |  |   +-- Cancel -> stay in merge
       |  +-- If !mergeDirty -> exit immediately
       v
  View Mode restored (AC-3.6)
       +-- If preMergeLineEdit -> re-enable line edit, setup handlers
       +-- If !preMergeLineEdit -> plain semantic view
       +-- localStorage lineEditEnabled: unchanged
       +-- Merge field values: discarded (AC-3.12)
```

**Rendering Approach — Pre-processing Pipeline:**

Merge-mode.js pre-processes raw content before rendering to avoid ambiguity between valid and invalid tokens:

1. Scan raw content with the strict merge field regex (`/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g`)
2. Replace each valid `{{fieldName}}` with a unique placeholder (e.g., `%%%MERGE_0_name%%%`)
3. Call `renderMarkdown()` on the modified content — invalid tokens like `{{ name }}` still match `renderMarkdown`'s loose regex and become passive `.rendered-var` spans as normal
4. In the rendered HTML, replace each `%%%MERGE_N_field%%%` text node with the interactive `<span class="merge-input-wrapper"><input ...></span>` element

**Why pre-processing:** `renderMarkdown()` uses a loose regex (`/\{\{([^}]+)\}\}/g`) that trims whitespace, so `{{ name }}` produces a span with textContent "name" — identical to a span from valid `{{name}}`. Post-processing the `.rendered-var` spans would be ambiguous. Pre-processing ensures only tokens matched by the strict regex become inputs, regardless of what `renderMarkdown` does with the remaining tokens.

**Dirty-state tracking:** A single boolean `mergeDirty` in merge-mode.js. Set `true` on any field `input` event. Reset `false` after successful copy. Checked at two exit points: the merge toggle click handler, and the `selectPrompt()` navigation guard in `prompts.html`.

**Copy latency trade-off:** Copy waits on a network round-trip (`POST /:slug/merge`). The alternative — client-side string replacement + fire-and-forget `POST /:slug/usage` — would be perceptually instant. Current design is simpler (one call does merge + tracking) at the cost of slight delay on copy. Acceptable for v1; optimize if user feedback warrants.

**Merge input DOM structure:**

```html
<!-- Each merge field occurrence becomes: -->
<span class="merge-input-wrapper">
  <input type="text"
         data-field="fieldName"
         placeholder="fieldName"
         class="merge-input" />
</span>
```

- The wrapper `<span>` is required for `::before`/`::after` brace decorators — bare `<input>` elements are replaced elements and cannot have pseudo-elements.
- Tab order is preserved: only `<input>` elements are focusable, wrappers are not tab stops. Natural DOM order provides Tab navigation (TC-3.10a).
- The viewer container gets a `.merge-mode` class for CSS scoping.

**CSS Styling (`public/shared/prompt-viewer.css`):**

Merge input styles scoped under `.merge-mode` class on the viewer container:
- `.merge-input-wrapper`: inline display with `{{` / `}}` brace decorators via `::before` / `::after`
- `.merge-input-wrapper input`: sizing, border that changes when filled vs unfilled (visually distinct states for AC-3.2d)
- `.merge-mode` class added on enter, removed on exit to prevent style bleed

### Interfaces & Contracts

**Creates: `public/js/components/merge-mode.js`**

```javascript
/**
 * Merge Mode Component
 *
 * Pre-processes raw content: replaces valid {{fieldName}} tokens (strict
 * regex) with %%%MERGE_N_field%%% placeholders, renders via
 * window.promptViewer.renderMarkdown(), then replaces placeholder text
 * nodes with interactive <span class="merge-input-wrapper"><input></span>
 * elements. Inputs for the same field name are synchronized.
 * Copy produces merged content via POST /api/prompts/:slug/merge.
 *
 * State:
 * - mergeDirty: boolean — true if user has typed since last copy
 *
 * Exports:
 * - enterMergeMode(slug, content, mergeFields) -> renders merge UI
 * - exitMergeMode() -> tears down merge UI, clears values
 * - getMergeValues() -> current field values as Record<string, string>
 * - isMergeDirty() -> whether user has unsaved field entries
 * - resetMergeDirty() -> called after successful copy
 */
```

**Updates: `src/ui/templates/prompts.html`**

- Add merge-mode toggle control in viewer header (next to Copy / Line Edit). Visible only when selected prompt has `mergeFields.length > 0`.
- Hide `#edit-btn` and `#line-edit-toggle` when merge mode is active (AC-3.5). Not disabled, not grayed — hidden.
- Guard prompt navigation (`selectPrompt`) when merge mode is dirty (AC-3.7e): if `isMergeDirty()`, show confirmation before navigating.
- Save-before-switch: when entering merge mode and `editingLineIndex !== null`, call `await saveCurrentLineEdit()` and block on failure (AC-3.8).
- On successful copy: call `POST /api/prompts/:slug/merge` with `getMergeValues()`, write `response.content` to clipboard, call `resetMergeDirty()`. If `unfilledFields.length > 0`, show toast listing unfilled field names (non-blocking).

**Updates: `public/js/components/prompt-viewer.js`**

- Expose `renderMarkdown` for merge-mode usage: `window.promptViewer.renderMarkdown = renderMarkdown`. Currently file-scoped; CommonJS export only works in Node/test context. Browser usage needs the explicit window property.

**Updates: `public/shared/prompt-viewer.css`**

- Add `.merge-mode` scoped styles for `.merge-input-wrapper` (brace decorators, inline display) and `.merge-input-wrapper input` (sizing, border, filled/unfilled distinction).

**Consumes:**

- REST endpoint: `POST /api/prompts/:slug/merge` (Story 2) — for copy action
- `saveCurrentLineEdit()` from `prompts.html` script scope — for save-before-switch (Story 5 makes this awaitable)
- Toast UI: `showToast(...)` — already used in prompts module

### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-3.1a | tests/service/ui/merge-mode.test.ts | `merge mode > merge button visible for prompts with merge fields` | JSDOM: load prompts with `mergeFields: ["lang"]`, select prompt, assert merge toggle exists |
| TC-3.1b | tests/service/ui/merge-mode.test.ts | `merge mode > merge button hidden for prompts without merge fields` | JSDOM: prompt with `mergeFields: []`, assert toggle absent |
| TC-3.2a | tests/service/ui/merge-mode.test.ts | `merge mode > content renders as markdown` | Enter merge mode; assert content container has rendered HTML (e.g., `<h1>`) rather than raw markdown text |
| TC-3.2b | tests/service/ui/merge-mode.test.ts | `merge mode > fields become prominent inputs with braces` | Enter merge mode; assert `.merge-input-wrapper input` count matches `{{fieldName}}` occurrence count in content |
| TC-3.2c | tests/service/ui/merge-mode.test.ts | `merge mode > duplicate fields synchronize values` | Content with 3x `{{language}}`; type into one input; assert all three reflect the value |
| TC-3.2d | tests/service/ui/merge-mode.test.ts | `merge mode > filled fields are visually distinct` | Type value into one field; assert wrapper/input class toggles on non-empty value vs empty |
| TC-3.3a | tests/service/ui/merge-mode.test.ts | `merge mode > copy produces fully merged content` | Mock `/merge` response with merged content; click copy; assert `navigator.clipboard.writeText` called with merged content |
| TC-3.3b | tests/service/ui/merge-mode.test.ts | `merge mode > partial copy preserves unfilled fields` | Mock `/merge` response with unfilled tokens; assert clipboard has `{{fieldName}}` in content |
| TC-3.4a | tests/service/ui/merge-mode.test.ts | `merge mode > unfilled field warning on copy` | Mock response with `unfilledFields: ["b"]`; assert toast contains "b" |
| TC-3.4b | tests/service/ui/merge-mode.test.ts | `merge mode > warning does not block copy` | Assert clipboard still written even when toast shown |
| TC-3.5a | tests/service/ui/merge-mode.test.ts | `merge mode > authoring controls hidden in merge mode` | Enter merge; assert `#edit-btn` and `#line-edit-toggle` are hidden |
| TC-3.5b | tests/service/ui/merge-mode.test.ts | `merge mode > authoring controls restored on exit` | Exit merge; assert both visible again |
| TC-3.6a | tests/service/ui/merge-mode.test.ts | `merge mode > line edit resumes if it was on` | Set `lineEditEnabled = true` in localStorage; enter then exit merge; assert viewer has `line-edit-mode` class |
| TC-3.6b | tests/service/ui/merge-mode.test.ts | `merge mode > plain view if line edit was off` | `lineEditEnabled = false`; enter then exit merge; assert no `line-edit-mode` class |
| TC-3.6c | tests/service/ui/merge-mode.test.ts | `merge mode > line edit localStorage preference unchanged` | Check localStorage value before/after merge mode round-trip; assert identical |
| TC-3.7a | tests/service/ui/merge-mode.test.ts | `merge mode > confirm when fields filled but not copied` | Type into a field; click merge toggle to exit; assert `confirm()` invoked |
| TC-3.7b | tests/service/ui/merge-mode.test.ts | `merge mode > no confirm when no fields touched` | Enter/exit without typing; assert no `confirm()` call |
| TC-3.7c | tests/service/ui/merge-mode.test.ts | `merge mode > no confirm after successful copy` | Type, copy (resets dirty), exit; assert no `confirm()` call |
| TC-3.7d | tests/service/ui/merge-mode.test.ts | `merge mode > confirm if fields edited after copy` | Copy then edit a field then exit; assert `confirm()` invoked |
| TC-3.7e | tests/service/ui/merge-mode.test.ts | `merge mode > confirm on prompt navigation with dirty fields` | Type into field; click different prompt in list; assert confirm and navigation blocked unless confirmed |
| TC-3.8a | tests/service/ui/merge-mode.test.ts | `merge mode > active line edit saved before mode switch` | Start line edit, change line value, click merge toggle; assert `saveCurrentLineEdit()` called before mode switch occurs |
| TC-3.8b | tests/service/ui/merge-mode.test.ts | `merge mode > line edit save failure blocks mode switch` | Mock `saveCurrentLineEdit` to return `false`; click merge toggle; assert viewer remains in view mode (not merge) and error toast is displayed |
| TC-3.9a | tests/service/ui/merge-mode.test.ts | `merge mode > full copy increments usage count` | Mock `fetch` for `/merge`; fill all fields, click copy; assert fetch called once with POST to `/merge` |
| TC-3.9b | tests/service/ui/merge-mode.test.ts | `merge mode > partial copy increments usage count` | Mock `fetch` for `/merge`; fill some fields, click copy (proceed past warning); assert fetch called once |
| TC-3.9c | tests/service/ui/merge-mode.test.ts | `merge mode > repeated copies increment each time` | Mock `fetch` for `/merge`; click copy twice; assert fetch called twice (one per copy action) |
| TC-3.10a | tests/service/ui/merge-mode.test.ts | `merge mode > tab navigates between field inputs` | Focus first input; dispatch Tab keydown; assert focus moves to next `.merge-input` |
| TC-3.11a | tests/service/ui/merge-mode.test.ts | `merge mode > HTML in value displays as literal text` | Set input value to `<script>alert(1)</script>`; assert `input.value` is literal text, no DOM injection |
| TC-3.12a | tests/service/ui/merge-mode.test.ts | `merge mode > values cleared on re-entry` | Enter, type values, exit, re-enter; assert all inputs are empty |

### Non-TC Decided Tests

| Test File | Test Description | Source |
|-----------|------------------|--------|
| tests/service/ui/merge-mode.test.ts | `merge mode > literal %%%MERGE_N%%% text in content is not replaced` | Tech Design §0. Spec Validation — Q3 (pre-processing approach). Uses `literalPlaceholder` fixture from `tests/fixtures/merge.ts`; asserts placeholder text renders as-is while `{{name}}` becomes an input. |

This test guards against placeholder sentinel collisions in the pre-processing pipeline. If content happens to contain literal `%%%MERGE_0_name%%%` text, it must pass through as regular text, not be treated as a merge field placeholder.

### Risks & Constraints

- **Placeholder collisions:** If content contains the literal placeholder sentinel string (`%%%MERGE_N_field%%%`), the pre-processing replacement could produce false matches. The `literalPlaceholder` test fixture guards this. Consider using a more collision-resistant sentinel if this becomes a real-world issue.
- **`renderMarkdown` visibility:** Browser usage needs the explicit `window.promptViewer.renderMarkdown` export. Do not rely on Node `module.exports` — it won't work in browser context. JSDOM tests need the same export path.
- **Clipboard latency:** Merge-mode copy requires a network round-trip (`POST /merge`). Keep UI feedback responsive — consider a brief loading indicator on the copy button, but do not block the UI thread. The copy button should disable during the request to prevent double-fire.
- **Mode isolation:** Merge mode and line edit must not both attach click handlers to content. Treat merge mode as a distinct state with full teardown on exit — remove all event listeners, clear field values, remove `.merge-mode` class.
- **Navigation guard scope:** The `selectPrompt()` guard must intercept prompt switching but NOT block initial page load or browser history navigation. Only intercept user-initiated prompt selection while merge mode is dirty.

### Spec Deviation

None. Checked against Tech Design: §0. Spec Validation — Q3 (rendering approach, pre-processing pipeline, regex mismatch handling), §1. High Altitude — External Contract Changes (Web UI), §2. Medium Altitude — Flow 3: Web UI Merge Mode (full state machine, dirty-state tracking, line edit save-before-switch, copy latency trade-off), §3. Low Altitude — Web UI Component: `public/js/components/merge-mode.js`, §2. Medium Altitude — Module Architecture (Modified Files: prompts.html, prompt-viewer.js, prompt-viewer.css).

Merge mode uses the server-side merge endpoint (not client-side replacement) as described in the tech design, accepting the trade-off of a network call on copy.

## Technical Checklist

- [ ] Add `public/js/components/merge-mode.js` with full component: pre-processing pipeline, field sync, dirty tracking, exports (`enterMergeMode`, `exitMergeMode`, `getMergeValues`, `isMergeDirty`, `resetMergeDirty`).
- [ ] Add merge-mode CSS under `.merge-mode` scope in `public/shared/prompt-viewer.css`: `.merge-input-wrapper` with `::before`/`::after` brace decorators, `.merge-input-wrapper input` for sizing and filled/unfilled distinction.
- [ ] Expose `renderMarkdown` in `public/js/components/prompt-viewer.js` via `window.promptViewer.renderMarkdown`.
- [ ] Wire merge-mode into `src/ui/templates/prompts.html`: toggle control (visible when `mergeFields.length > 0`), mode state machine (enter/exit/dirty/confirm), hide authoring controls, save-before-switch guard, prompt navigation guard.
- [ ] Add UI tests in `tests/service/ui/merge-mode.test.ts` (~29 tests: 28 TC-mapped + 1 non-TC decided, covering TC-3.1* through TC-3.12*).
- [ ] Add placeholder collision test using `literalPlaceholder` fixture.
- [ ] Verify: `bun run typecheck && bun run test:ui && bun run test:service`.

---
