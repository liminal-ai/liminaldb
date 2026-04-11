# Epic: UX Bugs & Polish

This epic fixes broken interactions and modernizes the prompt editing experience
for private beta readiness. After this epic ships, the core prompt workflow
(browse, view, edit, create) works without trapping the user in broken states,
and the UI looks intentional rather than prototypical.

---

## User Profile

**Primary User:** Technical professional who stores and retrieves AI prompts
**Context:** Using the LiminalDB web UI to browse, view, and edit their prompt library
**Mental Model:** "I pick a prompt from the list, read it, maybe tweak a line, move on to the next one"
**Key Constraint:** Users expect selection to always work — clicking a prompt in the sidebar shows that prompt, regardless of what state the main panel is in

---

## Feature Overview

The web UI has several interaction bugs and visual rough edges that would frustrate beta users. Edit mode doesn't tear down when selecting a different prompt, causing stacked views and a trapped edit state. The view mode selector (Rendered/Semantic/Plain) adds a decision point that doesn't serve users — Semantic is the only mode that supports line editing and shows the actual source. The edit form uses unstyled browser-default inputs. The shell header search bar is oversized, and the user identity is raw email text with no logout affordance. Pin and favorite toggle buttons exist in the prompt viewer header but render as near-invisible dots that don't communicate their function, and the sidebar list does not sort prompts by pin/favorite tier.

---

## Scope

### In Scope

Fix the edit-mode stacking bug, simplify view modes to Semantic-only with a Line Edit toggle, modernize the edit/insert form styling, fix the shell header layout (search bar width, user menu), and polish the existing pin/favorite controls with tier-sorted sidebar ordering.

- Edit mode state management (tear down on prompt selection, draft cleanup)
- View mode simplification (Semantic default, remove mode selector, clean up stale preferences)
- Edit form visual refresh (styled inputs, layout, action bar)
- Shell header fixes (search bar width, user menu with logout)
- Pin/favorite visual polish in prompt viewer (buttons already exist but are not visually clear)
- Tier-sorted prompt list (pinned > favorited > rest, usage-sorted within tiers)

### Out of Scope

- Tag system changes (Epic 3: Tag System Revamp)
- Landing/onboarding content (Epic 4: Content, Branding & Security)
- New features (export/import, API keys, CLI)
- Mobile/responsive layout
- Theme system changes (themes already work; Theme picker position in header unchanged)
- Keyboard shortcuts beyond existing ones
- Pin/favorite toggling from sidebar list items (viewer-header only; sidebar shows indicators)
- Rendered/Plain view mode rendering code cleanup (dead code removal deferred to tech design)

### Assumptions

| ID  | Assumption                                                                                 | Status    | Owner | Notes                                                                                          |
| --- | ------------------------------------------------------------------------------------------ | --------- | ----- | ---------------------------------------------------------------------------------------------- |
| A1  | Pin/favorite backend, API, and UI toggle handlers already work                             | Validated | Lee   | Toggle buttons, optimistic update, rollback, and error toasts already implemented              |
| A2  | Ranking/sorting logic exists in Convex model layer                                         | Validated | Lee   | `model/ranking.ts` implements tier sort with weights                                           |
| A3  | Draft system (Redis-backed durable drafts) continues to work unchanged                     | Validated | Lee   | No changes to draft storage behavior; this epic defines draft cleanup on edit teardown         |
| A4  | Line Edit functionality on Semantic view continues to work as-is                           | Validated | Lee   | Removing Rendered/Plain does not affect Line Edit implementation                               |
| A5  | Shell header (shell.html) and prompts module (prompts.html) are separate DOM contexts      | Validated | Lee   | Communication via postMessage; Story 4 touches different files than Stories 1-3, 5             |

---

## Dependencies

