# Plan: Shell Footer + Import/Export Dialog

## Phase 1: Shell Footer Bar

**What:** 32px pinned footer in `shell.html`, outside the iframe, persistent across all modules.

**Layout:** `[+ New] [prompt count / status] ··· [Import / Export]`

### Changes

1. **`shell.html`** — Add `<footer class="shell-footer">` after `<main>`:
   - "+ New" button (accent fill, compact)
   - Status area center (prompt count, muted text)
   - "Import / Export" button (ghost/outline, compact)

2. **`base.css`** — New `.shell-footer` styles:
   - `height: 32px`, `display: flex`, `align-items: center`, pinned to bottom
   - `border-top: 1px solid var(--border-subtle)`
   - Background matches shell header (`--bg-surface`)
   - Button styles: `.shell-footer-btn` (shared base), `.shell-footer-btn-accent` (+ New), `.shell-footer-btn-ghost` (Import/Export)
   - Status text: small, muted, mono font

3. **`shell.html` JS** — Wire postMessage bridge:
   - "+ New" click → sends `{ type: 'shell:action', action: 'new-prompt' }` to portlet iframe
   - Portlet receives message → calls existing `enterNewMode()`
   - Portlet sends prompt count on load and after mutations → shell updates footer status

4. **`prompts.html`** — Remove "+ New" button and import/export buttons from sidebar header. Add message handler for `shell:action`. Broadcast prompt count to shell on list load.

5. **`base.css`** — Adjust `.shell-main` to account for footer height (subtract 32px from available space).

## Phase 2: Import/Export Dialog

**What:** Modal dialog triggered by footer button. Two tabs: Export and Import.

### Changes

6. **`shell.html`** — Add dialog HTML (overlay + tabbed content). This lives in the shell, not the portlet, since it's a shell-level concern.

7. **`base.css`** — Dialog styles extending existing `.confirm-modal` patterns. `max-width: 560px`. Checklist rows reuse prompt-item visual density.

8. **Export tab:**
   - On open: shell requests prompt list from portlet via postMessage (portlet already has the data)
   - Renders checklist: checkbox + name + slug + tags per row
   - "Select All / None" toggle
   - "Export N prompts" button
   - Click → sends selected slugs to `/api/prompts/export` (needs backend change)
   - Downloads filtered YAML

9. **Import tab:**
   - Drop zone + file picker
   - On file select: sends YAML to new `/api/prompts/import/preview` endpoint
   - Renders checklist: parsed prompts with checkboxes, duplicates dimmed + unchecked
   - "Import N prompts" button
   - Click → sends selected prompts to `/api/prompts/import` (needs backend change to accept slug filter)
   - On success: tells portlet to refresh list via postMessage

10. **Backend: `/api/prompts/export`** — Add optional `slugs` query param. If present, filter results to only those slugs before YAML generation.

11. **Backend: `/api/prompts/import/preview`** — New POST endpoint. Accepts `{ yaml: string }`, runs same parse + validation + duplicate check as import, but returns the parsed list + duplicate flags without writing anything.

12. **Backend: `/api/prompts/import`** — Add optional `slugs` filter. If present, only import prompts whose slugs are in the list (lets the UI send "import these 3 of 5").

## Phase 3: Tests

13. **Shell footer tests** — postMessage bridge for new-prompt action, prompt count broadcast
14. **Import/export dialog tests** — Tab switching, select all/none, filtered export call, preview rendering, selective import
15. **Backend tests** — Export with slugs filter, import preview endpoint, import with slugs filter

## Execution Order

Phase 1 first (footer), validate visually, then Phase 2 (dialog), then Phase 3 (tests). Each phase is independently shippable.
