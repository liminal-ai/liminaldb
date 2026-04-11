# Epic: Template Merge

Template merging fills handlebar-style merge fields (`{{fieldName}}`) in prompts
with user-supplied values and returns a ready-to-use result.

---

## User Profile

**Primary User:** Developer or AI model using prompts as reusable templates
**Context:** Retrieving a prompt and filling in context-specific values before using it
**Mental Model:** "I have a prompt template with blanks, I fill in the blanks, I get the final prompt"
**Key Constraint:** Must work identically across four surfaces — API, CLI, MCP, and web UI

---

## Feature Overview

Prompts can contain handlebar-style merge fields like `{{language}}` and `{{code}}`.
Today these render as styled tokens in the web UI but nothing fills them with values.
After this epic, users and AI models can see the merge fields in any prompt response,
submit values for those fields, and receive fully merged prompt content. The web UI
provides an interactive merge mode where fields become inline text inputs.

---

## Scope

### In Scope

- Parse `{{fieldName}}` merge fields from prompt content on every read
- Return deduplicated `mergeFields: string[]` with every prompt response
- Merge endpoint: accept slug + dictionary of values, return merged content
- Report unfilled fields in merge response
- Web UI merge mode with inline field editing and copy
- CLI merge command
- MCP merge tool
- Unfilled-field warnings across all surfaces

### Out of Scope

- Field metadata (type, required, description) — the existing `parameters` schema
  field is unused and unrelated to `mergeFields`. Both coexist in the DTO but serve
  different purposes: `mergeFields` is derived from content parsing, `parameters` is
  stored metadata. May be revisited in a future epic.
- Template validation or linting (e.g., detecting malformed `{{` without closing `}}`)
- Nested or conditional merge syntax (no `{{#if}}`, no `{{> partial}}`)
- Recursive merging — if a value contains `{{...}}` syntax, it appears literally in the output
- Merge field auto-complete or suggestions
- Persisting filled values or merge history

### Assumptions

| ID | Assumption | Status | Owner | Notes |
|----|------------|--------|-------|-------|
| A1 | Merge fields use `{{fieldName}}` syntax only — no other delimiters | Validated | — | Matches existing seed data and editor toolbar |
| A2 | Field names are case-sensitive — `{{Code}}` and `{{code}}` are different fields | Validated | — | Consistent with typical template systems |
| A3 | Field names match `[a-zA-Z_][a-zA-Z0-9_]*` — alphanumeric plus underscore, must start with letter or underscore. Whitespace inside braces is not trimmed; `{{ name }}` does not match. Empty `{{}}` is not a merge field. | Validated | — | Defines the parser contract across all surfaces |
| A4 | Content max length (100,000 chars) does not create performance issues for parsing | Validated | — | Single regex pass, negligible cost |
| A5 | Prompts without merge fields work unchanged — `mergeFields` returns empty array | Validated | — | No behavioral change for non-template prompts |
| A6 | All content is parsed for merge fields regardless of formatting context — fields inside code blocks, XML tags, etc. are still extracted | Validated | — | The parser treats content as a flat string |
| A7 | Merge values can contain any text including newlines and `{{...}}` syntax — no recursive merging is performed | Validated | — | Values are substituted literally |
| A8 | Web UI merge mode does not persist entered values — exiting and re-entering clears all fields | Validated | — | v1 simplicity; persisting values is future scope if needed |
| A9 | Merge mode and line edit mode are mutually exclusive — only one active at a time | Validated | — | Both want click handlers on content; concurrent activation creates ambiguity |
| A10 | Merge mode uses the rendered (markdown) view, not the semantic view used in normal browsing | Validated | — | Rendered view shows the prompt as it will look when used; merge fields stand out as the interactive elements |
| A11 | Line edit persistence bug (bead `promptdb-utq`) must be resolved before merge mode ships | Validated | — | Line edit currently saves to Redis draft with no commit path; must persist to Convex immediately |

---

## Flows & Requirements

### 1. Merge Field Extraction (All Surfaces)

Every prompt response includes a `mergeFields` array — a deduplicated list of field
names parsed from the prompt content. This is derived data computed on read, not stored.
A prompt with no `{{...}}` tokens returns an empty array.

Merge fields are extracted by scanning content for `{{fieldName}}` patterns. If
`{{language}}` appears three times in the content, `mergeFields` contains `"language"`
once. Field order in the array matches first-occurrence order in the content.

#### Acceptance Criteria

**AC-1.1:** Every prompt response includes a `mergeFields` string array