Technical dependencies:
- Existing REST endpoint `PATCH /api/prompts/:slug/flags` (pin/favorite toggle)
- Existing REST endpoint `GET /api/prompts` (list with pinned, favorited, usageCount fields)
- Existing auth endpoint `/auth/logout` (session teardown)
- Existing draft API `DELETE /api/drafts/:draftId` (draft cleanup on discard)

No backend changes required. All work is UI-only.

---

## Flows & Requirements

### 1. Prompt Selection Tears Down Edit Mode

Selecting a prompt from the sidebar while in edit mode must cleanly exit edit mode and show the newly selected prompt in view mode. The current behavior stacks view-mode content below the edit form and traps the user. The teardown must also handle draft cleanup — any durable draft associated with the edit session is cleared from Redis when the user discards.

1. User is editing a prompt (edit form visible, may have unsaved changes)
2. User clicks a different prompt in the sidebar
3. If there are unsaved changes, system shows a confirmation dialog
4. On confirm (or if no changes), system clears the associated durable draft and tears down the edit form
5. System displays the newly selected prompt in view mode

#### Acceptance Criteria

**AC-1.1:** Selecting a prompt while in edit mode with no unsaved changes immediately shows the new prompt in view mode

- **TC-1.1a: Clean edit mode teardown on selection**
  - Given: User is in edit mode for prompt A with no unsaved changes
  - When: User clicks prompt B in the sidebar
  - Then: Edit form is hidden, prompt B is displayed in view mode, prompt B is highlighted in the sidebar
- **TC-1.1b: Edit form DOM is fully removed**
  - Given: User was in edit mode for prompt A
  - When: User selects prompt B
  - Then: The `#prompt-edit` container is hidden and the editor is destroyed (no stale form elements remain)

**AC-1.2:** Selecting a prompt while in edit mode with unsaved changes shows a confirmation dialog before navigating

- **TC-1.2a: Confirmation dialog appears on dirty navigation**
  - Given: User is in edit mode with unsaved changes (dirty state)
  - When: User clicks a different prompt in the sidebar
  - Then: A confirmation dialog appears asking whether to discard changes
- **TC-1.2b: Confirming discard tears down edit and shows new prompt**
  - Given: Confirmation dialog is showing
  - When: User confirms (OK / Discard)
  - Then: Edit form is destroyed, unsaved changes are discarded, new prompt displays in view mode
- **TC-1.2c: Canceling keeps user in edit mode**
  - Given: Confirmation dialog is showing
  - When: User cancels
  - Then: Dialog closes, user remains in edit mode for the original prompt, sidebar selection does not change

**AC-1.3:** Selecting a prompt while in new-prompt mode (creating a new prompt) follows the same teardown behavior

- **TC-1.3a: New prompt mode teardown with no content**
  - Given: User clicked "+ New" and the edit form is showing with default/empty values
  - When: User clicks an existing prompt in the sidebar
  - Then: Edit form is hidden, selected prompt displays in view mode
- **TC-1.3b: New prompt mode teardown with content triggers confirmation**
  - Given: User is creating a new prompt and has entered content (dirty state)
  - When: User clicks an existing prompt in the sidebar
  - Then: Confirmation dialog appears before navigating
- **TC-1.3c: Confirming discard in new-prompt mode navigates to selected prompt**
  - Given: Confirmation dialog is showing during new-prompt mode
  - When: User confirms discard
  - Then: New-prompt form is destroyed, selected prompt displays in view mode
- **TC-1.3d: Canceling in new-prompt mode keeps user in the new-prompt editor**
  - Given: Confirmation dialog is showing during new-prompt mode
  - When: User cancels
  - Then: Dialog closes, user remains in new-prompt editor with content intact
- **TC-1.3e: Freshly opened new-prompt form is not dirty**
  - Given: User clicks "+ New"
  - When: Edit form appears with default empty values, no fields touched
  - Then: The form is not in dirty state (no confirmation dialog on navigate away)

**AC-1.4:** Only one panel (view or edit) is ever visible at a time in the main content area

