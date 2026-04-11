# Story 5: Fix View-Mode Line Edit Persistence (Prerequisite: `promptdb-utq`)

**Epic:** `docs/project/epic-03-template-merge/epic.md`
**Tech Design:** `docs/project/epic-03-template-merge/tech-design.md`

## Objective

Make view-mode line edits persist correctly so merge mode can safely "save before
switch" and users are not trapped with draft-only edits.

## Scope

### In Scope
- Line edit saves persist to Convex reliably (not draft-only with no commit path)
- Save can succeed or fail, with visible failure feedback

### Out of Scope
- Merge mode UI (Story 6)
- Any editor-mode draft workflow changes beyond what's required for correctness

## Dependencies / Prerequisites

- None, but should land before Story 6

## Acceptance Criteria

**AC-LE.1:** Line edit saves persist to Convex

- **TC-LE.1a: Successful line edit persists**
  - Given: User is viewing a prompt in semantic view with line edit enabled
  - When: User edits a line and commits the line edit
  - Then: The updated content is saved to the backend and remains after refresh

**AC-LE.2:** Line edit save failures are surfaced and do not silently lose data

- **TC-LE.2a: Save failure shows error**
  - Given: User has edited a line
  - When: The save request fails
  - Then: The user sees an error and the UI does not pretend the save succeeded

## Definition of Done

- [ ] A line edit save has a real success/failure outcome (not always "draft-only")
- [ ] This behavior is safe to call synchronously before entering merge mode (Story 6 AC-3.8)

## Technical Implementation

### Architecture Context

Today, view-mode line edits update the in-memory prompt and write a Redis draft via `handleLineEdit()` in `src/ui/templates/prompts.html`, but do not commit to Convex. There is no "Save" in view mode — the draft sits in Redis with no commit path. This is bead `promptdb-utq`.

Merge mode (Story 6, AC-3.8) requires a real save-before-switch guard: when entering merge mode with an active line edit, the edit must save first, and the mode switch blocks on save failure. This requires `saveLineEdit()` / `saveCurrentLineEdit()` to be real async operations with observable success/failure outcomes.

**Before (current — saves to Redis draft only):**

```javascript
// Current flow in prompts.html:
handleLineEdit('content', newContent);
// This writes to Redis draft — no Convex commit, no error feedback
```

**After (fix — persist to Convex immediately):**

```javascript
// Updated flow:
// 1. Call PUT /api/prompts/:slug with updated content
// 2. On success: update rawPrompt + selected prompt in prompts[]
//    + clear any edit:${slug} draft from Redis
// 3. On failure: show error toast, restore previous line content
```

This changes `saveLineEdit()` from a fire-and-forget draft write to an async operation that persists to Convex. The function must return a `Promise<boolean>` (or equivalent) so callers can await the result.

**`saveCurrentLineEdit()` contract for Story 6:** This function saves any active line edit (if `editingLineIndex !== null`). After this story, it must:
- Return a Promise that resolves to `true` on success, `false` on failure.
- On success: line edit is persisted, draft is cleared, local state is updated.
- On failure: error toast is shown, line content is reverted, caller can check the return value.

This contract enables Story 6's AC-3.8 (save-before-switch): `if (!(await saveCurrentLineEdit())) return; // block mode switch`.

### Interfaces & Contracts

**Updates to `src/ui/templates/prompts.html`:**

```javascript
// saveLineEdit() — called when a line edit is committed (blur / Enter)
// Before: void (fire-and-forget to Redis)
// After: Promise<boolean> (async persist to Convex)
async function saveLineEdit(lineIndex, newValue) {
  // 1. Build updated content by splicing newValue into rawPrompt at lineIndex
  // 2. PUT /api/prompts/:slug with full PromptInput body
  // 3. On success:
  //    - Update rawPrompt with new content
  //    - Update selected prompt in prompts[] array
  //    - Delete edit:${slug} draft via DELETE /api/drafts/:draftId
  //    - Return true
  // 4. On failure:
  //    - Show error toast
  //    - Restore previous line content in the textarea
  //    - Return false
}

// saveCurrentLineEdit() — saves the active line edit if one exists
// Before: void (synchronous, draft-only)
// After: Promise<boolean> (async, awaitable)
async function saveCurrentLineEdit() {
  if (editingLineIndex === null) return true; // nothing to save
  return saveLineEdit(editingLineIndex, /* current textarea value */);
}
```