- **TC-1.1a: Prompt with merge fields**
  - Given: A prompt with content containing `{{language}}` and `{{code}}`
  - When: The prompt is fetched via any surface (API, CLI, MCP, web UI)
  - Then: Response includes `mergeFields: ["language", "code"]`
- **TC-1.1b: Prompt with no merge fields**
  - Given: A prompt with content containing no `{{...}}` tokens
  - When: The prompt is fetched
  - Then: Response includes `mergeFields: []`
- **TC-1.1c: Prompt with duplicate field names**
  - Given: A prompt with `{{language}}` appearing three times in content
  - When: The prompt is fetched
  - Then: `mergeFields` contains `"language"` once

**AC-1.2:** Merge field order matches first-occurrence order in content

- **TC-1.2a: Field ordering**
  - Given: Content is `"Write {{code}} in {{language}} using {{framework}}"`
  - When: The prompt is fetched
  - Then: `mergeFields` is `["code", "language", "framework"]`

**AC-1.3:** Merge fields are extracted from all prompt read operations

- **TC-1.3a: List/search endpoints**
  - Given: Prompts with merge fields exist
  - When: Prompts are returned via list or search
  - Then: Each prompt in the response includes its `mergeFields` array
- **TC-1.3b: Single prompt fetch**
  - Given: A prompt with merge fields exists
  - When: Fetched by slug via API, CLI, MCP, or web UI
  - Then: Response includes `mergeFields` array

**AC-1.4:** Parser only matches valid field name syntax (see A3)

- **TC-1.4a: Valid field names extracted**
  - Given: Content contains `{{language}}`, `{{my_var}}`, `{{_private}}`
  - When: The prompt is fetched
  - Then: `mergeFields` is `["language", "my_var", "_private"]`
- **TC-1.4b: Empty braces ignored**
  - Given: Content contains `{{}}`
  - When: The prompt is fetched
  - Then: `mergeFields` is `[]`
- **TC-1.4c: Whitespace inside braces not trimmed**
  - Given: Content contains `{{ name }}` (spaces inside braces)
  - When: The prompt is fetched
  - Then: `mergeFields` is `[]` — `{{ name }}` is not a valid merge field
- **TC-1.4d: Invalid characters in field name**
  - Given: Content contains `{{my field}}` (space in name) and `{{foo.bar}}` (dot in name)
  - When: The prompt is fetched
  - Then: Neither appears in `mergeFields`

### 2. Merge Operation

Submit a prompt slug and a dictionary of field name → value pairs. The system replaces
every `{{fieldName}}` in the content with the corresponding value from the dictionary.
The response returns the merged content, the full list of merge fields, and any fields
that were not filled.

A merge does not modify the stored prompt — it returns a filled copy.

1. Client provides prompt slug and a values dictionary
2. System fetches the prompt content
3. System replaces each `{{fieldName}}` with the matching dictionary value
4. System identifies any `{{fieldName}}` tokens without a matching dictionary entry
5. System returns the merged content, merge fields list, and unfilled fields list
6. System increments the prompt's usage count

#### Acceptance Criteria

**AC-2.1:** Merge replaces all occurrences of each field with the supplied value

- **TC-2.1a: Single field, single occurrence**
  - Given: Content `"Write in {{language}}"` and values `{"language": "Python"}`
  - When: Merge is executed
  - Then: Result is `"Write in Python"`
- **TC-2.1b: Single field, multiple occurrences**
  - Given: Content with `{{language}}` appearing three times and values `{"language": "Python"}`
  - When: Merge is executed
  - Then: All three occurrences are replaced with `"Python"`
- **TC-2.1c: Multiple fields**
  - Given: Content with `{{language}}` and `{{code}}` and values for both
  - When: Merge is executed
  - Then: Both fields are replaced with their respective values
- **TC-2.1d: Empty string value**
  - Given: Content `"Write in {{language}}"` and values `{"language": ""}`
  - When: Merge is executed
  - Then: Result is `"Write in "` and `language` is not in `unfilledFields` (empty string counts as filled)

**AC-2.2:** Merge response includes the list of unfilled fields in first-occurrence order

- **TC-2.2a: All fields filled**
  - Given: Content has `{{a}}` and `{{b}}`, values has both
  - When: Merge is executed
  - Then: `unfilledFields` is `[]`
- **TC-2.2b: Some fields unfilled**
  - Given: Content has `{{a}}` and `{{b}}`, values has only `{"a": "value"}`
  - When: Merge is executed
  - Then: `unfilledFields` is `["b"]`
- **TC-2.2c: No values supplied**
  - Given: Content has `{{a}}` and `{{b}}`, values is empty `{}`
  - When: Merge is executed
  - Then: `unfilledFields` is `["a", "b"]`