- **TC-1.4a: No stacking of view and edit panels**
  - Given: Any sequence of prompt selections and edit mode entries
  - When: User performs rapid successive clicks (select prompt A, edit, select prompt B, select prompt C)
  - Then: At no point are both `#prompt-view` and `#prompt-edit` visible simultaneously

**AC-1.5:** When edit mode ends via discard (whether by navigation, Discard button, or Line Edit navigation), the associated durable draft is cleared from Redis

- **TC-1.5a: Draft cleared on discard via navigation**
  - Given: User is editing prompt A and a durable draft has been auto-saved to Redis
  - When: User selects prompt B and confirms discard
  - Then: The draft for prompt A is deleted from Redis; shell draft indicator count decrements
- **TC-1.5b: Draft cleared on Discard button click**
  - Given: User is editing prompt A and a durable draft has been auto-saved to Redis
  - When: User clicks the Discard button
  - Then: The draft for prompt A is deleted from Redis; shell draft indicator count decrements
- **TC-1.5c: No draft delete when no draft exists**
  - Given: User is in edit mode for prompt A with no unsaved changes and no active draft
  - When: User selects prompt B (or clicks Discard)
  - Then: No draft delete call is made (no draft exists to clear)
- **TC-1.5d: Line Edit draft follows same cleanup**
  - Given: User made a line edit (via Line Edit mode) which auto-saved a draft to Redis
  - When: User selects a different prompt
  - Then: The draft is cleared from Redis, consistent with full edit mode teardown

**AC-1.6:** If the prompt being edited is deleted externally (via MCP or another tab), the edit form shows an error on save and returns to the prompt list

- **TC-1.6a: Save of deleted prompt shows error and navigates away**
  - Given: User is editing prompt A
  - When: Prompt A is deleted via MCP in another session, and user clicks Save
  - Then: An error toast appears indicating the prompt no longer exists, and the user is returned to the home/empty state

---

### 2. View Mode Simplification

The mode selector (Rendered / Semantic / Plain) is replaced by Semantic as the only view mode. Line Edit remains as a standalone toggle. This removes a decision point and standardizes on the mode that supports line editing and shows the actual prompt source with visual structure hints. Stale view mode preferences from localStorage are cleaned up on load.

1. User selects a prompt from the sidebar
2. System displays the prompt content in Semantic view (markdown syntax visible with styled headings, colored markers, highlighted parameters)
3. User optionally toggles Line Edit on/off
4. Line Edit state persists across prompt selections (via localStorage)

#### Acceptance Criteria

**AC-2.1:** Prompt content always renders in Semantic mode — no mode selector buttons are shown

- **TC-2.1a: Mode selector removed from DOM**
  - Given: User views any prompt
  - When: The prompt viewer renders
  - Then: No Rendered/Semantic/Plain toggle buttons are present in the UI
- **TC-2.1b: Content renders with Semantic formatting**
  - Given: A prompt containing markdown headings, code blocks, and `{{parameters}}`
  - When: Displayed in the viewer
  - Then: Markdown markers (`##`, triple backticks) are visible, headings are bold, markers are colored, parameters are highlighted
- **TC-2.1c: Stale view mode preference is reset**
  - Given: User previously had `promptViewMode` set to `'rendered'` or `'plain'` in localStorage
  - When: Page loads
  - Then: The stored value is cleared or ignored; content renders in Semantic mode

**AC-2.2:** Line Edit toggle is displayed as a standalone control in the viewer header

- **TC-2.2a: Line Edit toggle present and functional**
  - Given: User is viewing a prompt
  - When: User clicks the Line Edit toggle
  - Then: Toggle shows active state, content becomes line-editable (click a line to edit inline)
- **TC-2.2b: Line Edit state persists across prompt selections**
  - Given: User enables Line Edit
  - When: User selects a different prompt
  - Then: Line Edit remains enabled for the new prompt