**Consumes (existing):**

- REST endpoint: `PUT /api/prompts/:slug` (already exists in `src/routes/prompts.ts`) — requires full `PromptInput` body (name, description, content, tags)
- Draft cleanup: `DELETE /api/drafts/:draftId` for clearing any `edit:${slug}` draft created by line edits

### TC -> Test Mapping

| TC | Test File | Test Description | Approach |
|----|-----------|------------------|----------|
| TC-LE.1a | tests/service/ui/prompt-viewer.test.ts | `line edit > triggers PUT /api/prompts/:slug and persists` | JSDOM test: enable line edit, edit a line, blur; assert `fetch` called with PUT method and updated content body; assert local state updated |
| TC-LE.2a | tests/service/ui/prompt-viewer.test.ts | `line edit > save failure shows error and does not claim success` | JSDOM test: mock PUT to return 500; assert toast/error visible, content reverts to previous value, `saveCurrentLineEdit()` resolves to `false` |

### Non-TC Decided Tests

None. Tech Design §3. Low Altitude — Line Edit Persistence Fix reviewed — the fix scope is limited to the two TC paths (success persist and failure feedback).

### Risks & Constraints

- **Semantic change:** Line edit becomes an immediate backend update (previously draft-only). This is the intentional fix for `promptdb-utq`, but scope must be limited to view-mode line edits only. Editor mode draft behavior is not changed.
- **Concurrency / re-entrancy:** Avoid re-entrancy when switching lines rapidly. If line A is still saving when the user clicks line B, `saveCurrentLineEdit()` must complete for A before starting B. The Promise-based interface enables this.
- **Draft hygiene:** If line edits still create drafts for crash safety (defensive), successful write-through must clear the corresponding `edit:${slug}` draft. This prevents stale drafts from accumulating.
- **Full `PromptInput` body:** `PUT /api/prompts/:slug` requires the full prompt body (name, description, content, tags), not just content. The `saveLineEdit` function must construct this from the current prompt state.

### Spec Deviation

Checked against Tech Design: §3. Low Altitude — Line Edit Persistence Fix (bead `promptdb-utq`), §2. Medium Altitude — Flow 3: Web UI Merge Mode (save-before-switch discussion), §6. Work Breakdown — Chunk 3 (task 3.1).

**Deviation — re-sharded from tech design chunk ownership:** The tech design bundles the line-edit persistence fix into Chunk 3 (task 3.1, under "Web UI Merge Mode"). Stories re-shard it into a standalone Story 5, independent of the merge mode UI work in Story 6. This allows the line-edit fix to be delivered and tested independently as a prerequisite. The fix itself is aligned with the tech design's intent (§3. Low Altitude — Line Edit Persistence Fix).

## Technical Checklist

- [ ] Update `saveLineEdit()` in `src/ui/templates/prompts.html`: change from `handleLineEdit('content', newContent)` to `PUT /api/prompts/:slug` with full `PromptInput` body.
- [ ] Make `saveLineEdit()` async, returning `Promise<boolean>` (true on success, false on failure).
- [ ] Make `saveCurrentLineEdit()` async and awaitable, delegating to `saveLineEdit()` when `editingLineIndex !== null`.
- [ ] On save success: update `rawPrompt`, update selected prompt in `prompts[]`, clear `edit:${slug}` draft.
- [ ] On save failure: show error toast, restore previous line content, return `false`.
- [ ] Add/extend JSDOM tests in `tests/service/ui/prompt-viewer.test.ts` for success and failure paths.
- [ ] Verify: `bun run typecheck && bun run test:ui`.

---