**AC-2.3:** Unfilled fields remain as `{{fieldName}}` in the merged content

- **TC-2.3a: Partial merge**
  - Given: Content `"{{greeting}} in {{language}}"` and values `{"greeting": "Hello"}`
  - When: Merge is executed
  - Then: Result is `"Hello in {{language}}"`

**AC-2.4:** Merge with no merge fields in content returns content unchanged

- **TC-2.4a: No-op merge**
  - Given: Content `"Just a plain prompt"` and values `{"anything": "value"}`
  - When: Merge is executed
  - Then: Result is `"Just a plain prompt"` and `unfilledFields` is `[]`
- **TC-2.4b: Empty content**
  - Given: Content is `""` (empty string) and values is `{"anything": "value"}`
  - When: Merge is executed
  - Then: Result is `""` and `mergeFields` is `[]` and `unfilledFields` is `[]`

**AC-2.5:** Merge does not modify the stored prompt

- **TC-2.5a: Original prompt unchanged**
  - Given: A prompt is merged with values
  - When: The same prompt is fetched again
  - Then: Content still contains the original `{{fieldName}}` tokens

**AC-2.6:** Extra dictionary keys not matching any merge field are ignored

- **TC-2.6a: Extra values**
  - Given: Content has `{{a}}` only, values has `{"a": "1", "b": "2"}`
  - When: Merge is executed
  - Then: Merge succeeds, `{{a}}` replaced, `"b"` ignored silently

**AC-2.7:** Merge values are substituted literally with no recursive processing (see A7)

- **TC-2.7a: Value containing merge field syntax**
  - Given: Content `"Hello {{name}}"` and values `{"name": "{{other}}"}`
  - When: Merge is executed
  - Then: Result is `"Hello {{other}}"` — the `{{other}}` in the output is literal text, not processed as a merge field
- **TC-2.7b: Value containing newlines**
  - Given: Content `"Code: {{code}}"` and values `{"code": "line1\nline2\nline3"}`
  - When: Merge is executed
  - Then: Result is `"Code: line1\nline2\nline3"` — newlines preserved literally

**AC-2.8:** Successful merge increments the prompt's usage count

- **TC-2.8a: Usage tracked on merge**
  - Given: A prompt with usage count N
  - When: Merge completes successfully
  - Then: Usage count is N+1
- **TC-2.8b: Failed merge (404) does not increment usage**
  - Given: A merge request for a nonexistent slug
  - When: Merge returns 404
  - Then: No usage count is modified
- **TC-2.8c: Validation failure (400) does not increment usage**
  - Given: A merge request with missing or invalid `values` key
  - When: Merge returns 400
  - Then: No usage count is modified

### 3. Web UI Merge Mode

Merge mode is a dedicated viewer state for filling in a prompt template. It renders
the prompt in **rendered (markdown) view** — the surrounding content displays as
formatted markdown (headers, bold, code blocks) while merge fields render as prominent
inline text inputs with `{{braces}}` styling. This gives the user a preview of the
final prompt with fill-in-the-blank slots.

Merge mode is mutually exclusive with line edit mode and the full editor (see A9).
When merge mode is active, the Line Edit toggle and Edit button are hidden. Merge
mode is exited via the merge mode toggle or implicitly when navigating to another
prompt (AC-3.7e). Exiting merge mode returns the viewer to its previous state: if
line edit was on, it resumes; if it was off, the viewer returns to plain semantic
view. Line edit's localStorage preference is never modified by merge mode (see A11
prerequisite).

The normal view mode's existing copy button copies raw content with `{{...}}` tokens
intact. Merge mode's copy produces the merged content with filled values substituted.

1. User views a prompt that has merge fields
2. User enters merge mode
3. Content re-renders in rendered (markdown) view
4. Every `{{fieldName}}` occurrence becomes a prominent inline text input
5. Inputs for the same field name stay synchronized — typing in one updates all
6. User types values into one or more fields
7. User copies the merged result
8. If unfilled fields remain at copy time, user sees a warning
9. Copy increments the prompt's usage count and resets the dirty flag

#### Acceptance Criteria

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
  - Then: Line edit is active again — lines are clickable for editing
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
  - Given: User entered merge mode but has not typed into any field
  - When: User exits merge mode
  - Then: Merge mode exits immediately with no confirmation
- **TC-3.7c: No confirm after successful copy**
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

### 4. CLI Merge Command

The CLI provides a merge command that accepts a prompt slug and field values as flags,
calls the merge API, and outputs the merged content.

```
liminaldb merge <slug> --<fieldName> <value> [--<fieldName> <value> ...]
```

Example: `liminaldb merge write-tests --language python --code "def foo(): pass"`