- **TC-2.2c: Line Edit state persists across page reloads**
  - Given: User enables Line Edit
  - When: User reloads the page and selects a prompt
  - Then: Line Edit is still enabled (read from localStorage)

**AC-2.3:** Copy button copies the original content string, not the rendered HTML

- **TC-2.3a: Copy button copies raw content**
  - Given: User is viewing a prompt
  - When: User clicks Copy
  - Then: The original prompt content string (as stored in the database) is copied to clipboard, not the Semantic-formatted HTML visible in the viewer

---

### 3. Edit Form Modernization

The edit/insert form (for both new prompts and editing existing ones) is visually updated from unstyled browser defaults to a styled, readable form with clear visual hierarchy. The tag selector section (which is already styled) remains unchanged.

1. User clicks Edit on a prompt (or "+ New" for a new prompt)
2. System shows the edit form with styled inputs, clear labels, and a content textarea
3. User fills in or modifies fields
4. User clicks Save or Discard via the action bar

#### Acceptance Criteria

**AC-3.1:** All form inputs (slug, name, description) use styled text inputs with visible borders, padding, border-radius, and focus ring

- **TC-3.1a: Inputs have consistent styling**
  - Given: User opens the edit or new-prompt form
  - When: Form renders
  - Then: All text inputs have rounded borders, internal padding, and a visible but subtle border
- **TC-3.1b: Focus state is visually distinct**
  - Given: User tabs into or clicks a form input
  - When: Input receives focus
  - Then: A focus ring (matching the theme accent color) is visible

**AC-3.2:** The content field is a tall textarea with monospace font, appropriate for structured prompt text

- **TC-3.2a: Content textarea uses monospace font**
  - Given: User opens the edit form
  - When: Form renders
  - Then: The content textarea uses a monospace font (IBM Plex Mono or equivalent)
- **TC-3.2b: Content textarea has adequate default height**
  - Given: User opens the edit form
  - When: Form renders
  - Then: The content textarea is at least 300px tall (not a single-line input)

**AC-3.3:** Form fields have consistent vertical spacing and clear label hierarchy

- **TC-3.3a: Labels are visually distinct from inputs**
  - Given: User views the edit form
  - When: Form renders
  - Then: Field labels use a smaller font size with semi-bold weight, with consistent spacing between label and input
- **TC-3.3b: Vertical rhythm is uniform**
  - Given: User views the edit form
  - When: Form renders
  - Then: Spacing between field groups is uniform throughout the form

**AC-3.4:** Save and Discard buttons are in a sticky action bar at the bottom of the form

- **TC-3.4a: Action bar is visually separated**
  - Given: User is in edit mode
  - When: Form renders
  - Then: Save and Discard buttons are in a distinct bar (border-top or background differentiation) at the bottom of the form
- **TC-3.4b: Action bar remains visible during scroll**
  - Given: User is editing a prompt with long content that requires scrolling
  - When: User scrolls the form content
  - Then: The action bar remains sticky/visible at the bottom of the viewport

**AC-3.5:** The edit form is contained within a card or panel to visually separate it from the surrounding layout

- **TC-3.5a: Form has container styling**
  - Given: User enters edit mode
  - When: The edit form renders
  - Then: The form is wrapped in a container with a subtle background, border, or shadow that distinguishes it from the page background

---

### 4. Shell Header Fixes

The shell header has two layout issues: the search bar is too wide, and the user identity is displayed as raw email text with no interaction. Note: the shell header is in `shell.html` (parent frame), separate from the prompts module iframe.

#### Acceptance Criteria

**AC-4.1:** Search input has a constrained max-width of 280px

- **TC-4.1a: Search bar does not exceed max-width**
  - Given: User views the shell on a wide viewport (1400px+)
  - When: The shell header renders
  - Then: The search input does not exceed 280px width
- **TC-4.1b: Search bar remains functional at constrained width**
  - Given: Search input is at its max-width
  - When: User types a long search query
  - Then: Text scrolls within the input; the input does not grow

**AC-4.2:** User identity area shows a user menu button that reveals a dropdown with at least a Logout option

- **TC-4.2a: User menu button replaces raw email**
  - Given: User is logged in
  - When: Shell header renders
  - Then: Instead of the full email string, a compact user menu button is displayed (e.g., initials, avatar placeholder, or truncated email)
- **TC-4.2b: Clicking user menu reveals dropdown with Logout**
  - Given: User menu button is displayed
  - When: User clicks the button
  - Then: A dropdown menu appears with at least a "Log out" option
- **TC-4.2c: Logout navigates to auth logout endpoint**
  - Given: Dropdown is open
  - When: User clicks "Log out"
  - Then: Browser navigates to `/auth/logout`, clearing the session
- **TC-4.2d: Clicking outside the dropdown closes it**
  - Given: User menu dropdown is open
  - When: User clicks anywhere outside the dropdown
  - Then: The dropdown closes
- **TC-4.2e: Escape key closes the dropdown**
  - Given: User menu dropdown is open
  - When: User presses Escape
  - Then: The dropdown closes

---

### 5. Pin/Favorite Visual Polish & Tier Sorting

Pin and favorite toggle buttons already exist in the prompt viewer header with working handlers, optimistic update, rollback, and error toasts. However, the buttons currently render as near-invisible dots (`··`) that don't communicate their function. This flow addresses visual clarity of the existing controls and adds tier-based sorting to the sidebar prompt list.

**Current state:** Pin and favorite toggle buttons, optimistic update with rollback, error toasts on failure, and sidebar indicators are all already implemented and functional. The buttons render as near-invisible dots that don't communicate their purpose.

**What this flow adds:**
- Visually clear, recognizable pin and favorite buttons (not invisible dots)
- Verified end-to-end tier sorting in the sidebar list
- Explicit error feedback requirement codified in the spec

1. User selects a prompt
2. Pin and favorite toggle buttons are clearly visible and recognizable in the prompt header
3. User clicks pin — button shows active state, prompt moves to top tier in sidebar
4. Changes persist via API with error toast on failure

#### Acceptance Criteria

**AC-5.1:** Pin and favorite toggle buttons are visually clear and recognizable in the prompt viewer header

- **TC-5.1a: Buttons are visually identifiable**
  - Given: User selects any prompt
  - When: Prompt viewer renders
  - Then: Pin and favorite buttons are visually recognizable (not rendered as invisible dots); each has a distinct icon or label that communicates its purpose
- **TC-5.1b: Active state is visually distinct from inactive**
  - Given: User selects a prompt that is pinned but not favorited
  - When: Prompt viewer renders
  - Then: Pin button shows a clearly different visual state (color, fill, weight) from the inactive favorite button

**AC-5.2:** Pin and favorite toggles update both the viewer and sidebar, with error feedback on failure

- **TC-5.2a: Toggle updates viewer immediately**
  - Given: User is viewing an unpinned prompt
  - When: User clicks the pin button
  - Then: Pin button shows active state immediately (optimistic update)
- **TC-5.2b: Toggle updates sidebar indicator**
  - Given: User pins a prompt
  - When: Pin is toggled
  - Then: The prompt's pin indicator (📌) appears in the sidebar list item
- **TC-5.2c: Failed API call rolls back and shows error toast**
  - Given: User toggles pin
  - When: The API call to `PATCH /api/prompts/:slug/flags` fails
  - Then: Pin state reverts to previous value in both viewer and sidebar, and an error toast is displayed
- **TC-5.2d: Favorite toggle has the same optimistic update and error behavior as pin**
  - Given: User toggles favorite
  - When: API succeeds or fails
  - Then: Behavior mirrors pin toggle: optimistic update, sidebar indicator update, rollback with error toast on failure