1. User runs merge command with slug and field flags
2. CLI calls the merge API endpoint
3. CLI outputs the merged content to stdout
4. If unfilled fields remain, CLI prints a warning to stderr

#### Acceptance Criteria

**AC-4.1:** CLI merge command accepts slug and field values as flags

- **TC-4.1a: Basic merge**
  - Given: A prompt `write-tests` with fields `{{language}}` and `{{code}}`
  - When: User runs `liminaldb merge write-tests --language python --code "def foo(): pass"`
  - Then: Merged content is printed to stdout
- **TC-4.1b: Prompt not found**
  - Given: No prompt with the given slug exists
  - When: User runs merge
  - Then: Error message is printed to stderr and exit code is non-zero

**AC-4.2:** CLI warns on unfilled fields via stderr

- **TC-4.2a: Partial merge warning**
  - Given: Prompt has fields `{{a}}` and `{{b}}`, user provides only `--a value`
  - When: User runs merge
  - Then: Merged content (with `{{b}}` unfilled) is printed to stdout, warning about unfilled `b` to stderr
- **TC-4.2b: Stdout stays clean**
  - Given: Merge has unfilled field warnings
  - When: Output is piped (e.g., `liminaldb merge ... | pbcopy`)
  - Then: Stdout contains only the merged content, warnings go to stderr

### 5. MCP Merge Tool

The MCP server exposes a `merge_prompt` tool that AI models call to fill a prompt
template. The model fetches a prompt (which includes `mergeFields`), builds a values
dictionary, and calls merge.

1. Model calls `get_prompt` — response includes `mergeFields`
2. Model builds a values dictionary from the field list
3. Model calls `merge_prompt` with slug and values
4. Tool returns merged content, merge fields, and unfilled fields list

#### Acceptance Criteria

**AC-5.1:** MCP merge tool accepts slug and values dictionary

- **TC-5.1a: Full merge via MCP**
  - Given: A prompt with merge fields
  - When: Model calls merge tool with all values
  - Then: Tool returns merged content with `unfilledFields: []`
- **TC-5.1b: Partial merge via MCP**
  - Given: A prompt with merge fields
  - When: Model calls merge tool with partial values
  - Then: Tool returns partially merged content and `unfilledFields` lists the missing fields
- **TC-5.1c: Prompt not found via MCP**
  - Given: No prompt exists with the given slug
  - When: Model calls merge tool
  - Then: Tool returns an error indicating the prompt was not found

**AC-5.2:** `get_prompt` response includes `mergeFields` array

- **TC-5.2a: MCP get_prompt includes fields**
  - Given: A prompt with `{{language}}` and `{{code}}` in content
  - When: Model calls `get_prompt`
  - Then: Response includes `mergeFields: ["language", "code"]`

---

## Data Contracts

### Merge Fields in Prompt Response

All prompt read responses gain a new field:

```typescript
interface PromptResponse {
  // ... existing fields (slug, name, description, content, tags, etc.)
  mergeFields: string[];  // deduplicated, first-occurrence order
}
```

Prompts without `{{...}}` tokens return `mergeFields: []`.

### Merge Endpoint

`POST /api/prompts/:slug/merge`

### Merge Request

```typescript
interface MergeRequest {
  values: Record<string, string>;  // values may contain newlines, {{...}} syntax, any text
}
```

If the `values` key is missing or not an object, the request returns 400.
An empty object `{}` is valid — returns content unchanged with all fields unfilled.

### Merge Response

```typescript
interface MergeResponse {
  content: string;          // merged content with values substituted
  mergeFields: string[];    // all fields found in the template (first-occurrence order)
  unfilledFields: string[]; // fields with no matching value (first-occurrence order)
}
```

### Error Responses

All errors follow the codebase convention: `{ error: "human-readable message" }`. No structured `code` field in the response body. The code column below is a documentation label, not a response field — see tech design for actual response shapes.

| Status | Code (label) | Description |
|--------|-------------|-------------|
| 404 | PROMPT_NOT_FOUND | No prompt exists with the given slug |
| 400 | INVALID_VALUES | Values key is missing or not a string-keyed object of strings |

---

## Non-Functional Requirements

### Performance
- Merge field extraction adds negligible overhead to prompt reads (single regex pass over content up to 100k chars)
- Merge operation completes within the same latency envelope as a normal prompt read

### Observability
- Merge operations tracked via existing usage tracking (usage count increment on successful merge)

---

## Tech Design Questions

Questions for the Tech Lead to address during design:

1. Where does merge field extraction live — Convex query layer, API route layer, or shared utility?
2. What happens to the existing `parameters` schema field? Remove it, deprecate it, or leave it inert?
3. How should the rendered (markdown) view styling for merge fields in merge mode differ from the existing `rendered-var` styling? The fields need to read as interactive slots, not just highlighted tokens.

---

## Recommended Story Breakdown

### Story 1: Merge Engine + API / CLI / MCP
**Delivers:** Parser utility, `mergeFields` on all prompt reads, merge endpoint,
CLI merge command, MCP merge tool. The full backend and all programmatic surfaces.
**ACs covered:**
- AC-1.1 through AC-1.4 (merge field extraction + parser rules)
- AC-2.1 through AC-2.8 (merge operation)
- AC-4.1, AC-4.2 (CLI)
- AC-5.1, AC-5.2 (MCP)

### Story 2: Web UI Merge Mode
**Delivers:** Interactive merge mode in the prompt viewer — rendered (markdown) view
with prominent inline merge field inputs, synchronized duplicate fields, copy with
merge, dirty-state confirmation, mode interaction with line edit, keyboard navigation.
**Prerequisites:** Story 1; bead `promptdb-utq` (line edit persistence fix)
**ACs covered:**
- AC-3.1 through AC-3.12 (web UI merge mode)

---

## Validation Checklist

- [x] User Profile has all four fields + Feature Overview
- [x] Flows cover all paths (happy, alternate, cancel/error)
- [x] Every AC is testable (no vague terms)
- [x] Every AC has at least one TC
- [x] TCs cover happy path, edge cases, and errors
- [x] Data contracts are fully typed
- [x] Scope boundaries are explicit (in/out/assumptions)
- [x] Story breakdown covers all ACs
- [x] Stories sequence logically
- [x] Validation rounds complete
- [x] Self-review complete

---

## Change Log: Merge Mode / Line Edit Interaction (Rev 4)

This section summarizes changes from the merge mode + line edit interaction review.

### Problem
Line edit mode and merge mode both want click handlers on prompt content. If both are
active, clicking a `{{field}}` is ambiguous — edit the line or fill the field?
Additionally, line edit currently saves to a Redis draft with no commit path from view
mode (bead `promptdb-utq`), which must be fixed before merge mode ships.

### Decisions

1. **Merge mode uses rendered (markdown) view.** Content displays with markdown
   formatting; merge fields render as prominent inline inputs with `{{braces}}`. This
   is visually distinct from the semantic view used in normal browsing and line edit,
   making the mode switch obvious. The rendered view code already exists in
   `prompt-viewer.js` (`renderMarkdown`) — merge mode swaps the `rendered-var` spans
   for interactive inputs.

2. **Merge mode and line edit are mutually exclusive (A9).** Only one active at a time.
   Entering merge mode hides line edit controls; exiting restores them (refined in Decision #3 below).

3. **Line edit button and Edit button are hidden in merge mode (AC-3.5).** Not
   disabled, not grayed out — hidden. The merge mode toggle is the explicit exit
   control; navigating to another prompt also exits (with dirty-state confirmation
   per AC-3.7e). This eliminates all "what does this button do right now" confusion.

4. **Exiting merge mode restores previous state (AC-3.6).** Line edit's localStorage
   preference is never modified by merge mode. If line edit was on, it resumes when
   merge mode exits. If it was off, viewer returns to plain semantic view.

5. **Dirty-state confirmation on exit (AC-3.7).** If the user has typed values into
   any field and has not copied, exiting merge mode (toggle or prompt navigation)
   triggers a confirmation. Copying resets the dirty flag. Editing after copying sets
   it dirty again. No-touch and post-copy exits are instant.

6. **Active line edit saves before mode switch (AC-3.8).** If user has an open
   textarea in line edit mode and clicks the merge toggle, the line edit saves first.
   If the save fails, the mode switch is blocked.

7. **Prerequisite: line edit persistence fix (A11).** Bead `promptdb-utq` — line edit
   must persist to Convex immediately instead of saving to a Redis draft with no commit
   path. This fix must ship before merge mode changes to line edit behavior.

### New/Changed ACs
- AC-3.2 updated: rendered (markdown) view with prominent `{{braces}}` inputs
- AC-3.5 new: authoring controls hidden in merge mode
- AC-3.6 new: exit restores previous viewer state, localStorage untouched
- AC-3.7 new: dirty-state confirmation (5 TCs covering all scenarios)
- AC-3.8 new: active line edit saved before mode switch
- AC-3.12 new: values cleared on re-entry (extracted from old AC-3.5b)
- Previous AC-3.5 (exit merge mode) absorbed into AC-3.6 and AC-3.7
- Assumptions A9, A10, A11 added