**AC-5.3:** Sidebar prompt list is sorted in three tiers: pinned first, then favorited (not pinned), then the rest — with usage count as the primary sort key and name alphabetical as the tiebreaker within each tier

- **TC-5.3a: Pinned prompts appear first in the list**
  - Given: Library contains pinned, favorited, and regular prompts
  - When: Prompt list renders
  - Then: All pinned prompts appear before any non-pinned prompts
- **TC-5.3b: Favorited prompts appear after pinned, before regular**
  - Given: Library contains pinned, favorited, and regular prompts
  - When: Prompt list renders
  - Then: Non-pinned favorited prompts appear after pinned prompts and before regular prompts
- **TC-5.3c: Within each tier, prompts are sorted by usage count descending, then name ascending**
  - Given: Multiple prompts in the same tier, two with equal usage counts
  - When: Prompt list renders
  - Then: Higher usage count prompts appear first; prompts with equal usage are sorted by name alphabetically
- **TC-5.3d: Prompts with undefined usage count are treated as 0 for sorting**
  - Given: Prompts in the same tier with `usageCount` of 5, 0, and undefined
  - When: Prompt list renders
  - Then: usageCount 5 appears first; prompts with usageCount 0 and undefined are equivalent and sorted by name tiebreaker
- **TC-5.3e: Toggling pin/favorite re-sorts the list**
  - Given: User pins or favorites a prompt
  - When: Toggle completes
  - Then: The sidebar list re-sorts to reflect the new tier placement

---

### 6. Error and Cancel Flows

Edge cases and error handling across the features in this epic.

#### Acceptance Criteria

**AC-6.1:** Rapid clicks on sidebar prompts while in edit mode do not result in race conditions or multiple confirmation dialogs

- **TC-6.1a: Only one confirmation dialog at a time**
  - Given: User is in edit mode with unsaved changes
  - When: User clicks three different prompts rapidly
  - Then: At most one confirmation dialog is shown; subsequent clicks are ignored until the dialog resolves

---

## Data Contracts

No new API endpoints or data shapes are introduced by this epic. All changes are UI-only, consuming existing REST endpoints:

- `PATCH /api/prompts/:slug/flags` — update prompt flags (request: `{ pinned?: boolean, favorited?: boolean }`, success: `200`, failure: `400`/`404`/`500` triggers optimistic rollback)
- `GET /api/prompts` — list prompts (returns pinned, favorited, usageCount fields per prompt)
- `GET /auth/logout` — existing logout endpoint (redirects to clear session)
- `DELETE /api/drafts/:draftId` — clear durable draft on edit discard

### Sidebar Sort Order

The sidebar displays prompts in three tiers:

| Tier | Criteria                                   | Primary Sort            | Tiebreaker       |
| ---- | ------------------------------------------ | ----------------------- | ---------------- |
| 1    | `pinned === true`                          | `usageCount` descending | `name` ascending |
| 2    | `favorited === true` AND `pinned !== true` | `usageCount` descending | `name` ascending |
| 3    | Everything else                            | `usageCount` descending | `name` ascending |

`usageCount` of `undefined` or `null` is treated as `0`.

---

## Non-Functional Requirements

### Performance

- Prompt selection (including edit mode teardown) completes with no visible delay between click and content swap
- Sidebar re-sort after pin/favorite toggle completes without visible flicker

### Accessibility

- All interactive elements (pin, favorite, Line Edit toggle, user menu) are keyboard-accessible
- Toggle buttons use `aria-pressed` attribute (already present for pin/favorite)
- Confirmation dialog traps focus
- User menu dropdown is dismissible via Escape key

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. Should `selectPrompt` call `hideEditor()` directly, or should there be an intermediate state machine that manages view/edit/new modes?
2. For the edit form styling: apply styles via the existing theme CSS custom properties, or add a dedicated `prompt-editor.css` file?
3. The user menu dropdown — implement as a simple show/hide div (like the existing theme picker), or extract a reusable dropdown component?
4. Sidebar tier sorting — implement in `renderPromptList` (client-side sort before render) or request pre-sorted from the API? The ranking model already supports this server-side.
5. The `prompt-editor.js` component generates HTML via `innerHTML` with bare `<input>` and `<textarea>` tags. Should Story 3 add CSS class hooks to the generated markup, or override with CSS element selectors?
6. Dead code: after removing Rendered/Plain modes, the rendering branches for those modes remain in `prompt-viewer.js`. Remove in this epic or defer?
7. Copy behavior: the current Copy implementation varies by view mode. With only Semantic mode, should it copy from the DOM text content or from the stored content string? (Spec requires: stored content string.)

---

## Recommended Story Breakdown

### Story 0: Foundation

**Delivers:** Test fixtures and utilities needed by subsequent stories
**ACs covered:** None directly — infrastructure only

- Extend existing UI test setup for edit mode teardown assertions
- Add test helper for simulating sidebar prompt clicks during edit mode
- Add test helper for verifying single-panel visibility invariant

### Story 1: Edit Mode Teardown on Prompt Selection

**Delivers:** Users can always navigate between prompts without getting trapped in edit mode; drafts are cleaned up on discard
**Prerequisite:** Story 0
**ACs covered:**

- AC-1.1 (clean teardown, no unsaved changes)
- AC-1.2 (confirmation dialog on dirty state)
- AC-1.3 (new-prompt mode teardown including confirm/cancel outcomes)
- AC-1.4 (single panel invariant)
- AC-1.5 (draft cleanup on teardown)
- AC-1.6 (error on save of deleted prompt)
- AC-6.1 (rapid click protection)

### Story 2: View Mode Simplification

**Delivers:** Semantic is the only view mode, Line Edit is a standalone toggle, stale preferences cleaned up
**Prerequisite:** Story 1
**ACs covered:**

- AC-2.1 (Semantic only, no mode selector, localStorage migration)
- AC-2.2 (Line Edit toggle)
- AC-2.3 (Copy copies raw content string)

### Story 3: Edit Form Modernization

**Delivers:** The edit/insert form looks intentional and professional
**Prerequisite:** Story 1
**ACs covered:**

- AC-3.1 (styled inputs)
- AC-3.2 (monospace content textarea)
- AC-3.3 (label hierarchy and spacing)
- AC-3.4 (sticky action bar)
- AC-3.5 (form container styling)

### Story 4: Shell Header Fixes

**Delivers:** Search bar is properly sized, user menu with logout replaces raw email
**Prerequisite:** None (independent of other stories, different DOM context)
**ACs covered:**

- AC-4.1 (search bar max-width)
- AC-4.2 (user menu with logout, dropdown dismiss)

### Story 5: Pin/Favorite Visual Polish & Tier Sorting

**Delivers:** Pin/favorite buttons are visually clear and recognizable, sidebar reflects tier ordering
**Prerequisite:** Story 1 (depends on stable prompt selection behavior)
**ACs covered:**

- AC-5.1 (button visual clarity)
- AC-5.2 (toggle with optimistic update and error toast)
- AC-5.3 (tier-sorted sidebar with tiebreaker)

---

## Validation Checklist

- [x] User Profile has all four fields + Feature Overview
- [x] Flows cover all paths (happy, alternate, cancel/error)
- [x] Every AC is testable (no vague terms)
- [x] Every AC has at least one TC
- [x] TCs cover happy path, edge cases, and errors
- [x] Data contracts noted (existing endpoints documented with request/response shapes)
- [x] Scope boundaries are explicit (in/out/assumptions)
- [x] Dependencies section present
- [x] Story breakdown covers all ACs
- [x] Stories sequence logically
- [x] Validator review complete (round 2: Claude, GPT-52, GPT-53-Codex — all READY)
- [x] Self-review complete (round 2)
